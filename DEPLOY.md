# Deploy SnapVote — Vercel Only (no Railway)

Everything runs on Vercel using **serverless API routes** + **Vercel KV** for shared state.

| Panel | Vercel project | Root folder |
|-------|----------------|-------------|
| Voting + API | `snapvote-voting` | `voting` |
| Live data | `snapvote-data` | `data` |

---

## Step 1 — Push to GitHub

```bash
npm run sync:deploy
git add .
git commit -m "Vercel-only deployment"
git push
```

---

## Step 2 — Create Vercel KV (one-time, free)

1. [vercel.com](https://vercel.com) → your team → **Storage** tab
2. **Create Database** → **KV**
3. Name it `snapvote-kv` → Create
4. Open the KV store → **Connect to Project** → select **snapvote-voting**
5. This auto-adds `KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc. to the voting project

---

## Step 3 — Deploy Voting panel (hosts the API)

1. **New Project** → import repo
2. **Root Directory:** `voting`
3. **Framework:** Other
4. No extra env vars needed (KV is linked automatically)
5. Deploy → note URL e.g. `https://snapvote-voting.vercel.app`

Test API: open `https://snapvote-voting.vercel.app/api/state` — should return JSON.

---

## Step 4 — Deploy Data panel

1. **New Project** → same repo
2. **Root Directory:** `data`
3. **Environment Variable:**

   | Name | Value |
   |------|-------|
   | `SNAPVOTE_API_URL` | `https://snapvote-voting.vercel.app` |
   | `SNAPVOTE_VOTING_URL` | `https://snapvote-voting.vercel.app` |

4. Deploy → e.g. `https://snapvote-data.vercel.app`

---

## Step 5 — Test

1. Open data panel URL
2. Open voting URL in another tab
3. Type login credentials → appear live on data panel (~1s refresh)
4. Vote → tally updates on data panel

---

## Local development

```bash
npm install
npm run dev
```

- Voting: http://localhost:3000
- Data: http://localhost:3002/data

Uses in-memory API on `server.js` (no KV needed locally).

---

## How it works (no WebSocket)

| Old (Railway) | New (Vercel) |
|---------------|--------------|
| WebSocket `server.js` | `/api/*` serverless functions |
| In-memory state | Vercel KV (Redis) |
| Instant push | Poll every 800ms on data panel |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API returns 500 | Connect Vercel KV to the **voting** project |
| Data panel empty | Set `SNAPVOTE_API_URL` to voting project URL (no trailing slash) |
| CORS error | API already allows `*` — redeploy voting project |
| Build fails on data | `SNAPVOTE_API_URL` env var is required on data project |
