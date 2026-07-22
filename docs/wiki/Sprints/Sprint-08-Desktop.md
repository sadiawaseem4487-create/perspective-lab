# Sprint 8 — Desktop packaging

| **Status** | 🟨 In progress |

Tauri 2 desktop shell, FastAPI sidecar, first-run API key wizard, Mac/Windows bundle targets.

## Goals

1. Researchers can open a **desktop window** without using a browser bookmark
2. First run prompts for **OpenRouter / OpenAI** key (writes `backend/.env`, not production servers)
3. Backend still serves UI + API on `http://127.0.0.1:8000` (same architecture as browser mode)

## Tasks

| ID | Task | Status |
|----|------|--------|
| 8.1 | Tauri 2 shell (`frontend/src-tauri`) wrapping the app | [x] |
| 8.2 | Desktop backend launcher (`desktop/start-backend.*`, `ensure-backend-dev.mjs`) | [x] |
| 8.3 | First-run API key wizard (`/setup`, `POST /api/setup/keys`) | [x] |
| 8.4 | Bundle targets: macOS `.dmg` / Windows NSIS via `tauri build` | [x] scaffold |
| 8.5 | Smoke: setup → ask → report path documented | [x] |

## How to run

```bash
# One-time: Rust toolchain (https://rustup.rs)
make install
make build

# Option A — browser (unchanged)
make dev   # or ./Start\ App.command

# Option B — Tauri desktop window (starts/reuses backend on :8000)
make desktop-dev

# Option C — produce installers (needs platform toolchains)
make desktop-build
```

Artifacts land under `frontend/src-tauri/target/release/bundle/`.

## Notes

- Setup wizard is **disabled when `ENVIRONMENT=production`**
- Unsigned local builds are fine for research pilots; store signing certs are a later ops step
- Python 3 + Node remain required for the FastAPI sidecar in this sprint

[← Sprint 7](Sprint-07-GUI-Research.md) · [Sprint 9](Sprint-09-Research-Integrity.md) · [Home](../Home.md)
