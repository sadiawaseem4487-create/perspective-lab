# PerspectiveLab — Simple User Guide

For professors and researchers. **No Docker. No coding.**

**Full handover (install + API key only):** see **[CLIENT_HANDOVER.md](./CLIENT_HANDOVER.md)**

---

## Start the app

| Mac | Windows |
|-----|---------|
| Double-click **`Start App.command`** | Double-click **`Start App.bat`** |

Browser opens at **http://localhost:8000**. Keep the terminal window open.

---

## First time: paste your API key

1. Open **Setup** (or the app redirects there automatically)
2. Choose **OpenRouter** (recommended) or **OpenAI**
3. Paste your key → **Save and continue**

Get a key: https://openrouter.ai/keys

You do **not** need to edit `backend/.env` by hand.

---

## Research workflow

| Step | Page | Action |
|------|------|--------|
| Ask | Workspace | Enter question → Ask agents |
| Read | Report | Four theory answers |
| Compare | Compare | Human guests + problem-solving rubric |
| Study | Study | Guided baseline → agents → post |
| Present | Presentation | Academic deck for an audience |
| Export | Export | JSON / CSV / rubric CSV |
| Help | Guide | In-app checklist |

Language: EN / PT / FI in the sidebar.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect | Keep the start window open |
| Agents fail / no key | Open **Setup** and save the key again |
| First start slow | Normal (one-time install) |
| Mac blocks Start App | Right-click → Open |

---

## Docker?

Only for IT/server deploy. See **[DEPLOYMENT.md](./DEPLOYMENT.md)**. Everyday use is laptop + Start App.
