# Deploy to Render (Backend) + Netlify (Frontend)

Use these environment variables in each platform. Replace placeholder values with your actual URLs and secrets.

**Note:** On Render free tier, the filesystem is ephemeral—uploaded files (task attachments, avatars) are lost on redeploy. For persistent storage, use S3 or similar.

---

## 1. Render (Backend)

**Dashboard → Your Web Service → Environment**

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `4000` | Render sets this automatically; you can omit |
| `MONGODB_URI` | `mongodb+srv://USER:PASS@cluster.mongodb.net/taskplatform` | Use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) |
| `REDIS_URL` | `rediss://...` or `redis://...` | Use [Upstash Redis](https://upstash.com) (free) or Render Redis add-on |
| `JWT_ACCESS_SECRET` | `your-min-32-char-random-secret-here` | Generate: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | `another-min-32-char-random-secret` | Generate: `openssl rand -base64 32` |
| `JWT_ACCESS_EXPIRY` | `15m` | Optional |
| `JWT_REFRESH_EXPIRY` | `7d` | Optional |
| `FRONTEND_URL` | `https://your-site.netlify.app` | Your Netlify site URL (for CORS) |

**After deploy:** Copy your Render URL, e.g. `https://task-platform-api.onrender.com`

---

## 2. Netlify (Frontend)

**Dashboard → Site settings → Environment variables**

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://task-platform-api.onrender.com` | Your Render backend URL (no trailing slash) |
| `VITE_WS_URL` | `https://task-platform-api.onrender.com` | Same as API URL for WebSocket |

**Important:** Redeploy after changing these variables (Vite bakes them in at build time).

---

## 3. Netlify Build Settings

- **Build command:** `cd frontend && npm run build`
- **Publish directory:** `frontend/dist`
- **Base directory:** (leave empty)

`frontend/public/_redirects` is included for SPA routing (no 404 on refresh).

---

## 4. Render Build Settings

If repo has `backend/` and `frontend/` at root:

- **Root directory:** `backend`
- **Build command:** `npm install`
- **Start command:** `npm start`

---

## 5. Quick Copy-Paste

### Render (Environment variables)

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/taskplatform
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_UPSTASH_URL.upstash.io:6379
JWT_ACCESS_SECRET=REPLACE_WITH_32_CHAR_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_ANOTHER_32_CHAR_SECRET
FRONTEND_URL=https://your-site.netlify.app
```

### Netlify (Environment variables)

```
VITE_API_URL=https://your-render-app.onrender.com
VITE_WS_URL=https://your-render-app.onrender.com
```
