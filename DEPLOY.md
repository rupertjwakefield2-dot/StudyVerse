# Deploying Synapse to a permanent public URL

Synapse runs a **custom Node server (Next.js + Socket.io)**, so it needs a host that keeps a
process alive and allows WebSockets. Below is the **Google Cloud Run** path (the Firebase/Google
way, no GitHub required) plus a no-card fallback.

---

## Option A — Google Cloud Run (Firebase / Google, no GitHub)

Cloud Run runs the `Dockerfile` in this repo. It deploys **straight from this folder** — Google
builds it in the cloud, so you don't need Docker or GitHub locally.

> Requires enabling **billing (Blaze plan)** with a credit card. Cloud Run's free monthly allowance
> (2M requests) means low-traffic apps typically cost **$0**, but the card is mandatory.

### One-time setup
1. **Install the Google Cloud SDK** (`gcloud`): https://cloud.google.com/sdk/docs/install
2. Sign in and pick/create a project:
   ```bash
   gcloud auth login
   gcloud projects create synapse-<your-initials> --name="Synapse"
   gcloud config set project synapse-<your-initials>
   ```
3. In the Cloud Console, open **Billing** and link a card to this project (enables Blaze).
4. Enable the needed APIs:
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```

### Deploy (run this any time you want to publish changes)
```bash
cd synapse
gcloud run deploy synapse \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --max-instances 1 \
  --set-env-vars NODE_ENV=production,AI_PROVIDER=mock,JWT_SECRET=PUT_A_LONG_RANDOM_STRING_HERE
```
- `--max-instances 1` keeps the live-game sockets + database on a single instance (required for
  multiplayer to behave correctly).
- When it finishes, gcloud prints your public URL, e.g. `https://synapse-xxxxx-uc.a.run.app` —
  open it from anywhere, 24/7.
- Want zero cold-start delay? add `--min-instances 1` (keeps one instance warm; may incur a small
  charge beyond the free tier).

**Database note:** Cloud Run instances are disposable, so the built-in SQLite resets when the
instance restarts. For persistent accounts/progress, migrate the data layer (`src/lib/store.ts`) to
**Firestore** or **Cloud SQL**. (Ask and I'll do this.)

---

## Option B — Firebase App Hosting (newer, full Next.js)
Firebase **App Hosting** natively builds Next.js on Cloud Run, but it **connects to a GitHub/GitLab
repo** and also requires the Blaze plan. If you're open to a git host, this is the most "Firebase
native" route: Firebase console ▸ App Hosting ▸ connect repo. Same Cloud Run database caveat applies.

---

## Option C — Render (free, no credit card) — needs a git host
The simplest **free, no-card** path. Render reads `render.yaml` in this repo. It needs your code on a
git host (GitHub **or GitLab**). Then: Render ▸ New ▸ Blueprint ▸ connect the repo. You get a
permanent `*.onrender.com` URL. Free tier sleeps after ~15 min idle (~30s wake), but is always
reachable.

---

## Why not plain Firebase Hosting / Vercel?
Both are optimized for static + serverless functions, which **cannot hold open WebSocket
connections** — that would break the live multiplayer games. Use Cloud Run / Render / Railway / Fly /
a VPS, all of which run a persistent Node process.
