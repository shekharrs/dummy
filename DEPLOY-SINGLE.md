# Deploy SnapVote — Single URL (easiest)

Deploy **once** on Vercel. You get the same layout as local, but on one domain:

| Local | Deployed (example) |
|-------|---------------------|
| `http://localhost:3000/` | `https://your-app.vercel.app/` |
| `http://localhost:3002/data` | `https://your-app.vercel.app/data` |

> Production uses **one HTTPS port** (443), not `:3000` / `:3002`. Paths `/` and `/data` replace the two local ports.

---

## Step 1 — Push to GitHub

```bash
git add .
git commit -m "Single Vercel deploy"
git push
```

---

## Step 2 — Create Vercel KV

1. [vercel.com](https://vercel.com) → **Storage** → **Create** → **KV**
2. Name: `snapvote-kv`
3. **Connect to Project** → your SnapVote project

---

## Step 3 — Deploy (one project)

1. **New Project** → import GitHub repo
2. **Root Directory:** `/` (repo root — **not** `voting` or `data`)
3. **Framework:** Other
4. Deploy

Your links:
- **Voting:** `https://YOUR-APP.vercel.app/`
- **Live data:** `https://YOUR-APP.vercel.app/data`

Test API: `https://YOUR-APP.vercel.app/api/state`

---

## Or deploy via CLI

```powershell
cd C:\Users\shekh\OneDrive\Desktop\dummy
npx vercel --prod
```

---

## Local dev (unchanged)

```bash
npm run dev
```

- `http://localhost:3000/` — voting
- `http://localhost:3002/data` — live data

---

## Other options

| Method | Voting URL | Data URL |
|--------|------------|----------|
| **Single Vercel** (this guide) | `yoursite.vercel.app/` | `yoursite.vercel.app/data` |
| **Two Vercel projects** | `snapvote-voting.vercel.app` | `snapvote-data.vercel.app` |
| **Share localhost** (no deploy) | ngrok tunnel to :3000 | ngrok tunnel to :3002 |
| **Render / Railway** | `yourapp.onrender.com/` | `yourapp.onrender.com/data` |

### Share localhost without deploying (ngrok)

```powershell
npm run dev
# In another terminal:
npx ngrok http 3000
npx ngrok http 3002
```

Gives temporary public URLs pointing at your local machine.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/api/state` returns 500 | Connect Vercel KV to the project |
| `/data` 404 | Redeploy from **repo root**, not `voting/` folder |
| Data panel empty | Open `/data` on the **same** domain as voting |
