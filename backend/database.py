import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional

from config import get_settings
from db import open_connection, pk_sql, table_columns, using_postgres

logger = logging.getLogger(__name__)


def storage_is_persistent() -> bool:
    """True when account data survives cloud redeploys.

    Postgres via DATABASE_URL is durable on free Render. Local SQLite is fine
    on the host. Ephemeral Render SQLite without a disk is not durable.
    """
    import os

    if using_postgres():
        return True
    if os.environ.get("RENDER", "").lower() != "true":
        return True

    path = get_settings().database_path.parent.resolve()
    cur = path
    while True:
        if os.path.ismount(str(cur)):
            return str(cur) != "/"
        parent = cur.parent
        if parent == cur:
            return False
        cur = parent


def count_users_safe() -> int:
    try:
        with get_connection() as conn:
            row = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()
            return int(row["n"] if row else 0)
    except Exception:
        return 0


def init_db() -> None:
    pk = pk_sql()
    with get_connection() as conn:
        if conn.dialect == "sqlite":
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS sessions (
                id {pk},
                question TEXT NOT NULL,
                created_at TEXT NOT NULL,
                workflow_mode TEXT NOT NULL DEFAULT 'parallel'
            )
            """
        )
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS responses (
                id {pk},
                session_id INTEGER NOT NULL,
                agent_key TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                response TEXT NOT NULL,
                model TEXT,
                latency_ms INTEGER,
                error TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC)"
        )
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS sequential_runs (
                id {pk},
                question TEXT NOT NULL,
                model TEXT,
                language TEXT NOT NULL DEFAULT 'en',
                current_vaihe INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'awaiting_review',
                stage_outputs TEXT NOT NULL DEFAULT '{{}}',
                responses TEXT NOT NULL DEFAULT '[]',
                human_checkpoints TEXT NOT NULL DEFAULT '[]',
                session_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        _migrate(conn)
        conn.commit()

    try:
        from auth_service import ensure_auth_tables, seed_admin_user

        ensure_auth_tables()
        seed_admin_user()
    except Exception:
        logging.getLogger(__name__).exception("Auth init skipped")


def _migrate(conn) -> None:
    session_columns = table_columns(conn, "sessions")
    if "workflow_mode" not in session_columns:
        conn.execute(
            "ALTER TABLE sessions ADD COLUMN workflow_mode TEXT NOT NULL DEFAULT 'parallel'"
        )
    if "user_id" not in session_columns:
        conn.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id, id DESC)"
        )

    columns = table_columns(conn, "responses")
    if "latency_ms" not in columns:
        conn.execute("ALTER TABLE responses ADD COLUMN latency_ms INTEGER")
    if "error" not in columns:
        conn.execute("ALTER TABLE responses ADD COLUMN error TEXT")

    seq_columns = table_columns(conn, "sequential_runs")
    if "user_id" not in seq_columns:
        conn.execute("ALTER TABLE sequential_runs ADD COLUMN user_id INTEGER")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sequential_runs_user_id ON sequential_runs(user_id)"
        )


def check_db() -> bool:
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
        return True
    except Exception:
        return False


@contextmanager
def get_connection():
    with open_connection() as conn:
        yield conn


def save_session(
    question: str,
    responses: list,
    workflow_mode: str = "parallel",
    user_id: Optional[int] = None,
) -> int:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        session_id = conn.execute_insert(
            """
            INSERT INTO sessions (question, created_at, workflow_mode, user_id)
            VALUES (?, ?, ?, ?)
            """,
            (question, now, workflow_mode, user_id),
        )
        for item in responses:
            conn.execute(
                """
                INSERT INTO responses
                (session_id, agent_key, agent_name, response, model, latency_ms, error, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    item["agent_key"],
                    item["agent_name"],
                    item["response"],
                    item.get("model"),
                    item.get("latency_ms"),
                    item.get("error"),
                    now,
                ),
            )
        conn.commit()
        return session_id


def list_sessions(limit: int = 50, user_id: Optional[int] = None) -> list:
    limit = max(1, min(limit, 200))
    with get_connection() as conn:
        if user_id is None:
            rows = conn.execute(
                """
                SELECT s.id, s.question, s.created_at, s.workflow_mode, s.user_id,
                       COUNT(r.id) AS response_count
                FROM sessions s
                LEFT JOIN responses r ON r.session_id = s.id
                GROUP BY s.id, s.question, s.created_at, s.workflow_mode, s.user_id
                ORDER BY s.id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT s.id, s.question, s.created_at, s.workflow_mode, s.user_id,
                       COUNT(r.id) AS response_count
                FROM sessions s
                LEFT JOIN responses r ON r.session_id = s.id
                WHERE s.user_id = ?
                GROUP BY s.id, s.question, s.created_at, s.workflow_mode, s.user_id
                ORDER BY s.id DESC
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
        return [dict(row) for row in rows]


def get_session(session_id: int) -> Optional[dict]:
    with get_connection() as conn:
        session = conn.execute(
            """
            SELECT id, question, created_at, workflow_mode, user_id
            FROM sessions WHERE id = ?
            """,
            (session_id,),
        ).fetchone()
        if not session:
            return None
        responses = conn.execute(
            """
            SELECT agent_key, agent_name, response, model, latency_ms, error, created_at
            FROM responses
            WHERE session_id = ?
            ORDER BY id
            """,
            (session_id,),
        ).fetchall()
        return {
            **dict(session),
            "responses": [dict(r) for r in responses],
        }


def get_session_owner_id(session_id: int) -> Optional[int]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT user_id FROM sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if not row:
            return None
        return row["user_id"]


def user_owns_session(session_id: int, user_id: Optional[int]) -> bool:
    """True if session exists and is visible to this user."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, user_id FROM sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
    if not row:
        return False
    if user_id is None:
        return True
    if row["user_id"] is None:
        return False
    return int(row["user_id"]) == int(user_id)


def export_all() -> list:
    with get_connection() as conn:
        sessions = conn.execute(
            "SELECT id, question, created_at, workflow_mode FROM sessions ORDER BY id"
        ).fetchall()
        result = []
        for session in sessions:
            responses = conn.execute(
                """
                SELECT agent_key, agent_name, response, model, latency_ms, error, created_at
                FROM responses WHERE session_id = ?
                ORDER BY id
                """,
                (session["id"],),
            ).fetchall()
            result.append(
                {
                    "session_id": session["id"],
                    "question": session["question"],
                    "created_at": session["created_at"],
                    "workflow_mode": session["workflow_mode"],
                    "responses": [dict(r) for r in responses],
                }
            )
        return result


def create_sequential_run(payload: dict) -> int:
    with get_connection() as conn:
        run_id = conn.execute_insert(
            """
            INSERT INTO sequential_runs
            (question, model, language, current_vaihe, status, stage_outputs, responses,
             human_checkpoints, session_id, created_at, updated_at, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["question"],
                payload.get("model"),
                payload.get("language", "en"),
                payload.get("current_vaihe", 0),
                payload.get("status", "awaiting_review"),
                payload.get("stage_outputs", "{}"),
                payload.get("responses", "[]"),
                payload.get("human_checkpoints", "[]"),
                payload.get("session_id"),
                payload["created_at"],
                payload["updated_at"],
                payload.get("user_id"),
            ),
        )
        conn.commit()
        return run_id


def get_sequential_run(run_id: int) -> Optional[dict]:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, question, model, language, current_vaihe, status,
                   stage_outputs, responses, human_checkpoints, session_id,
                   created_at, updated_at, user_id
            FROM sequential_runs WHERE id = ?
            """,
            (run_id,),
        ).fetchone()
        return dict(row) if row else None


def user_owns_sequential_run(run_id: int, user_id: Optional[int]) -> bool:
    """True if sequential run exists and is visible to this user."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, user_id FROM sequential_runs WHERE id = ?",
            (run_id,),
        ).fetchone()
    if not row:
        return False
    if user_id is None:
        return True
    if row["user_id"] is None:
        return False
    return int(row["user_id"]) == int(user_id)


def update_sequential_run(run_id: int, fields: dict) -> None:
    if not fields:
        return
    columns = ", ".join(f"{key} = ?" for key in fields)
    values = list(fields.values()) + [run_id]
    with get_connection() as conn:
        conn.execute(f"UPDATE sequential_runs SET {columns} WHERE id = ?", values)
        conn.commit()
