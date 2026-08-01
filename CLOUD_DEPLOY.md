# Optional: Vercel UI + Render API

**Preferred (all-in-one):** https://perspective-lab.onrender.com/ — see [ONLINE_DEPLOY.md](./ONLINE_DEPLOY.md)

Use Vercel only if you want a separate frontend URL. The API always stays on Render.

| Piece | Host |
|-------|------|
| API + accounts + agents | Render |
| UI (static) | Vercel (optional) |

---

## Deploy frontend on Vercel

1. [vercel.com/new](https://vercel.com/new) → import this repo  
2. **Root Directory:** `frontend`  
3. Install `npm ci` · Build `npm run build` · Output `dist`  
4. Optional env: `VITE_API_BASE_URL=https://perspective-lab.onrender.com`  
5. Deploy  

If build fails with `cd: frontend: No such file or directory`, Root Directory is wrong — set it to `frontend` and remove any `cd frontend && …` overrides.

---

## CORS on Render (once)

On the Render web service → Environment:

| Key | Value |
|-----|--------|
| `CORS_ORIGINS` | `https://perspective-lab.onrender.com,https://YOUR-APP.vercel.app` |

Redeploy Render. Do **not** put API keys on Vercel.

---

## Test

Open the Vercel URL → Sign in → Settings → Workspace.  
Health: https://perspective-lab.onrender.com/api/health  
