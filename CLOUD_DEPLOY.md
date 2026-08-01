# Deploy PerspectiveLab to the cloud

**Preferred all-in-one (already live):** https://perspective-lab.onrender.com/  
→ [ONLINE_DEPLOY.md](./ONLINE_DEPLOY.md)

**Optional Vercel UI** (this page): static frontend on Vercel, API stays on Render.

| What | Where | URL |
|------|--------|-----|
| API + full app | Render | https://perspective-lab.onrender.com |
| UI only | Vercel | *(after import — e.g. `https://perspective-lab.vercel.app`)* |

Repo: https://github.com/sadiawaseem4487-create/perspective-lab

---

## Deploy UI on Vercel (recommended path)

1. Open https://vercel.com/new
2. Import **`sadiawaseem4487-create/perspective-lab`**
3. Configure:
   - **Root Directory:** `frontend` ← important
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Environment Variable (optional — auto-detects Vercel → Render if unset):

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://perspective-lab.onrender.com` |

5. Deploy → copy the Vercel URL

---

## Link CORS on Render (required once)

On the **existing** Render service → Environment → update:

| Key | Value |
|-----|--------|
| `CORS_ORIGINS` | `https://perspective-lab.onrender.com,https://YOUR-APP.vercel.app` |
| `ALLOWED_HOSTS` | `perspective-lab.onrender.com` |
| `PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` *(if invite links should open on Vercel)* |

Save → Render redeploys. Prefer keeping `PUBLIC_APP_URL` on Render if guests should use the all-in-one site.

---

## Smoke test

1. Open the Vercel URL → Sign in  
2. Settings → paste your API key  
3. Workspace → Ask agents (API calls go to Render)  
4. `/api/health` is **not** on Vercel — use https://perspective-lab.onrender.com/api/health  

---

## Notes

- Do **not** put `OPENROUTER_API_KEY` on Vercel — only on Render / in each user’s Settings  
- First Render request after idle can take ~30–60s (free tier)  
- Auto-deploy: connect the GitHub repo in Vercel; pushes to `main` rebuild the UI  

[← ONLINE_DEPLOY](ONLINE_DEPLOY.md) · [User accounts](docs/wiki/User-Accounts.md)
