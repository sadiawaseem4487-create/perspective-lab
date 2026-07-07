# GitHub setup (first time)

Follow these steps once to enable **CI on every PR** and the sprint-by-sprint workflow.

---

## 1. Initialize git locally

From the project folder:

```bash
cd ~/Projects/sao-paulo-dropout-agents   # or perspective-lab after rename

git init
git add .
git status   # confirm backend/.env is NOT listed
git commit -m "Initial commit: PerspectiveLab Sprint 1 complete"
```

**Never commit** `backend/.env` — it is in `.gitignore`.

---

## 2. Create GitHub repository

### Option A — GitHub website

1. Go to https://github.com/new
2. Name: `perspective-lab` (or keep `sao-paulo-dropout-agents`)
3. **Private** recommended (API keys in deployment secrets later)
4. Do **not** add README/license (you already have files)
5. Create repo, then:

```bash
git branch -M main
git remote add origin git@github.com:YOUR_USER/perspective-lab.git
git push -u origin main
```

### Option B — GitHub CLI

```bash
gh auth login
gh repo create perspective-lab --private --source=. --remote=origin --push
```

---

## 3. Verify CI

After the first push:

1. Open **Actions** tab on GitHub
2. Workflow **CI** should run three jobs:
   - Backend tests
   - Frontend build
   - Docker image build

All green = pipeline ready.

---

## 4. Sprint workflow (your approved model)

For each sprint (starting with **Sprint 2**):

```bash
git checkout main
git pull
git checkout -b sprint/2-langgraph
# ... agent implements sprint ...
git add .
git commit -m "Sprint 2: LangGraph parallel workflow"
git push -u origin sprint/2-langgraph
gh pr create --title "Sprint 2: LangGraph parallel workflow" --body "See docs/wiki/Sprints/Sprint-02-LangGraph.md"
```

**You:** review PR → CI must pass → approve merge.

**Agent:** starts Sprint 3 only after you merge Sprint 2.

---

## 5. Later: PaaS deploy (Railway / Fly / Render)

When ready (after CI is stable):

| Platform | Notes |
|----------|-------|
| **Railway** | Connect GitHub repo, deploy from `Dockerfile`, set env vars in dashboard |
| **Fly.io** | `fly launch` + `fly deploy`, secrets via `fly secrets set` |
| **Render** | Web service from Docker, auto-deploy on `main` |

Staging auto-deploy can be added as a second workflow after you pick the platform.

Secrets to set on PaaS (not in git):

- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
- `EXPORT_API_KEY` (production)
- `CASE_ID=sao-paulo-dropout`
- `ENVIRONMENT=production`

---

## Checklist

- [ ] `git init` + first commit (no `.env`)
- [ ] GitHub repo created (private)
- [ ] Pushed to `main`
- [ ] CI workflow green on GitHub Actions
- [ ] Tell agent: **"Start Sprint 2"**

---

[← Development Pipeline](Development-Pipeline.md) · [Home](Home.md)
