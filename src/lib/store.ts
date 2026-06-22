import "server-only";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import { COSMETICS, DEFAULT_OWNED } from "./cosmetics";

/**
 * Data layer backed by Node's built-in SQLite (node:sqlite). Chosen over an
 * ORM with a native engine so it runs everywhere Node runs — including Windows
 * ARM64 — with zero extra native dependencies. Synchronous API; fine inside
 * route handlers.
 */

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || "file:./synapse.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  return path.resolve(process.cwd(), file);
}

const g = globalThis as unknown as { __synapseDb?: DatabaseSync };

function open(): DatabaseSync {
  if (g.__synapseDb) return g.__synapseDb;
  const db = new DatabaseSync(resolveDbPath());
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  seed(db);
  seedDemo(db);
  g.__synapseDb = db;
  return db;
}

function migrate(db: DatabaseSync) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    passwordHash TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT 'fox',
    createdAt TEXT NOT NULL, isPremium INTEGER NOT NULL DEFAULT 0, premiumSince TEXT,
    xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1,
    coins INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0,
    longestStreak INTEGER NOT NULL DEFAULT 0, lastActiveDay TEXT,
    dailyUsage INTEGER NOT NULL DEFAULT 0, dailyUsageDay TEXT
  );
  CREATE TABLE IF NOT EXISTS TopicMastery (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, subject TEXT NOT NULL, topic TEXT NOT NULL,
    mastery REAL NOT NULL DEFAULT 0.3, attempts INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0, isWeak INTEGER NOT NULL DEFAULT 0,
    lastSeen TEXT NOT NULL, nextReview TEXT NOT NULL,
    UNIQUE(userId, subject, topic)
  );
  CREATE TABLE IF NOT EXISTS StudySession (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'General', topic TEXT NOT NULL DEFAULT 'General',
    difficulty TEXT NOT NULL DEFAULT 'medium', mode TEXT NOT NULL DEFAULT 'guided',
    sourceText TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS AiInteraction (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, sessionId TEXT, mode TEXT NOT NULL,
    prompt TEXT NOT NULL, response TEXT NOT NULL, model TEXT NOT NULL DEFAULT 'mock',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS StudySet (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'General', createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS Flashcard (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, setId TEXT,
    front TEXT NOT NULL, back TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'General', topic TEXT NOT NULL DEFAULT 'General',
    ease REAL NOT NULL DEFAULT 2.5, interval INTEGER NOT NULL DEFAULT 0,
    repetition INTEGER NOT NULL DEFAULT 0, dueAt TEXT NOT NULL, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS Quiz (
    id TEXT PRIMARY KEY, setId TEXT, title TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'General', topic TEXT NOT NULL DEFAULT 'General',
    difficulty TEXT NOT NULL DEFAULT 'medium', kind TEXT NOT NULL DEFAULT 'quiz',
    questions TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS QuizAttempt (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, quizId TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
    xpEarned INTEGER NOT NULL DEFAULT 0, coinsEarned INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS Cosmetic (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0, rarity TEXT NOT NULL DEFAULT 'common',
    premium INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS UserCosmetic (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL, cosmeticId TEXT NOT NULL,
    equipped INTEGER NOT NULL DEFAULT 0, acquiredAt TEXT NOT NULL,
    UNIQUE(userId, cosmeticId)
  );
  CREATE INDEX IF NOT EXISTS idx_topic_user ON TopicMastery(userId, isWeak);
  CREATE INDEX IF NOT EXISTS idx_flash_due ON Flashcard(userId, dueAt);
  CREATE INDEX IF NOT EXISTS idx_ai_user ON AiInteraction(userId, createdAt);
  `);
}

function seed(db: DatabaseSync) {
  const count = (db.prepare("SELECT COUNT(*) c FROM Cosmetic").get() as { c: number }).c;
  if (count === 0) {
    const ins = db.prepare(
      "INSERT INTO Cosmetic (id,name,type,price,rarity,premium) VALUES (?,?,?,?,?,?)"
    );
    for (const c of COSMETICS) ins.run(c.id, c.name, "avatar", c.price, c.rarity, c.premium ? 1 : 0);
  }
}

const now = () => new Date().toISOString();
const id = () => randomUUID();
const bool = (v: unknown) => v === 1 || v === true;

// Seed a ready-to-explore demo account so the app isn't empty on first run.
function seedDemo(db: DatabaseSync) {
  const existing = db.prepare("SELECT id FROM User WHERE email = ?").get("demo@synapse.app") as { id: string } | undefined;
  if (existing) return;
  const uid = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO User (id,email,name,passwordHash,avatar,createdAt,xp,level,coins,streak,longestStreak,lastActiveDay)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(uid, "demo@synapse.app", "Demo Student", bcrypt.hashSync("demo1234", 10), "panda", now(), 640, 4, 320, 5, 9, today);

  const topics = [
    ["Mathematics", "Algebra", 0.82, 0], ["Mathematics", "Calculus", 0.41, 1],
    ["Physics", "Mechanics", 0.38, 1], ["Biology", "Cells", 0.67, 0],
    ["Chemistry", "Reactions", 0.52, 1],
  ] as const;
  const tIns = db.prepare(
    `INSERT INTO TopicMastery (id,userId,subject,topic,mastery,attempts,correct,isWeak,lastSeen,nextReview) VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  for (const [subject, topic, mastery, weak] of topics) {
    tIns.run(randomUUID(), uid, subject, topic, mastery, 6, Math.round(6 * mastery), weak, now(), now());
  }

  const setId = randomUUID();
  db.prepare(`INSERT INTO StudySet (id,userId,title,subject,createdAt) VALUES (?,?,?,?,?)`)
    .run(setId, uid, "Biology — Cell Structure", "Biology", now());
  const fIns = db.prepare(
    `INSERT INTO Flashcard (id,userId,setId,front,back,subject,topic,ease,interval,repetition,dueAt,createdAt) VALUES (?,?,?,?,?,?,?,2.5,0,0,?,?)`
  );
  const cards = [
    ["What is the function of mitochondria?", "The powerhouse of the cell — it produces ATP through respiration."],
    ["What does the nucleus contain?", "The cell's DNA — it controls cell activities and reproduction."],
    ["What is the role of the cell membrane?", "It controls what enters and leaves the cell (selective permeability)."],
  ];
  for (const [front, back] of cards) fIns.run(randomUUID(), uid, setId, front, back, "Biology", "Cells", now(), now());
}

// --- Row types (booleans normalized to JS booleans by the accessors below) ---
export interface UserRow {
  id: string; email: string; name: string; passwordHash: string; avatar: string;
  createdAt: string; isPremium: boolean; premiumSince: string | null;
  xp: number; level: number; coins: number; streak: number; longestStreak: number;
  lastActiveDay: string | null; dailyUsage: number; dailyUsageDay: string | null;
}

function mapUser(r: any): UserRow {
  return { ...r, isPremium: bool(r.isPremium) };
}

export const store = {
  // ---------------- Users ----------------
  getUserById(uid: string): UserRow | null {
    const r = open().prepare("SELECT * FROM User WHERE id = ?").get(uid);
    return r ? mapUser(r) : null;
  },
  getUserByEmail(email: string): UserRow | null {
    const r = open().prepare("SELECT * FROM User WHERE email = ?").get(email.toLowerCase());
    return r ? mapUser(r) : null;
  },
  createUser(input: { name: string; email: string; passwordHash: string; avatar?: string }): UserRow {
    const db = open();
    const uid = id();
    db.prepare(
      `INSERT INTO User (id,email,name,passwordHash,avatar,createdAt) VALUES (?,?,?,?,?,?)`
    ).run(uid, input.email.toLowerCase(), input.name, input.passwordHash, input.avatar ?? "fox", now());
    return this.getUserById(uid)!;
  },
  updateUser(uid: string, data: Record<string, string | number | boolean | null>): UserRow {
    const keys = Object.keys(data);
    if (keys.length) {
      const set = keys.map((k) => `${k} = ?`).join(", ");
      const vals = keys.map((k) => {
        const v = data[k];
        return typeof v === "boolean" ? (v ? 1 : 0) : v;
      });
      open().prepare(`UPDATE User SET ${set} WHERE id = ?`).run(...(vals as any), uid);
    }
    return this.getUserById(uid)!;
  },

  // ---------------- Topic mastery ----------------
  getTopic(uid: string, subject: string, topic: string) {
    return open().prepare(
      "SELECT * FROM TopicMastery WHERE userId = ? AND subject = ? AND topic = ?"
    ).get(uid, subject, topic) as any | undefined;
  },
  upsertTopic(uid: string, subject: string, topic: string, data: { mastery: number; isWeak: boolean; nextReview: string; correctDelta: number }) {
    const db = open();
    const existing = this.getTopic(uid, subject, topic);
    if (existing) {
      db.prepare(
        `UPDATE TopicMastery SET mastery=?, attempts=attempts+1, correct=correct+?, isWeak=?, lastSeen=?, nextReview=? WHERE id=?`
      ).run(data.mastery, data.correctDelta, data.isWeak ? 1 : 0, now(), data.nextReview, existing.id);
    } else {
      db.prepare(
        `INSERT INTO TopicMastery (id,userId,subject,topic,mastery,attempts,correct,isWeak,lastSeen,nextReview) VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).run(id(), uid, subject, topic, data.mastery, 1, data.correctDelta, data.isWeak ? 1 : 0, now(), data.nextReview);
    }
  },
  recentTopics(uid: string, limit: number) {
    return open().prepare("SELECT * FROM TopicMastery WHERE userId=? ORDER BY lastSeen DESC LIMIT ?").all(uid, limit) as any[];
  },
  weakTopics(uid: string, limit: number) {
    return open().prepare("SELECT * FROM TopicMastery WHERE userId=? AND isWeak=1 ORDER BY mastery ASC LIMIT ?").all(uid, limit) as any[];
  },

  // ---------------- Study sessions + AI history ----------------
  createSession(s: { userId: string; title: string; subject: string; topic: string; difficulty: string; mode: string; sourceText: string }): string {
    const sid = id();
    open().prepare(
      `INSERT INTO StudySession (id,userId,title,subject,topic,difficulty,mode,sourceText,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(sid, s.userId, s.title, s.subject, s.topic, s.difficulty, s.mode, s.sourceText, now());
    return sid;
  },
  recentSessions(uid: string, limit: number) {
    return open().prepare("SELECT * FROM StudySession WHERE userId=? ORDER BY createdAt DESC LIMIT ?").all(uid, limit) as any[];
  },
  sessionsWithCounts(uid: string, limit: number) {
    return open().prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM AiInteraction a WHERE a.sessionId = s.id) AS interactions
       FROM StudySession s WHERE s.userId=? ORDER BY s.createdAt DESC LIMIT ?`
    ).all(uid, limit) as any[];
  },
  createInteraction(i: { userId: string; sessionId: string | null; mode: string; prompt: string; response: string; model: string }) {
    open().prepare(
      `INSERT INTO AiInteraction (id,userId,sessionId,mode,prompt,response,model,createdAt) VALUES (?,?,?,?,?,?,?,?)`
    ).run(id(), i.userId, i.sessionId, i.mode, i.prompt, i.response, i.model, now());
  },

  // ---------------- Study sets + flashcards ----------------
  createSet(s: { userId: string; title: string; subject: string }): string {
    const sid = id();
    open().prepare(`INSERT INTO StudySet (id,userId,title,subject,createdAt) VALUES (?,?,?,?,?)`)
      .run(sid, s.userId, s.title, s.subject, now());
    return sid;
  },
  createFlashcards(userId: string, setId: string | null, cards: { front: string; back: string; subject: string; topic: string }[]) {
    const db = open();
    const ins = db.prepare(
      `INSERT INTO Flashcard (id,userId,setId,front,back,subject,topic,ease,interval,repetition,dueAt,createdAt)
       VALUES (?,?,?,?,?,?,?,2.5,0,0,?,?)`
    );
    const t = now();
    for (const c of cards) ins.run(id(), userId, setId, c.front, c.back, c.subject, c.topic, t, t);
  },
  dueFlashcards(uid: string, setId: string | null, limit: number) {
    const db = open();
    if (setId) {
      return db.prepare("SELECT * FROM Flashcard WHERE userId=? AND setId=? AND dueAt<=? ORDER BY dueAt ASC LIMIT ?")
        .all(uid, setId, now(), limit) as any[];
    }
    return db.prepare("SELECT * FROM Flashcard WHERE userId=? AND dueAt<=? ORDER BY dueAt ASC LIMIT ?")
      .all(uid, now(), limit) as any[];
  },
  getFlashcard(uid: string, cardId: string) {
    return open().prepare("SELECT * FROM Flashcard WHERE id=? AND userId=?").get(cardId, uid) as any | undefined;
  },
  updateFlashcardSrs(cardId: string, d: { ease: number; interval: number; repetition: number; dueAt: string }) {
    open().prepare("UPDATE Flashcard SET ease=?, interval=?, repetition=?, dueAt=? WHERE id=?")
      .run(d.ease, d.interval, d.repetition, d.dueAt, cardId);
  },
  countDueFlashcards(uid: string): number {
    return (open().prepare("SELECT COUNT(*) c FROM Flashcard WHERE userId=? AND dueAt<=?").get(uid, now()) as { c: number }).c;
  },
  setsWithCounts(uid: string) {
    return open().prepare(
      `SELECT s.*,
        (SELECT COUNT(*) FROM Flashcard f WHERE f.setId=s.id) AS count,
        (SELECT COUNT(*) FROM Flashcard f WHERE f.setId=s.id AND f.dueAt<=?) AS due
       FROM StudySet s WHERE s.userId=? ORDER BY s.createdAt DESC`
    ).all(now(), uid) as any[];
  },
  countSets(uid: string): number {
    return (open().prepare("SELECT COUNT(*) c FROM StudySet WHERE userId=?").get(uid) as { c: number }).c;
  },

  // ---------------- Quizzes + attempts ----------------
  createQuiz(q: { setId?: string | null; title: string; subject: string; topic: string; difficulty: string; kind: string; questions: string }): string {
    const qid = id();
    open().prepare(
      `INSERT INTO Quiz (id,setId,title,subject,topic,difficulty,kind,questions,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(qid, q.setId ?? null, q.title, q.subject, q.topic, q.difficulty, q.kind, q.questions, now());
    return qid;
  },
  createAttempt(a: { userId: string; quizId: string; score: number; total: number; xpEarned: number; coinsEarned: number }) {
    open().prepare(
      `INSERT INTO QuizAttempt (id,userId,quizId,score,total,xpEarned,coinsEarned,details,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(id(), a.userId, a.quizId, a.score, a.total, a.xpEarned, a.coinsEarned, "[]", now());
  },
  recentAttempts(uid: string, limit: number) {
    return open().prepare(
      `SELECT qa.*, q.title AS quizTitle FROM QuizAttempt qa JOIN Quiz q ON q.id = qa.quizId
       WHERE qa.userId=? ORDER BY qa.createdAt DESC LIMIT ?`
    ).all(uid, limit) as any[];
  },

  // ---------------- Cosmetics ----------------
  ownedCosmetics(uid: string): string[] {
    return (open().prepare("SELECT cosmeticId FROM UserCosmetic WHERE userId=?").all(uid) as any[]).map((r) => r.cosmeticId);
  },
  hasCosmetic(uid: string, cosmeticId: string): boolean {
    return !!open().prepare("SELECT 1 FROM UserCosmetic WHERE userId=? AND cosmeticId=?").get(uid, cosmeticId);
  },
  grantCosmetic(uid: string, cosmeticId: string) {
    open().prepare("INSERT OR IGNORE INTO UserCosmetic (id,userId,cosmeticId,equipped,acquiredAt) VALUES (?,?,?,0,?)")
      .run(id(), uid, cosmeticId, now());
  },
  isDefaultOwned(cosmeticId: string) {
    return DEFAULT_OWNED.includes(cosmeticId);
  },
};
