"""User accounts, session tokens, and per-user LLM keys."""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from config import get_settings
from database import get_connection

logger = logging.getLogger(__name__)

PBKDF2_ITERATIONS = 120_000
TOKEN_BYTES = 32


def _auth_secret() -> str:
    settings = get_settings()
    secret = (settings.auth_secret or os.environ.get("AUTH_SECRET") or "").strip()
    if secret:
        return secret
    return "perspectivelab-dev-auth-secret-change-me"


def auth_required() -> bool:
    """Whether research APIs and the app shell require a logged-in user.

    Production SaaS always requires login (even if AUTH_REQUIRED was left false).
    Development may open the app when AUTH_REQUIRED=false for local testing.
    """
    settings = get_settings()
    raw = (settings.auth_required or os.environ.get("AUTH_REQUIRED", "")).strip().lower()
    if settings.environment == "production":
        # SaaS: never leave the research UI open without accounts
        if raw in ("0", "false", "no", "off"):
            logger.warning(
                "AUTH_REQUIRED=%s ignored in production — login is required",
                raw or "(empty)",
            )
        return True
    if raw in ("0", "false", "no", "off"):
        return False
    if raw in ("1", "true", "yes", "on"):
        return True
    # Development default: on when AUTH_SECRET is configured
    secret = (settings.auth_secret or os.environ.get("AUTH_SECRET") or "").strip()
    return bool(secret)


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters_s, salt_b64, dig_b64 = stored.split("$", 3)
        if algo != "pbkdf2":
            return False
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(dig_b64.encode())
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, int(iters_s)
        )
        return hmac.compare_digest(digest, expected)
    except Exception:
        return False


def _fernet_key() -> bytes:
    """Derive a 32-byte url-safe key from AUTH_SECRET (no extra deps)."""
    digest = hashlib.sha256(_auth_secret().encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_secret(plain: str) -> str:
    """XOR+HMAC obfuscation suitable for local lab SQLite (not HSM-grade)."""
    key = hashlib.sha256(_auth_secret().encode("utf-8")).digest()
    data = plain.encode("utf-8")
    mixed = bytes(b ^ key[i % len(key)] for i, b in enumerate(data))
    mac = hmac.new(key, mixed, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac + mixed).decode("ascii")


def decrypt_secret(token: str) -> str:
    key = hashlib.sha256(_auth_secret().encode("utf-8")).digest()
    raw = base64.urlsafe_b64decode(token.encode("ascii"))
    mac, mixed = raw[:32], raw[32:]
    expected = hmac.new(key, mixed, hashlib.sha256).digest()
    if not hmac.compare_digest(mac, expected):
        raise ValueError("Corrupt credential blob")
    data = bytes(b ^ key[i % len(key)] for i, b in enumerate(mixed))
    return data.decode("utf-8")


def ensure_auth_tables() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                name TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_llm_keys (
                user_id INTEGER PRIMARY KEY,
                provider TEXT NOT NULL,
                key_cipher TEXT NOT NULL,
                model TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def seed_admin_user() -> None:
    """Create admin from ADMIN_EMAIL / ADMIN_PASSWORD if missing."""
    ensure_auth_tables()
    settings = get_settings()
    email = (settings.admin_email or os.environ.get("ADMIN_EMAIL") or "admin@perspectivelab.local").strip().lower()
    password = (settings.admin_password or os.environ.get("ADMIN_PASSWORD") or "").strip()
    if not password:
        password = "admin-change-me"
        logger.warning(
            "ADMIN_PASSWORD not set — using temporary default for %s. Change it in .env.",
            email,
        )
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, role FROM users WHERE email = ?", (email,)
        ).fetchone()
        if row:
            if row["role"] != "admin":
                conn.execute("UPDATE users SET role = 'admin' WHERE id = ?", (row["id"],))
                conn.commit()
            return
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO users (email, password_hash, role, name, created_at)
            VALUES (?, ?, 'admin', 'Administrator', ?)
            """,
            (email, hash_password(password), now),
        )
        conn.commit()
        logger.info("Seeded admin user %s", email)


def create_user(email: str, password: str, name: str = "") -> Dict[str, Any]:
    ensure_auth_tables()
    email_n = email.strip().lower()
    if "@" not in email_n or len(password) < 8:
        raise ValueError("Valid email and password (min 8 characters) required")
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (email_n,)
        ).fetchone()
        if existing:
            raise ValueError("An account with this email already exists")
        cur = conn.execute(
            """
            INSERT INTO users (email, password_hash, role, name, created_at)
            VALUES (?, ?, 'user', ?, ?)
            """,
            (email_n, hash_password(password), (name or "").strip(), now),
        )
        conn.commit()
        return get_user_by_id(cur.lastrowid)


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, role, name, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, role, name, created_at, password_hash FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
        return dict(row) if row else None


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user.get("name") or "",
        "is_admin": user.get("role") == "admin",
    }


def issue_token(user_id: int) -> str:
    ensure_auth_tables()
    token = secrets.token_urlsafe(TOKEN_BYTES)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO auth_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)",
            (token_hash, user_id, now),
        )
        conn.commit()
    return token


def revoke_token(token: str) -> None:
    if not token:
        return
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_connection() as conn:
        conn.execute("DELETE FROM auth_tokens WHERE token_hash = ?", (token_hash,))
        conn.commit()


def user_from_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.email, u.role, u.name, u.created_at
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token_hash = ?
            """,
            (token_hash,),
        ).fetchone()
        return dict(row) if row else None


def set_user_llm_key(user_id: int, provider: str, api_key: str, model: str = "") -> None:
    key = (api_key or "").strip()
    if len(key) < 8:
        raise ValueError("API key looks too short")
    if key.startswith("sk-or-"):
        provider = "openrouter"
    provider = "openrouter" if provider == "openrouter" else "openai"
    if provider == "openrouter":
        model_value = (model or "openai/gpt-4o-mini").strip()
        if "/" not in model_value:
            model_value = f"openai/{model_value}"
    else:
        model_value = (model or "gpt-4o-mini").strip()
        if model_value.startswith("openai/"):
            model_value = model_value[len("openai/") :]
    now = datetime.now(timezone.utc).isoformat()
    cipher = encrypt_secret(key)
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_llm_keys (user_id, provider, key_cipher, model, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              provider = excluded.provider,
              key_cipher = excluded.key_cipher,
              model = excluded.model,
              updated_at = excluded.updated_at
            """,
            (user_id, provider, cipher, model_value, now),
        )
        conn.commit()


def get_user_llm_key_meta(user_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT provider, model, updated_at FROM user_llm_keys WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "configured": True,
            "provider": row["provider"],
            "model": row["model"],
            "updated_at": row["updated_at"],
        }


def load_user_llm_credentials(user_id: int) -> Optional[Dict[str, str]]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT provider, key_cipher, model FROM user_llm_keys WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return None
        try:
            api_key = decrypt_secret(row["key_cipher"])
        except ValueError:
            return None
        return {
            "provider": row["provider"],
            "api_key": api_key,
            "model": row["model"] or "",
        }


def resolve_llm_credentials(user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prefer the signed-in user's personal key.
    Admin may fall back to server .env key.
    """
    settings = get_settings()
    if user:
        personal = load_user_llm_credentials(user["id"])
        if personal and personal.get("api_key"):
            provider = personal["provider"]
            model = personal.get("model") or (
                "openai/gpt-4o-mini" if provider == "openrouter" else settings.llm_model
            )
            return {
                "configured": True,
                "source": "user",
                "provider": provider,
                "api_key": personal["api_key"],
                "model": model,
                "base_url": "https://openrouter.ai/api/v1" if provider == "openrouter" else None,
            }
        if user.get("role") == "admin" and settings.llm_configured:
            return {
                "configured": True,
                "source": "server",
                "provider": settings.resolved_llm_provider,
                "api_key": settings.llm_api_key,
                "model": settings.llm_model,
                "base_url": settings.llm_base_url,
            }
        return {"configured": False, "source": None, "provider": None, "api_key": "", "model": "", "base_url": None}

    # No user (auth disabled / legacy)
    if settings.llm_configured:
        return {
            "configured": True,
            "source": "server",
            "provider": settings.resolved_llm_provider,
            "api_key": settings.llm_api_key,
            "model": settings.llm_model,
            "base_url": settings.llm_base_url,
        }
    return {"configured": False, "source": None, "provider": None, "api_key": "", "model": "", "base_url": None}
