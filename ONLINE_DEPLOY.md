# Online deploy — clean working copy

GitHub (source of truth): https://github.com/sadiawaseem4487-create/perspective-lab  

**Tests:** 87 passed · **Frontend build:** OK · **Auth:** user accounts + per-user API keys

---

## Recommended: one URL on Render (UI + API together)

The Docker image already includes the React UI. You do **not** need Vercel for a working lab site.

1. Open https://dashboard.render.com → **New Web Service**
2. Connect **`sadiawaseem4487-create/perspective-lab`**
3. Runtime: **Docker** · Instance: **Free** · Health: `/api/health`
4. Environment variables:

| Key | Value |
|-----|--------|
| `ENVIRONMENT` | `production` |
| `CASE_ID` | `sao-paulo-dropout` |
| `WORKERS` | `1` |
| `ALLOWED_HOSTS` | `*` |
| `CORS_ORIGINS` | `*` |
| `AUTH_REQUIRED` | `true` |
| `AUTH_SECRET` | *(paste generated secret)* |
| `ADMIN_EMAIL` | `admin@perspectivelab.local` |
| `ADMIN_PASSWORD` | *(paste generated password)* |
| `EXPORT_API_KEY` | *(paste generated export key)* |
| `OPENROUTER_API_KEY` or `OPENAI_API_KEY` | *your key from `backend/.env`* |

5. Deploy → wait until green → open `https://YOUR-SERVICE.onrender.com`
6. **/login** as admin → Workspace works with your server key  
7. Colleagues **/register** → paste **their** key in Settings

First request after idle can take ~30–60s (free tier sleep).

---

## Optional: Vercel UI + Render API

Only if you want the UI on Vercel:

1. Finish Render API first (same env as above)
2. https://vercel.com/new → import repo → **Root Directory = `frontend`**
3. Env: `VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com`
4. On Render set:
   - `CORS_ORIGINS=https://YOUR-APP.vercel.app`
   - `PUBLIC_APP_URL=https://YOUR-APP.vercel.app`

---

## After deploy

Paste the live URL here so we can smoke-test health + login.
