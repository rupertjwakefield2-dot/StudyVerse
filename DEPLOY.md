# Deploying Synapse — free, 24/7, with persistent data

Synapse runs a **custom Node server (Next.js + Socket.io)**, so it needs a host that keeps a
process alive and allows WebSockets (plain Firebase Hosting / Vercel can't hold WebSockets open).

This is the **100% free, no-credit-card** stack that also **persists accounts and progress**:

| Piece | Service | Free? | Why |
|---|---|---|---|
| Code | **GitLab** | ✅ no card | Render pulls code from here (you preferred not to use GitHub) |
| Host | **Render** (web service) | ✅ no card | Permanent `*.onrender.com` URL, supports WebSockets |
| Database | **Turso** (libSQL) | ✅ no card | SQLite-compatible cloud DB so data survives restarts |

The app auto-detects Turso: set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` and it uses the cloud DB;
leave them unset locally and it uses a local SQLite file.

---

## Step 1 — Create the free Turso database (persistent data)
1. Sign up at https://turso.tech (GitHub/email, **no card**).
2. Install the CLI (or use their web dashboard):
   - Windows: `winget install Turso.Turso`  ·  or see https://docs.turso.tech/cli/installation
3. Create the DB and grab credentials:
   ```bash
   turso auth login
   turso db create synapse
   turso db show synapse --url           # -> libsql://synapse-xxxx.turso.io   (TURSO_DATABASE_URL)
   turso db tokens create synapse        # -> a long token                     (TURSO_AUTH_TOKEN)
   ```
   Keep these two values for Step 3. (Tables are created automatically on first run.)

## Step 2 — Put the code on GitLab
1. Create a free account at https://gitlab.com and a **new blank project** (e.g. `synapse`), no README.
2. In the `synapse` folder, push (this repo is already committed):
   ```bash
   git remote add origin https://gitlab.com/<your-username>/synapse.git
   git branch -M main
   git push -u origin main
   ```
   (GitLab will prompt for your username + a personal access token as the password.)

## Step 3 — Deploy on Render
1. Sign up at https://render.com (you can sign in with GitLab, **no card**).
2. **New ▸ Blueprint**, connect your GitLab account, pick the `synapse` repo. Render reads
   `render.yaml` automatically.
3. Before the first deploy, add two environment variables (Render dashboard ▸ Environment):
   - `TURSO_DATABASE_URL` = the `libsql://…` URL from Step 1
   - `TURSO_AUTH_TOKEN` = the token from Step 1
   (`JWT_SECRET` is generated for you; `AI_PROVIDER=mock` keeps it free.)
4. Click **Apply / Deploy**. In a few minutes you get a permanent public URL like
   `https://synapse-xxxx.onrender.com` — open it from anywhere, share it with anyone, 24/7.

> Render's free tier sleeps after ~15 min of no traffic and takes ~30s to wake on the next visit.
> The URL is always reachable; it just cold-starts. To remove the delay, upgrade that one service to
> Render's paid Starter plan later — no code changes needed.

### Enabling real AI (optional, has cost)
Add `ANTHROPIC_API_KEY` in Render's Environment and set `AI_PROVIDER=anthropic`. Leave it on `mock`
to stay free.

---

## Alternative — Google Cloud Run (the "Firebase" way; needs a card)
Cloud Run runs the included `Dockerfile`, supports WebSockets, and deploys **without GitHub**:
```bash
gcloud run deploy synapse --source . --region us-central1 --allow-unauthenticated \
  --port 8080 --max-instances 1 \
  --set-env-vars NODE_ENV=production,AI_PROVIDER=mock,JWT_SECRET=<random>,TURSO_DATABASE_URL=<url>,TURSO_AUTH_TOKEN=<token>
```
Requires enabling **billing (Blaze)** with a credit card (Cloud Run's free tier usually keeps the bill
at $0). Use the same Turso vars for persistence.
