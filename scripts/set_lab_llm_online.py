#!/usr/bin/env python3
"""Push local OpenRouter/OpenAI key to production as the shared lab LLM key.

Usage (from repo root):
  python3 scripts/set_lab_llm_online.py
  python3 scripts/set_lab_llm_online.py --email admin@… --password '…'
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / ".env"
DEFAULT_URL = "https://perspective-lab.onrender.com"


def _load_env_key() -> tuple[str, str, str]:
    raw = ENV_PATH.read_text(encoding="utf-8") if ENV_PATH.is_file() else ""
    values: dict[str, str] = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        values[k.strip()] = v.strip().strip('"').strip("'")
    key = values.get("OPENROUTER_API_KEY") or values.get("OPENAI_API_KEY") or ""
    model = values.get("OPENAI_MODEL") or "openai/gpt-4o-mini"
    provider = "openrouter" if key.startswith("sk-or-") else values.get("LLM_PROVIDER", "openai")
    if not key:
        raise SystemExit(f"No API key in {ENV_PATH}")
    return provider, key, model


def _post_json(url: str, payload: dict, token: str | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} {url}: {body}") from exc


def _put_json(url: str, payload: dict, token: str) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} {url}: {body}") from exc


def _get_json(url: str, token: str | None = None) -> dict:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=90) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=DEFAULT_URL)
    parser.add_argument("--email", default="admin@perspectivelab.local")
    parser.add_argument("--password", default="admin-change-me")
    args = parser.parse_args()
    base = args.base.rstrip("/")

    print("Waking API…")
    try:
        health = _get_json(f"{base}/api/health")
        print("health version=", health.get("version"), "llm_configured=", health.get("llm_configured"))
    except Exception as exc:
        print("wake/health:", exc)

    provider, key, model = _load_env_key()
    print(f"Using local key provider={provider} model={model} key=…{key[-6:]}")

    passwords = [args.password, "admin-change-me", "change-me-admin-password"]
    token = None
    last_err = None
    for password in passwords:
        try:
            login = _post_json(
                f"{base}/api/auth/login",
                {"email": args.email, "password": password},
            )
            token = login.get("token")
            role = (login.get("user") or {}).get("role")
            print(f"Logged in as {args.email} role={role}")
            break
        except SystemExit as exc:
            last_err = exc
            continue
    if not token:
        raise SystemExit(
            f"Could not log in as {args.email}. Try:\n"
            f"  python3 scripts/set_lab_llm_online.py --email YOU@email --password 'YOUR_ADMIN_PASSWORD'\n"
            f"Last error: {last_err}"
        )

    me = _get_json(f"{base}/api/auth/me", token=token)
    if (me.get("user") or {}).get("role") != "admin":
        raise SystemExit("Logged-in user is not admin — cannot set shared lab key.")

    result = _put_json(
        f"{base}/api/admin/lab-llm-key",
        {"provider": provider, "api_key": key, "model": model},
        token=token,
    )
    print("lab key saved:", json.dumps({k: result.get(k) for k in ("ok", "lab_llm", "server_llm_available")}, indent=2))

    health2 = _get_json(f"{base}/api/health")
    print(
        "health after:",
        "llm_configured=",
        health2.get("llm_configured"),
        "source=",
        health2.get("llm_source"),
        "lab_llm=",
        health2.get("lab_llm"),
    )
    if not health2.get("llm_configured"):
        raise SystemExit("Key save did not flip llm_configured — check deploy version >= 1.2.6")
    print("OK — signed-in users can ask agents without their own key.")


if __name__ == "__main__":
    main()
