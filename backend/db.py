"""SQLite + Postgres connection adapter (same call sites for both)."""

from __future__ import annotations

import logging
import os
import re
import sqlite3
from contextlib import contextmanager
from typing import Any, Iterable, Iterator, List, Optional, Sequence, Union

logger = logging.getLogger(__name__)


def database_url() -> str:
    from config import get_settings

    settings = get_settings()
    url = (getattr(settings, "database_url", None) or os.environ.get("DATABASE_URL") or "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def using_postgres() -> bool:
    return bool(database_url())


def storage_backend() -> str:
    return "postgres" if using_postgres() else "sqlite"


class Result:
    """Cursor-like object compatible with sqlite3 usage in this codebase."""

    def __init__(self, rows: Iterable[Any], lastrowid: Optional[int] = None):
        self._rows = list(rows)
        self.lastrowid = lastrowid

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return list(self._rows)

    def __iter__(self) -> Iterator[Any]:
        return iter(self._rows)


class DbConnection:
    def __init__(self, raw: Any, dialect: str):
        self._raw = raw
        self.dialect = dialect

    def _adapt_sql(self, sql: str) -> str:
        if self.dialect != "postgres":
            return sql
        # Placeholders: ? → %s (this project never embeds ? inside string literals)
        adapted = sql.replace("?", "%s")
        # SQLite upsert alias → Postgres
        adapted = re.sub(r"\bexcluded\.", "EXCLUDED.", adapted, flags=re.IGNORECASE)
        return adapted

    def execute(self, sql: str, params: Optional[Sequence[Any]] = None) -> Result:
        params = tuple(params) if params is not None else ()
        stripped = sql.strip()
        upper = stripped.upper()

        if upper.startswith("PRAGMA"):
            if self.dialect == "postgres":
                return Result([])
            cur = self._raw.execute(sql, params)
            return Result(cur.fetchall(), getattr(cur, "lastrowid", None))

        sql_a = self._adapt_sql(sql)
        if self.dialect == "postgres":
            cur = self._raw.execute(sql_a, params)
            rows: List[Any] = []
            if cur.description is not None:
                rows = list(cur.fetchall())
            return Result(rows, lastrowid=None)

        cur = self._raw.execute(sql_a, params)
        # For SELECT, materialise rows; for DML lastrowid still available
        rows = cur.fetchall()
        return Result(rows, lastrowid=cur.lastrowid)

    def execute_insert(self, sql: str, params: Optional[Sequence[Any]] = None) -> int:
        """INSERT a row and return its integer primary key."""
        params = tuple(params) if params is not None else ()
        if self.dialect == "postgres":
            sql_a = self._adapt_sql(sql).rstrip().rstrip(";")
            if "RETURNING" not in sql_a.upper():
                sql_a = f"{sql_a} RETURNING id"
            cur = self._raw.execute(sql_a, params)
            row = cur.fetchone()
            if row is None:
                raise RuntimeError("INSERT RETURNING id produced no row")
            if isinstance(row, dict):
                return int(row["id"])
            return int(row[0])
        cur = self._raw.execute(sql, params)
        return int(cur.lastrowid)

    def commit(self) -> None:
        self._raw.commit()

    def close(self) -> None:
        self._raw.close()


def table_columns(conn: DbConnection, table: str) -> set:
    if conn.dialect == "postgres":
        rows = conn.execute(
            """
            SELECT column_name AS name
            FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = ?
            """,
            (table,),
        ).fetchall()
        return {str(r["name"] if isinstance(r, dict) else r[0]) for r in rows}

    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def pk_sql() -> str:
    return "SERIAL PRIMARY KEY" if using_postgres() else "INTEGER PRIMARY KEY AUTOINCREMENT"


@contextmanager
def open_connection() -> Iterator[DbConnection]:
    if using_postgres():
        import psycopg
        from psycopg.rows import dict_row

        url = database_url()
        raw = psycopg.connect(url, row_factory=dict_row)
        conn = DbConnection(raw, "postgres")
        try:
            yield conn
        finally:
            conn.close()
        return

    from config import get_settings

    path = get_settings().database_path
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = sqlite3.connect(str(path), timeout=30, check_same_thread=False)
    raw.row_factory = sqlite3.Row
    conn = DbConnection(raw, "sqlite")
    try:
        yield conn
    finally:
        conn.close()
