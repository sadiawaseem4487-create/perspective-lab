# PerspectiveLab — Client Handover Guide

**Who this is for:** your client (researcher / professor).  
**What she needs:** a laptop + an AI API key. **No Docker. No coding.**

Works on **macOS**, **Windows 10/11**, and **Linux**.

---

## What you give her

1. This project folder (zip is fine)
2. This guide
3. Help once installing **Node.js** (and **Python** on Windows/Linux if missing)

She enters her API key in the app **Setup** screen — she does **not** edit config files.

---

## Pick the starter for her OS

| Operating system | Double-click / run |
|------------------|--------------------|
| **macOS** | `Start App.command` |
| **Windows** | `Start App.bat` (or `Start App.ps1` in PowerShell) |
| **Linux** | `Start App.sh` or `./start.sh` in a terminal |
| **Any (terminal)** | `./start.sh` |

All of these start the same app at **http://localhost:8000**.

---

## One-time install

### Prerequisites (all OS)

| Tool | Why | Where |
|------|-----|--------|
| **Node.js LTS** | Builds the interface | https://nodejs.org |
| **Python 3.10+** | Runs the research server | https://www.python.org — on Linux: `sudo apt install python3 python3-venv python3-pip` |

macOS usually already has Python 3.

### macOS

1. Install Node.js LTS  
2. Open the project folder  
3. Double-click **`Start App.command`**  
4. If blocked: right-click → **Open** → confirm  
5. Wait (first run 2–5 minutes) → browser opens  

### Windows 10 / 11

1. Install Node.js LTS  
2. Install Python 3 — **check “Add python.exe to PATH”**  
3. Double-click **`Start App.bat`**  
4. If SmartScreen warns: More info → Run anyway  
5. Browser opens at localhost:8000  

PowerShell alternative:  
`powershell -ExecutionPolicy Bypass -File ".\Start App.ps1"`

### Linux (Ubuntu/Debian and similar)

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip
# Install Node.js LTS from https://nodejs.org (or your distro’s nodejs package)
cd /path/to/perspective-lab
chmod +x start.sh "Start App.sh"
./start.sh
```

Optional: mark `Start App.desktop` as trusted and use it from the file manager (varies by desktop).

---

## First launch — only her API key

1. App opens **Setup** if no key is saved  
2. Choose **OpenRouter** (recommended) or **OpenAI**  
3. Paste key → **Save and continue**  
4. Ask agents in **Workspace**

Key file (local only): `backend/.env`  
Get a key: https://openrouter.ai/keys

---

## Every later session

1. Run the starter for her OS (table above)  
2. Keep the terminal/console **open**  
3. Use **http://localhost:8000**  
4. Stop with **Ctrl+C** or by closing the window  

---

## Research flow (same on every OS)

| Step | Page | Action |
|------|------|--------|
| 1 | Setup | API key (once) |
| 2 | Workspace | Ask agents |
| 3 | Report | Read four theory answers |
| 4 | Compare / Study | Humans + rubric / protocol |
| 5 | Presentation | Academic deck |
| 6 | Export | JSON / CSV / rubric CSV |
| 7 | Guide | In-app checklist |

Languages: EN / PT / FI.

---

## Optional: second research case

Default case is **São Paulo school dropout**.  
A second pack **Digital inclusion in schools** is included.

To switch (advanced / helper):

1. Open `backend/.env`  
2. Add: `CASE_ID=digital-inclusion`  
3. Restart the app  

To go back: `CASE_ID=sao-paulo-dropout` or remove the line.

---

## Optional: Mac installer (.dmg) — like downloading from the web

On your Desktop (after build): **`PerspectiveLab-Installer.dmg`**

1. Double-click the **.dmg**
2. Drag **PerspectiveLab** into **Applications**
3. Open **Applications → PerspectiveLab**
4. If macOS blocks it: **right-click → Open → Open** (once)
5. Click **Continue** on the setup dialog  
   - If Node.js is missing, it can **download a private copy** for this app (one-time, needs internet)
6. A Terminal window shows install progress — **keep it open**
7. Browser opens → **Setup** → paste your API key

Rebuild the DMG on a Mac anytime:

```bash
make desktop-dmg
```

**Note:** Apple notarization (no right-click Open) needs an Apple Developer account. Unsigned DMGs still work with right-click Open.

---

## Optional: desktop window (all OS with Rust)

```bash
# Install Rust: https://rustup.rs
make install && make build
make desktop-dev
```

Installers: `make desktop-build`  
→ macOS `.dmg` · Windows NSIS · Linux AppImage/deb (when targets enabled)

Most clients only need **browser + Start App**.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cannot connect | Keep start window open |
| Agents fail / no key | **Setup** → save key again |
| First start slow | Normal once |
| Mac blocks app | Right-click → Open |
| Windows: python not found | Reinstall Python with PATH checked |
| Linux: `python3-venv` missing | `sudo apt install python3-venv` |
| `npm` not found | Install Node.js LTS |
| Port 8000 in use | Close other PerspectiveLab windows; or reboot |

---

## Your handover checklist

- [ ] Correct starter for her OS works  
- [ ] localhost:8000 opens  
- [ ] She pastes **her own** API key in Setup  
- [ ] One demo question → 4 answers  
- [ ] She knows: keep window open; key stays local; Export for data  

---

## More detail

- [USER_GUIDE.md](./USER_GUIDE.md)  
- In-app **Guide** (`/guide`)  
- Wiki: [docs/wiki/Home.md](docs/wiki/Home.md)
