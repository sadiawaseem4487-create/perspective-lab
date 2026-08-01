# Online deploy — same site (update, don’t recreate)

**Live app (keep this URL):** https://perspective-lab.onrender.com/

GitHub source: https://github.com/sadiawaseem4487-create/perspective-lab  

Always **update this Render service** — do not create a new Web Service.

---

## Update the existing Render deploy

1. Open https://dashboard.render.com → service **`perspective-lab`** (the one serving `perspective-lab.onrender.com`)
2. Confirm it is connected to GitHub repo **`perspective-lab`** / branch **`main`**
3. **Manual Deploy** → **Deploy latest commit** (or “Clear build cache & deploy”)
4. Wait until status is **Live**

### Environment on that same service

Set / fix these on the **existing** service (Environment tab):

| Key | Value |
|-----|--------|
| `ENVIRONMENT` | `production` |
| `CASE_ID` | `sao-paulo-dropout` |
| `WORKERS` | `1` |
| `ALLOWED_HOSTS` | `perspective-lab.onrender.com` |
| `CORS_ORIGINS` | `https://perspective-lab.onrender.com` |
| `PUBLIC_APP_URL` | `https://perspective-lab.onrender.com` |
| `AUTH_REQUIRED` | `true` |
| `AUTH_SECRET` | *(long random string)* |
| `ADMIN_EMAIL` | `admin@perspectivelab.local` |
| `ADMIN_PASSWORD` | *(your chosen admin password)* |
| `EXPORT_API_KEY` | *(long random string)* |
| `OPENROUTER_API_KEY` or `OPENAI_API_KEY` | *your key* |

Save → Render redeploys the **same** URL.

---

## After deploy — smoke check

- https://perspective-lab.onrender.com/api/health → `environment: production`, `auth_required: true`
- https://perspective-lab.onrender.com/login → admin login
- Colleagues: **/register** → paste **their** API key in Settings

Optional Vercel UI is not required; this Render URL already serves UI + API.
