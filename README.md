# Synapse

**An AI tutor, a gamified learning system, and an adaptive revision engine — in one app.**

Synapse helps students learn faster and understand deeply. The AI acts as a tutor (it teaches the
method, it doesn't dump answers), progress is gamified Duolingo-style, revision uses spaced
repetition, and games include both single-player arcade and live Kahoot/Blooket-style multiplayer.

> **Runs with zero API keys.** A built-in mock AI provider, the browser's native voice, and a local
> SQLite database mean `npm run dev` gives you the full experience immediately. Add keys to upgrade.

---

## Quick start

```bash
cd synapse
npm install
cp .env.example .env      # optional — sensible defaults already work
npm run dev               # http://localhost:3000
```

The database (SQLite) is created and seeded automatically on first run, including a demo account:

```
email:    demo@synapse.app
password: demo1234
```

Or click **Get started** to make your own account.

---

## What's inside

| Module | Where | Notes |
|---|---|---|
| **AI Tutor** | `/tutor` | Guided / Hint / Quiz modes, OCR photo upload, voice coach, adaptive difficulty |
| **Dashboard** | `/dashboard` | XP, level, streak, coins, weak-topic radar, recent activity |
| **Revision** | `/revision` | Spaced-repetition (SM-2) flashcards + generate sets/quizzes from material |
| **Games** | `/games` | Solo arcade + live multiplayer rooms with join codes & leaderboards |
| **Library** | `/library` | Saved sessions, study sets, and the coin-powered cosmetics shop |
| **Premium** | `/premium` | One-time $10 unlock for unlimited usage, voice, and 1.5× rewards |

---

## Architecture

```
synapse/
├── server.js                  # Custom Node server: Next.js + Socket.io (live games)
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing
│   │   ├── login, register     # Auth pages
│   │   ├── (app)/              # Authenticated area (guarded layout + shell)
│   │   │   ├── dashboard, tutor, revision, library, premium
│   │   │   └── games/{solo,host,join}
│   │   └── api/                # Route handlers (auth, tutor, quiz, flashcards, cosmetics…)
│   ├── components/             # UI: shell, brand, icons, live-game pieces, providers
│   └── lib/
│       ├── store.ts            # Data layer over Node's built-in node:sqlite
│       ├── ai/                 # Modular AI: provider interface + mock + Anthropic + prompts
│       ├── auth.ts             # JWT (jose) + bcrypt sessions
│       ├── gamification.ts     # XP curve, levels, streaks, rewards, daily caps
│       ├── srs.ts              # SM-2 spaced repetition + mastery
│       ├── progress.ts         # Applies XP/streaks/topic mastery to the DB
│       ├── use-voice.ts        # Web Speech API coach (pause/repeat/slow)
│       └── ocr.ts              # tesseract.js client-side OCR
```

### Why `node:sqlite` instead of an ORM?
The data layer uses Node 24's built-in SQLite (`node:sqlite`). It needs **no native build step and no
download**, so it runs anywhere Node runs — including Windows ARM64, where many prebuilt native DB
engines don't ship binaries. The schema lives in `src/lib/store.ts` (`migrate()`), and the store
exposes a small, typed API. To move to Postgres for production, swap `store.ts` for your driver of
choice — the rest of the app only talks to the `store` interface.

### The AI layer is modular
Everything AI goes through `getAI()` in `src/lib/ai/index.ts`, which returns an `AIProvider`. Swap
models or providers entirely via env — nothing else changes. Structured outputs (tutor steps, quizzes,
flashcards) are typed contracts in `src/lib/ai/types.ts`, so the UI never depends on a specific model.

---

## Configuration (`.env`)

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite file path |
| `JWT_SECRET` | dev string | **Set a long random value in production** |
| `AI_PROVIDER` | `mock` | `mock` or `anthropic` |
| `ANTHROPIC_API_KEY` | — | Required when `AI_PROVIDER=anthropic` |
| `AI_MODEL` | `claude-sonnet-4-6` | Model id (modular) |
| `STRIPE_SECRET_KEY` | — | Enables real $10 checkout; without it, a dev unlock is used |

### Turning on real AI
```env
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."
AI_MODEL="claude-sonnet-4-6"
```
If the model ever returns something unparseable, the provider falls back to the mock so the app never
hard-fails.

### Voice
The voice coach uses the browser's **Web Speech API** by default (no key, works offline). The
`use-voice` hook is the seam where an ElevenLabs/cloud TTS provider can be added.

---

## Multiplayer (live games)

`server.js` hosts Socket.io alongside Next.js. Room state and the question timer are **authoritative
on the server**, so all players stay in lockstep. Flow:

1. **Host** (`/games/host`) generates a quiz → server mints a 6-char join code.
2. **Players** (`/games/join`) enter the code and a nickname.
3. Host starts; the server drives timed questions, scoring (speed + streak bonuses), reveals, and a
   final leaderboard.

Open `/games/host` in one tab and `/games/join` in another (or another device on your network) to try
it.

---

## Production

```bash
npm run build
npm run start        # serves Next + Socket.io via server.js
```

Deploy notes:
- Set a strong `JWT_SECRET` and a production `DATABASE_URL`.
- Because of the **custom Socket.io server**, deploy to a Node host (Render, Railway, Fly.io, a VPS,
  or a container) rather than a serverless-only platform. Point a process manager at `npm run start`.
- For horizontal scaling, move room state to Redis (via `socket.io-redis-adapter`) and swap the
  SQLite store for Postgres.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server (Next + Socket.io) on :3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint |
