# PerspectiveLab — Client Handover Guide

**Who this is for:** your client (researcher / professor) who should run the app herself.  
**What she needs:** a laptop + an AI API key. No Docker. No coding.

---

## What you give her

1. This project folder (or a zip of the repo)
2. This guide
3. Optionally: help once with installing **Node.js** (Mac/Windows) if she does not have it

She does **not** need to edit config files. She enters her API key in the app’s **Setup** screen.

---

## One-time install (15–30 minutes first time)

### Mac

1. Install **Node.js LTS** from https://nodejs.org (if not already installed)
2. Unzip / open the **PerspectiveLab** project folder
3. **Double-click** `Start App.command`
4. If macOS says the file cannot be opened: right-click → **Open** → confirm
5. Wait for the terminal to finish installing (first run is slow)
6. Browser opens at **http://localhost:8000**

### Windows

1. Install **Node.js LTS** from https://nodejs.org  
2. Install **Python 3** from https://www.python.org (check “Add Python to PATH”)
3. Double-click **`Start App.bat`**
4. Wait for install + build
5. Browser opens at **http://localhost:8000**

---

## First launch — only her API key

1. The app opens the **Setup** page automatically if no key is saved yet  
2. Choose provider:
   - **OpenRouter** (recommended) — get a key at https://openrouter.ai/keys  
   - **or OpenAI** — https://platform.openai.com/api-keys  
3. Paste the key → **Save and continue**  
4. She is taken to the Workspace and can ask the agents

Keys are stored only on **her computer** in `backend/.env`. They are not uploaded to your GitHub.

---

## Every later session

1. Double-click `Start App.command` (Mac) or `Start App.bat` (Windows)  
2. Keep the black/terminal window **open** while using the app  
3. Use the browser at **http://localhost:8000**  
4. When done: close the terminal or press **Ctrl+C**

---

## How she uses the product (research flow)

| Step | Where | What to do |
|------|--------|------------|
| 1 | **Setup** (once) | Paste API key |
| 2 | **Workspace** | Type a research question → Ask agents |
| 3 | **Report** | Read Freire / Weber / Montessori / Rogers answers |
| 4 | **Compare** | Optional: add human answers + score the rubric |
| 5 | **Study** | Optional: guided baseline → agents → post protocol |
| 6 | **Presentation** | Show the academic deck to an audience |
| 7 | **Export** | Download CSV/JSON / rubric CSV for analysis |
| 8 | **Guide** | In-app checklist if she forgets the order |

Language: EN / PT / FI in the sidebar.

---

## What she must keep private

- Her **OpenRouter / OpenAI API key** (costs money if shared or leaked)
- Do not commit `backend/.env` to email/GitHub
- Export files may contain research answers — handle per her ethics protocol

---

## Troubleshooting (give her this table)

| Problem | Fix |
|---------|-----|
| Browser cannot connect | Keep the start window open; wait until it says the server started |
| “API key” / agents fail | Open **Setup** in the sidebar and save the key again |
| First start takes forever | Normal once — Node packages + Python venv |
| Mac blocks `Start App.command` | Right-click → Open |
| Windows: `python` not found | Reinstall Python with “Add to PATH”, then run `Start App.bat` again |
| Needs a model change | **Models** page in the sidebar |

---

## Optional: desktop window (advanced)

If Rust is installed (`https://rustup.rs`), a technical helper can run:

```bash
make install && make build
make desktop-dev
```

For most clients, **browser + Start App** is enough.

---

## Your handover checklist (you)

- [ ] Client has Node.js (and Python on Windows)
- [ ] Client can double-click Start App and reach localhost:8000
- [ ] Client pastes her own API key in **Setup**
- [ ] Client asks one demo question and sees 4 answers
- [ ] Client knows: keep terminal open; key stays local; Export for data

---

## More detail (optional)

- In-app: **Guide** (`/guide`)
- Researcher wiki: [docs/wiki/Home.md](docs/wiki/Home.md)
- Facilitator path: [docs/wiki/Facilitator-Checklist.md](docs/wiki/Facilitator-Checklist.md)
