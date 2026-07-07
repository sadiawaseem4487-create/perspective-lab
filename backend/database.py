import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional

from config import get_settings


def _db_path() -> str:
    settings = get_settings()
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    return str(settings.database_path)


def init_db() -> None:
    with get_connection() as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        _migrate(conn)
        conn.commit()


def _migrate(conn) -> None:
    columns = {row[1] for row in conn.execute("PRAGMA table_info(responses)")}
    if "latency_ms" not in columns:
        conn.execute("ALTER TABLE responses ADD COLUMN latency_ms INTEGER")
    if "error" not in columns:
        conn.execute("ALTER TABLE responses ADD COLUMN error TEXT")


def check_db() -> bool:
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False


@contextmanager
def get_connection():
    conn = sqlite3.connect(_db_path(), timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def save_session(question: str, responses: list) -> int:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO sessions (question, created_at) VALUES (?, ?)",
            (question, now),
        )
        session_id = cursor.lastrowid
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


def list_sessions(limit: int = 50) -> list:
    limit = max(1, min(limit, 200))
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.question, s.created_at,
                   COUNT(r.id) AS response_count
            FROM sessions s
            LEFT JOIN responses r ON r.session_id = s.id
            GROUP BY s.id
            ORDER BY s.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_session(session_id: int) -> Optional[dict]:
    with get_connection() as conn:
        session = conn.execute(
            "SELECT id, question, created_at FROM sessions WHERE id = ?",
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


def export_all() -> list:
    with get_connection() as conn:
        sessions = conn.execute(
            "SELECT id, question, created_at FROM sessions ORDER BY id"
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
                    "responses": [dict(r) for r in responses],
                }
            )
        return result
