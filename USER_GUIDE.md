# PerspectiveLab — Simple User Guide

For professors and researchers who want to **use the app in presentations** without Docker or technical setup.

**Product:** PerspectiveLab — multi-theory agentic problem-solving  
**Default case:** School dropout in São Paulo (configurable via case packs)

---

## Do I need Docker?

**No.** Docker is **optional**. It is only useful if an IT department deploys the app on a server.

For classroom or research use, run the app **directly on a laptop** — that is the easiest way.

---

## Where does the app run?

The app runs **on the computer you start it from** (usually a Mac or Windows laptop):

1. You start the app on the laptop
2. You open a web browser on the **same laptop**
3. You go to: **http://localhost:8000**
4. Four agents answer your question in the browser

Nothing is uploaded to a special “Docker cloud.” The app stays on that computer while it is running.

---

## Easiest way to start (Mac)

### One-time setup (you or a technical helper does this once)

1. Install **Node.js** from https://nodejs.org (LTS version)
2. Python 3 is usually already on Mac
3. Open the project folder: `perspective-lab` (or `sao-paulo-dropout-agents` if not renamed yet)
4. Open **`backend/.env`** in a text editor
5. Add your OpenRouter key:

   ```
   OPENAI_API_KEY=sk-or-v1-your-key-here
   OPENAI_MODEL=gpt-4o-mini
   ```

   Or use explicit OpenRouter settings:

   ```
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENAI_MODEL=openai/gpt-4o-mini
   ENVIRONMENT=development
   ```

   Get a key at: https://openrouter.ai/keys

### Every time you use the app (presentation / research)

1. **Double-click** `Start App.command` in the project folder
2. Wait until the browser opens at **http://localhost:8000**
3. Walk through the **5 stages** (see below)
4. When finished, close the terminal window or press **Ctrl+C**

---

## Easiest way to start (Windows)

1. Open **Command Prompt** or **PowerShell**
2. Go to the project folder
3. Run `start.sh` (or ask a technical helper to create a shortcut)
4. Open browser: **http://localhost:8000**

---

## The 5-stage workflow

| Stage | URL | What you do |
|-------|-----|-------------|
| **1 — Agents** | `/agents` | Review or change which theories sit in the 4 agent slots |
| **2 — Models** | `/models` | Choose the AI model (e.g. GPT-4o mini) |
| **3 — Question** | `/question` | Enter your research question and **Ask all 4 agents** |
| **4 — Report** | `/report` | Read the four agent answers; export JSON/CSV if needed |
| **5 — Compare** | `/compare` | Add human respondent answers and compare with agents |

Language switcher (EN / PT / FI) is in the top-right corner.

---

## What the professor needs during a presentation

| Step | Action |
|------|--------|
| 1 | Start the app (`Start App.command` on Mac) |
| 2 | **Stage 1** — confirm agents (Freire, Weber, Montessori, Rogers by default) |
| 3 | **Stage 2** — confirm model selection |
| 4 | **Stage 3** — type a question, e.g. *"How do we solve school dropout in São Paulo?"* |
| 5 | Wait for four agent responses (may take 30–90 seconds) |
| 6 | **Stage 4** — show the report; export if needed |
| 7 | **Stage 5** — optionally add human answers for comparison |

---

## When would Docker be used?

Docker is for **IT staff**, not everyday users. Use it only if:

- The app must run 24/7 on a **university server**
- Many people need access via a **website URL** (not localhost)
- IT wants standardized deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for server setup.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser shows “cannot connect” | Keep the terminal window open (app must be running) |
| “API key not configured” | Add key to `backend/.env`, restart the app |
| First start is slow | Normal — installing packages takes a few minutes once |
| “Frontend not built” | Run `Start App.command` again or `cd frontend && npm run build` |
| Need help | Ask a technical colleague to run setup once |

---

## Summary

- **Non-technical users:** `Start App.command` on a laptop — **no Docker**
- **Docker:** optional, for IT/server deployment only
- **Where it runs:** on the computer where you start it (`localhost:8000`)
- **More detail:** [docs/wiki/Home.md](./docs/wiki/Home.md) · [Test Plan](./docs/wiki/Test-Plan.md)
