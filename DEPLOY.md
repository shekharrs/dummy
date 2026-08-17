# Deploy SnapVote

SnapVote needs **3 deployments** because Vercel cannot host a persistent WebSocket server.

| Part | Platform | URL example |
|------|----------|-------------|
| WebSocket API | **Railway** (or Render) | `wss://snapvote-api.up.railway.app` |
| Voting panel | **Vercel** (project 1) | `https://snapvote-voting.vercel.app` |
| Live data panel | **Vercel** (project 2) | `https://snapvote-data.vercel.app` |

---

## Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "SnapVote app"
git remote add origin https://github.com/YOUR_USERNAME/snapvote.git
git push -u origin main
```

Before pushing, sync deploy folders:

```bash
npm run sync:deploy
```

This copies the latest `public/` files into `voting/` and `data/`.

---

## Step 2 — Deploy the WebSocket backend (Railway)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your `snapvote` repo
3. **Root directory:** leave as `/` (repo root — uses `server.js`)
4. Railway auto-detects Node.js and runs `npm start`
5. Open **Settings → Networking → Generate Domain**
6. Copy your URL, e.g. `https://snapvote-api.up.railway.app`
7. Your WebSocket URL is: **`wss://snapvote-api.up.railway.app`** (same host, `wss://`)

> **Render alternative:** New Web Service → connect repo → Build: `npm install` → Start: `npm start` → use the public URL with `wss://`.

---

## Step 3 — Deploy the Voting panel (Vercel project 1)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. **Project name:** `snapvote-voting`
3. **Root Directory:** click **Edit** → set to `voting`
4. **Framework Preset:** Other
5. **Environment Variables:**

   | Name | Value |
   |------|-------|
   | `SNAPVOTE_WS_URL` | `wss://YOUR-RAILWAY-URL.up.railway.app` |

6. Click **Deploy**

Your voting app will be live at something like `https://snapvote-voting.vercel.app`.

---

## Step 4 — Deploy the Live Data panel (Vercel project 2)

1. Vercel → **Add New Project** → import the **same** GitHub repo again
2. **Project name:** `snapvote-data`
3. **Root Directory:** `data`
4. **Framework Preset:** Other
5. **Environment Variables:**

   | Name | Value |
   |------|-------|
   | `SNAPVOTE_WS_URL` | `wss://YOUR-RAILWAY-URL.up.railway.app` |
   | `SNAPVOTE_VOTING_URL` | `https://snapvote-voting.vercel.app` |

6. Click **Deploy**

Your data panel will be live at something like `https://snapvote-data.vercel.app`.

---

## Step 5 — Test

1. Open the **data panel** URL in one tab
2. Open the **voting panel** URL in another tab
3. Go through login — username/password should appear live on the data panel
4. Vote — tally updates in real time

---

## Local development

```bash
npm install
npm run dev
```

- Voting: http://localhost:3000
- Live data: http://localhost:3002/data

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **404 DEPLOYMENT_NOT_FOUND** | Project exists but no successful deploy. Go to Vercel dashboard → project → **Deployments** → check for failed builds. Redeploy after pushing latest code. Ensure **Root Directory** is `voting` or `data` (not `/`). |
| Data panel shows "Disconnected" | Check `SNAPVOTE_WS_URL` on Vercel uses `wss://` (not `https://`) |
| Votes don't sync | Railway backend must be running; redeploy if needed |
| CORS / connection refused | Use the Railway **public domain**, not `localhost` |
| Updated code not on Vercel | Run `npm run sync:deploy`, commit `voting/` + `data/`, push |
| Ghost icon missing | Ensure `voting/images/snap-ghost.png` is committed and pushed |

---

## Why not two ports on Vercel?

Vercel serves **static files** and **serverless functions**. It cannot run a long-lived WebSocket server on a custom port like `3002`. The Railway backend handles all real-time messaging; both Vercel sites connect to it via `wss://`.
