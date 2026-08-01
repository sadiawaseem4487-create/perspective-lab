# Deploy PerspectiveLab to the cloud (Vercel + Render)

Mac ZIP/Gatekeeper can wait. For lab testing from any browser, use this free split:

| What | Where | Why |
|------|--------|-----|
| UI | **Vercel** | Free static hosting |
| API | **Render** | Runs FastAPI (Vercel cannot run our Python API) |

Repo is already on GitHub: `sadiawaseem4487-create/perspective-lab`

---

## A. Backend on Render (do this first)

1. Open https://dashboard.render.com → **New +** → **Web Service**
2. Connect GitHub → select **`perspective-lab`**
3. Settings:
   - **Runtime:** Docker (uses root `Dockerfile`)
   - **Instance type:** Free
   - **Health check path:** `/api/health`
4. Environment variables:

| Key | Value |
|-----|--------|
| `ENVIRONMENT` | `production` |
| `CASE_ID` | `sao-paulo-dropout` |
| `OPENROUTER_API_KEY` | *(your key)* |
| `EXPORT_API_KEY` | *(any long random string)* |
| `ALLOWED_HOSTS` | `*` |
| `CORS_ORIGINS` | leave blank for now → set after Vercel URL exists |
| `PUBLIC_APP_URL` | leave blank for now → set to Vercel URL later |

5. Deploy → wait until green → copy service URL, e.g.  
   `https://perspectivelab-api.onrender.com`
6. Test: open `https://YOUR-SERVICE.onrender.com/api/health`

Optional: Blueprint deploy via repo `render.yaml` (same env vars).

**Persistence:** Free Render disk is limited. Without a disk, invite answers may reset on redeploy. For a short lab pilot this is usually OK.

---

## B. Frontend on Vercel

1. Open https://vercel.com/new
2. Import **`perspective-lab`** from GitHub
3. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (default from `frontend/vercel.json`)
   - **Output Directory:** `dist`
4. Environment Variable:

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://YOUR-SERVICE.onrender.com` *(no trailing slash)* |

5. Deploy → copy URL, e.g. `https://perspective-lab.vercel.app`

---

## C. Link the two (required)

Back on **Render** → Environment → set:

| Key | Value |
|-----|--------|
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` |
| `PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |

Save → Render redeploys once.

---

## D. Smoke test

1. Open the **Vercel** URL
2. Workspace → ask a short sample question (needs OpenRouter key on Render)
3. Invite → create link → open on phone (should use Vercel host)
4. Submit a guest answer → see it on Compare

---

## Notes

- First Render request after idle can take ~30–60s (free tier sleep)
- Do not put `OPENROUTER_API_KEY` in Vercel — only on Render
- Local Mac ZIP is separate; cloud does not need the desktop app

[← Free hosting wiki](docs/wiki/Free-Hosting.md) · [CLIENT_HANDOVER](CLIENT_HANDOVER.md)
