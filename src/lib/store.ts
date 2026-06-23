import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client/web";
import { COSMETICS, DEFAULT_OWNED } from "./cosmetics";

/**
 * Data layer behind one async interface with two interchangeable backends:
 *
 *  - LOCAL DEV  → Node's built-in `node:sqlite` (a file on disk; offline,
 *    arm64-native, zero install).
 *  - PRODUCTION → Turso / libSQL over HTTP (`@libsql/client/web`, pure JS) when
 *    TURSO_DATABASE_URL is set — so accounts and progress PERSIST across the
 *    host's restarts. SQLite dialect, so the same SQL runs on both.
 *
 * Everything is async so the two backends share one code path.
 */

interface Backend {
  all(sql: string, params?: unknown[]): Promise<any[]>;
  get(sql: string, params?: unknown[]): Promise<any | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
  execScript(sql: string): Promise<void>;
}

// --- Local backend: node:sqlite (synchronous engine wrapped as async) ---
class NodeBackend implements Backend {
  private constructor(private db: any) {}
  static async create(file: string): Promise<NodeBackend> {
    // Dynamic import so the production (libSQL) path never loads node:sqlite.
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    return new NodeBackend(db);
  }
  async all(sql: string, params: unknown[] = []) { return this.db.prepare(sql).all(...params); }
  async get(sql: string, params: unknown[] = []) { return this.db.prepare(sql).get(...params); }
  async run(sql: string, params: unknown[] = []) { this.db.prepare(sql).run(...params); }
  async execScript(sql: string) { this.db.exec(sql); }
}

// --- Production backend: libSQL / Turso over HTTP (pure JS) ---
class LibsqlBackend implements Backend {
  private client: ReturnType<typeof createClient>;
  constructor(url: string, authToken?: string) {
    this.client = createClient({ url, authToken });
  }
  private toObjects(rs: any): any[] {
    return rs.rows.map((row: any) => {
      const o: Record<string, unknown> = {};
      for (const c of rs.columns) o[c] = row[c];
      return o;
    });
  }
  async all(sql: string, params: unknown[] = []) {
    return this.toObjects(await this.client.execute({ sql, args: params as any }));
  }
  async get(sql: string, params: unknown[] = []) {
    return this.toObjects(await this.client.execute({ sql, args: params as any }))[0];
  }
  async run(sql: string, params: unknown[] = []) {
    await this.client.execute({ sql, args: params as any });
  }
  async execScript(sql: string) {
    await this.client.executeMultiple(sql);
  }
}

function resolveLocalPath(): string {
  const url = process.env.DATABASE_URL || "file:./synapse.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  return path.resolve(process.cwd(), file);
}

const g = globalThis as unknown as { __synapseBackend?: Promise<Backend> };

function getBackend(): Promise<Backend> {
  if (!g.__synapseBackend) g.__synapseBackend = init();
  return g.__synapseBackend;
}

async function init(): Promise<Backend> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const backend: Backend = tursoUrl
    ? new LibsqlBackend(tursoUrl, process.env.TURSO_AUTH_TOKEN)
    : await NodeBackend.create(resolveLocalPath());
  await migrate(backend);
  await seed(backend);
  await seedDemo(backend);
  return backend;
}

async function migrate(db: Backend) {
  await db.execScript(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    passwordHash TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT 'spark',
    background TEXT NOT NULL DEFAULT 'midnight-grid',
    nametag TEXT NOT NULL DEFAULT 'rookie',
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
  CREATE TABLE IF NOT EXISTS GameSession (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    mode TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    usedAt TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_gamesession_user ON GameSession(userId, mode, usedAt);
  `);
  await db.execScript(`
  CREATE TABLE IF NOT EXISTS HomeworkTask (
    id TEXT PRIMARY KEY,
    teacherId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT 'General',
    dueDate TEXT,
    classGroup TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS Detention (
    id TEXT PRIMARY KEY,
    teacherId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    reason TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    notes TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS BehaviorRecord (
    id TEXT PRIMARY KEY,
    teacherId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    customReason TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS AchievementRecord (
    id TEXT PRIMARY KEY,
    teacherId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    customReason TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_homework_teacher ON HomeworkTask(teacherId, createdAt);
  CREATE INDEX IF NOT EXISTS idx_detention_teacher ON Detention(teacherId, date);
  CREATE INDEX IF NOT EXISTS idx_behavior_teacher ON BehaviorRecord(teacherId, studentName, createdAt);
  CREATE INDEX IF NOT EXISTS idx_achievement_teacher ON AchievementRecord(teacherId, studentName, createdAt);
  `);
  await addColumnIfMissing(db, "User", "background", "TEXT NOT NULL DEFAULT 'midnight-grid'");
  await addColumnIfMissing(db, "User", "nametag", "TEXT NOT NULL DEFAULT 'rookie'");
  await addColumnIfMissing(db, "User", "stripeCustomerId", "TEXT");
  await addColumnIfMissing(db, "User", "role", "TEXT NOT NULL DEFAULT 'student'");
}

async function addColumnIfMissing(db: Backend, table: string, column: string, definition: string) {
  const columns = await db.all(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function seed(db: Backend) {
  const row = await db.get("SELECT COUNT(*) AS c FROM Cosmetic");
  if (Number(row?.c ?? 0) === 0) {
    for (const c of COSMETICS) {
      await db.run("INSERT INTO Cosmetic (id,name,type,price,rarity,premium) VALUES (?,?,?,?,?,?)", [
        c.id, c.name, c.type, c.price, c.rarity, c.premium ? 1 : 0,
      ]);
    }
  }
}

// Seed a ready-to-explore demo account so the app isn't empty on first run.
async function seedDemo(db: Backend) {
  const existing = await db.get("SELECT id FROM User WHERE email = ?", ["demo@synapse.app"]);
  if (existing) return;
  const uid = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  await db.run(
    `INSERT INTO User (id,email,name,passwordHash,avatar,background,nametag,createdAt,xp,level,coins,streak,longestStreak,lastActiveDay)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [uid, "demo@synapse.app", "Demo Student", bcrypt.hashSync("demo1234", 10), "orbit", "arcade-pop", "quizsmith", now(), 640, 4, 320, 5, 9, today]
  );

  const topics: [string, string, number, number][] = [
    ["Mathematics", "Algebra", 0.82, 0], ["Mathematics", "Calculus", 0.41, 1],
    ["Physics", "Mechanics", 0.38, 1], ["Biology", "Cells", 0.67, 0],
    ["Chemistry", "Reactions", 0.52, 1],
  ];
  for (const [subject, topic, mastery, weak] of topics) {
    await db.run(
      `INSERT INTO TopicMastery (id,userId,subject,topic,mastery,attempts,correct,isWeak,lastSeen,nextReview) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [randomUUID(), uid, subject, topic, mastery, 6, Math.round(6 * mastery), weak, now(), now()]
    );
  }

  const setId = randomUUID();
  await db.run(`INSERT INTO StudySet (id,userId,title,subject,createdAt) VALUES (?,?,?,?,?)`,
    [setId, uid, "Biology — Cell Structure", "Biology", now()]);
  const cards = [
    ["What is the function of mitochondria?", "The powerhouse of the cell — it produces ATP through respiration."],
    ["What does the nucleus contain?", "The cell's DNA — it controls cell activities and reproduction."],
    ["What is the role of the cell membrane?", "It controls what enters and leaves the cell (selective permeability)."],
  ];
  for (const [front, back] of cards) {
    await db.run(
      `INSERT INTO Flashcard (id,userId,setId,front,back,subject,topic,ease,interval,repetition,dueAt,createdAt) VALUES (?,?,?,?,?,?,?,2.5,0,0,?,?)`,
      [randomUUID(), uid, setId, front, back, "Biology", "Cells", now(), now()]
    );
  }
}

const now = () => new Date().toISOString();
const id = () => randomUUID();
const bool = (v: unknown) => v === 1 || v === true || v === "1";

export interface UserRow {
  id: string; email: string; name: string; passwordHash: string; avatar: string;
  background: string; nametag: string;
  createdAt: string; isPremium: boolean; premiumSince: string | null;
  xp: number; level: number; coins: number; streak: number; longestStreak: number;
  lastActiveDay: string | null; dailyUsage: number; dailyUsageDay: string | null;
}

function mapUser(r: any): UserRow {
  return { ...r, isPremium: bool(r.isPremium) };
}

export const store = {
  // ---------------- Users ----------------
  async getUserById(uid: string): Promise<UserRow | null> {
    const db = await getBackend();
    const r = await db.get("SELECT * FROM User WHERE id = ?", [uid]);
    return r ? mapUser(r) : null;
  },
  async getUserByEmail(email: string): Promise<UserRow | null> {
    const db = await getBackend();
    const r = await db.get("SELECT * FROM User WHERE email = ?", [email.toLowerCase()]);
    return r ? mapUser(r) : null;
  },
  async createUser(input: { name: string; email: string; passwordHash: string; avatar?: string }): Promise<UserRow> {
    const db = await getBackend();
    const uid = id();
    await db.run(
      `INSERT INTO User (id,email,name,passwordHash,avatar,createdAt) VALUES (?,?,?,?,?,?)`,
      [uid, input.email.toLowerCase(), input.name, input.passwordHash, input.avatar ?? "spark", now()]
    );
    return (await this.getUserById(uid))!;
  },
  async updateUser(uid: string, data: Record<string, string | number | boolean | null>): Promise<UserRow> {
    const keys = Object.keys(data);
    if (keys.length) {
      const db = await getBackend();
      const set = keys.map((k) => `${k} = ?`).join(", ");
      const vals = keys.map((k) => {
        const v = data[k];
        return typeof v === "boolean" ? (v ? 1 : 0) : v;
      });
      await db.run(`UPDATE User SET ${set} WHERE id = ?`, [...vals, uid]);
    }
    return (await this.getUserById(uid))!;
  },

  // ---------------- Topic mastery ----------------
  async getTopic(uid: string, subject: string, topic: string) {
    const db = await getBackend();
    return db.get("SELECT * FROM TopicMastery WHERE userId = ? AND subject = ? AND topic = ?", [uid, subject, topic]);
  },
  async upsertTopic(uid: string, subject: string, topic: string, data: { mastery: number; isWeak: boolean; nextReview: string; correctDelta: number }) {
    const db = await getBackend();
    const existing = await this.getTopic(uid, subject, topic);
    if (existing) {
      await db.run(
        `UPDATE TopicMastery SET mastery=?, attempts=attempts+1, correct=correct+?, isWeak=?, lastSeen=?, nextReview=? WHERE id=?`,
        [data.mastery, data.correctDelta, data.isWeak ? 1 : 0, now(), data.nextReview, existing.id]
      );
    } else {
      await db.run(
        `INSERT INTO TopicMastery (id,userId,subject,topic,mastery,attempts,correct,isWeak,lastSeen,nextReview) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id(), uid, subject, topic, data.mastery, 1, data.correctDelta, data.isWeak ? 1 : 0, now(), data.nextReview]
      );
    }
  },
  async recentTopics(uid: string, limit: number) {
    const db = await getBackend();
    return db.all("SELECT * FROM TopicMastery WHERE userId=? ORDER BY lastSeen DESC LIMIT ?", [uid, limit]);
  },
  async weakTopics(uid: string, limit: number) {
    const db = await getBackend();
    return db.all("SELECT * FROM TopicMastery WHERE userId=? AND isWeak=1 ORDER BY mastery ASC LIMIT ?", [uid, limit]);
  },

  // ---------------- Study sessions + AI history ----------------
  async createSession(s: { userId: string; title: string; subject: string; topic: string; difficulty: string; mode: string; sourceText: string }): Promise<string> {
    const db = await getBackend();
    const sid = id();
    await db.run(
      `INSERT INTO StudySession (id,userId,title,subject,topic,difficulty,mode,sourceText,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`,
      [sid, s.userId, s.title, s.subject, s.topic, s.difficulty, s.mode, s.sourceText, now()]
    );
    return sid;
  },
  async recentSessions(uid: string, limit: number) {
    const db = await getBackend();
    return db.all("SELECT * FROM StudySession WHERE userId=? ORDER BY createdAt DESC LIMIT ?", [uid, limit]);
  },
  async sessionsWithCounts(uid: string, limit: number) {
    const db = await getBackend();
    return db.all(
      `SELECT s.*, (SELECT COUNT(*) FROM AiInteraction a WHERE a.sessionId = s.id) AS interactions
       FROM StudySession s WHERE s.userId=? ORDER BY s.createdAt DESC LIMIT ?`,
      [uid, limit]
    );
  },
  async createInteraction(i: { userId: string; sessionId: string | null; mode: string; prompt: string; response: string; model: string }) {
    const db = await getBackend();
    await db.run(
      `INSERT INTO AiInteraction (id,userId,sessionId,mode,prompt,response,model,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
      [id(), i.userId, i.sessionId, i.mode, i.prompt, i.response, i.model, now()]
    );
  },

  // ---------------- Study sets + flashcards ----------------
  async createSet(s: { userId: string; title: string; subject: string }): Promise<string> {
    const db = await getBackend();
    const sid = id();
    await db.run(`INSERT INTO StudySet (id,userId,title,subject,createdAt) VALUES (?,?,?,?,?)`, [sid, s.userId, s.title, s.subject, now()]);
    return sid;
  },
  async createFlashcards(userId: string, setId: string | null, cards: { front: string; back: string; subject: string; topic: string }[]) {
    const db = await getBackend();
    const t = now();
    for (const c of cards) {
      await db.run(
        `INSERT INTO Flashcard (id,userId,setId,front,back,subject,topic,ease,interval,repetition,dueAt,createdAt)
         VALUES (?,?,?,?,?,?,?,2.5,0,0,?,?)`,
        [id(), userId, setId, c.front, c.back, c.subject, c.topic, t, t]
      );
    }
  },
  async dueFlashcards(uid: string, setId: string | null, limit: number) {
    const db = await getBackend();
    if (setId) {
      return db.all("SELECT * FROM Flashcard WHERE userId=? AND setId=? AND dueAt<=? ORDER BY dueAt ASC LIMIT ?", [uid, setId, now(), limit]);
    }
    return db.all("SELECT * FROM Flashcard WHERE userId=? AND dueAt<=? ORDER BY dueAt ASC LIMIT ?", [uid, now(), limit]);
  },
  async getFlashcard(uid: string, cardId: string) {
    const db = await getBackend();
    return db.get("SELECT * FROM Flashcard WHERE id=? AND userId=?", [cardId, uid]);
  },
  async updateFlashcardSrs(cardId: string, d: { ease: number; interval: number; repetition: number; dueAt: string }) {
    const db = await getBackend();
    await db.run("UPDATE Flashcard SET ease=?, interval=?, repetition=?, dueAt=? WHERE id=?", [d.ease, d.interval, d.repetition, d.dueAt, cardId]);
  },
  async countDueFlashcards(uid: string): Promise<number> {
    const db = await getBackend();
    const r = await db.get("SELECT COUNT(*) AS c FROM Flashcard WHERE userId=? AND dueAt<=?", [uid, now()]);
    return Number(r?.c ?? 0);
  },
  async setsWithCounts(uid: string) {
    const db = await getBackend();
    return db.all(
      `SELECT s.*,
        (SELECT COUNT(*) FROM Flashcard f WHERE f.setId=s.id) AS count,
        (SELECT COUNT(*) FROM Flashcard f WHERE f.setId=s.id AND f.dueAt<=?) AS due
       FROM StudySet s WHERE s.userId=? ORDER BY s.createdAt DESC`,
      [now(), uid]
    );
  },
  async countSets(uid: string): Promise<number> {
    const db = await getBackend();
    const r = await db.get("SELECT COUNT(*) AS c FROM StudySet WHERE userId=?", [uid]);
    return Number(r?.c ?? 0);
  },

  // ---------------- Quizzes + attempts ----------------
  async createQuiz(q: { setId?: string | null; title: string; subject: string; topic: string; difficulty: string; kind: string; questions: string }): Promise<string> {
    const db = await getBackend();
    const qid = id();
    await db.run(
      `INSERT INTO Quiz (id,setId,title,subject,topic,difficulty,kind,questions,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`,
      [qid, q.setId ?? null, q.title, q.subject, q.topic, q.difficulty, q.kind, q.questions, now()]
    );
    return qid;
  },
  async createAttempt(a: { userId: string; quizId: string; score: number; total: number; xpEarned: number; coinsEarned: number }) {
    const db = await getBackend();
    await db.run(
      `INSERT INTO QuizAttempt (id,userId,quizId,score,total,xpEarned,coinsEarned,details,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id(), a.userId, a.quizId, a.score, a.total, a.xpEarned, a.coinsEarned, "[]", now()]
    );
  },
  async recentAttempts(uid: string, limit: number) {
    const db = await getBackend();
    return db.all(
      `SELECT qa.*, q.title AS quizTitle FROM QuizAttempt qa JOIN Quiz q ON q.id = qa.quizId
       WHERE qa.userId=? ORDER BY qa.createdAt DESC LIMIT ?`,
      [uid, limit]
    );
  },

  // ---------------- Cosmetics ----------------
  async ownedCosmetics(uid: string): Promise<string[]> {
    const db = await getBackend();
    return (await db.all("SELECT cosmeticId FROM UserCosmetic WHERE userId=?", [uid])).map((r) => r.cosmeticId);
  },
  async hasCosmetic(uid: string, cosmeticId: string): Promise<boolean> {
    const db = await getBackend();
    return !!(await db.get("SELECT 1 AS x FROM UserCosmetic WHERE userId=? AND cosmeticId=?", [uid, cosmeticId]));
  },
  async grantCosmetic(uid: string, cosmeticId: string) {
    const db = await getBackend();
    await db.run("INSERT OR IGNORE INTO UserCosmetic (id,userId,cosmeticId,equipped,acquiredAt) VALUES (?,?,?,0,?)", [id(), uid, cosmeticId, now()]);
  },
  isDefaultOwned(cosmeticId: string) {
    return DEFAULT_OWNED.includes(cosmeticId);
  },

  // ---------------- Game sessions (anti-tab-farming) ----------------
  async createGameSession(uid: string, mode: string): Promise<string> {
    const db = await getBackend();
    const sid = id();
    // Expire any previous unclaimed sessions for this user+mode
    await db.run("DELETE FROM GameSession WHERE userId=? AND mode=? AND usedAt IS NULL", [uid, mode]);
    await db.run("INSERT INTO GameSession (id,userId,mode,createdAt) VALUES (?,?,?,?)", [sid, uid, mode, now()]);
    return sid;
  },
  async consumeGameSession(uid: string, sessionId: string): Promise<boolean> {
    const db = await getBackend();
    const row = await db.get("SELECT id FROM GameSession WHERE id=? AND userId=? AND usedAt IS NULL", [sessionId, uid]);
    if (!row) return false;
    await db.run("UPDATE GameSession SET usedAt=? WHERE id=?", [now(), sessionId]);
    return true;
  },

  // ---------------- Stripe ----------------
  async getUserByStripeCustomer(customerId: string): Promise<UserRow | null> {
    const db = await getBackend();
    const r = await db.get("SELECT * FROM User WHERE stripeCustomerId=?", [customerId]);
    return r ? mapUser(r) : null;
  },

  // ---------------- Homework tasks ----------------
  async createHomework(t: { teacherId: string; title: string; description: string; subject: string; dueDate?: string; classGroup: string }): Promise<string> {
    const db = await getBackend();
    const hid = id();
    await db.run(
      `INSERT INTO HomeworkTask (id,teacherId,title,description,subject,dueDate,classGroup,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
      [hid, t.teacherId, t.title, t.description, t.subject, t.dueDate ?? null, t.classGroup, now()]
    );
    return hid;
  },
  async getHomework(teacherId: string): Promise<any[]> {
    const db = await getBackend();
    return db.all("SELECT * FROM HomeworkTask WHERE teacherId=? ORDER BY createdAt DESC", [teacherId]);
  },
  async deleteHomework(id: string, teacherId: string) {
    const db = await getBackend();
    await db.run("DELETE FROM HomeworkTask WHERE id=? AND teacherId=?", [id, teacherId]);
  },

  // ---------------- Detentions ----------------
  async createDetention(d: { teacherId: string; studentName: string; reason: string; date: string; duration: number; notes: string }): Promise<string> {
    const db = await getBackend();
    const did = id();
    await db.run(
      `INSERT INTO Detention (id,teacherId,studentName,reason,date,duration,notes,createdAt) VALUES (?,?,?,?,?,?,?,?)`,
      [did, d.teacherId, d.studentName, d.reason, d.date, d.duration, d.notes, now()]
    );
    return did;
  },
  async getDetentions(teacherId: string): Promise<any[]> {
    const db = await getBackend();
    return db.all("SELECT * FROM Detention WHERE teacherId=? ORDER BY date DESC", [teacherId]);
  },
  async deleteDetention(id: string, teacherId: string) {
    const db = await getBackend();
    await db.run("DELETE FROM Detention WHERE id=? AND teacherId=?", [id, teacherId]);
  },

  // ---------------- Behavior Points ----------------
  async addBehaviorRecord(r: { teacherId: string; studentName: string; points: number; reason: string; customReason: string }): Promise<{ id: string; autoDetention: boolean }> {
    const db = await getBackend();
    const rid = id();
    await db.run(
      `INSERT INTO BehaviorRecord (id,teacherId,studentName,points,reason,customReason,createdAt) VALUES (?,?,?,?,?,?,?)`,
      [rid, r.teacherId, r.studentName, r.points, r.reason, r.customReason, now()]
    );
    // Check if student has reached 5+ net behavior points → auto-create detention
    const netPoints = await this.getStudentNetBehavior(r.teacherId, r.studentName);
    let autoDetention = false;
    if (netPoints >= 5 && (netPoints - r.points) < 5) {
      // just crossed the threshold
      const today = new Date().toISOString().slice(0, 10);
      await this.createDetention({
        teacherId: r.teacherId,
        studentName: r.studentName,
        reason: "Accumulated 5 behavior points",
        date: today,
        duration: 30,
        notes: `Auto-created: student reached ${netPoints} net behavior points.`,
      });
      autoDetention = true;
    }
    return { id: rid, autoDetention };
  },
  async getBehaviorRecords(teacherId: string): Promise<any[]> {
    const db = await getBackend();
    return db.all("SELECT * FROM BehaviorRecord WHERE teacherId=? ORDER BY createdAt DESC", [teacherId]);
  },
  async deleteBehaviorRecord(rid: string, teacherId: string) {
    const db = await getBackend();
    await db.run("DELETE FROM BehaviorRecord WHERE id=? AND teacherId=?", [rid, teacherId]);
  },

  // ---------------- Achievement Points ----------------
  async addAchievementRecord(r: { teacherId: string; studentName: string; points: number; reason: string; customReason: string }): Promise<string> {
    const db = await getBackend();
    const rid = id();
    await db.run(
      `INSERT INTO AchievementRecord (id,teacherId,studentName,points,reason,customReason,createdAt) VALUES (?,?,?,?,?,?,?)`,
      [rid, r.teacherId, r.studentName, r.points, r.reason, r.customReason, now()]
    );
    return rid;
  },
  async getAchievementRecords(teacherId: string): Promise<any[]> {
    const db = await getBackend();
    return db.all("SELECT * FROM AchievementRecord WHERE teacherId=? ORDER BY createdAt DESC", [teacherId]);
  },
  async deleteAchievementRecord(rid: string, teacherId: string) {
    const db = await getBackend();
    await db.run("DELETE FROM AchievementRecord WHERE id=? AND teacherId=?", [rid, teacherId]);
  },

  // Returns net behavior points for a student: raw behavior - floor(achievement / 10)
  async getStudentNetBehavior(teacherId: string, studentName: string): Promise<number> {
    const db = await getBackend();
    const bRow = await db.get(
      "SELECT COALESCE(SUM(points),0) AS total FROM BehaviorRecord WHERE teacherId=? AND studentName=?",
      [teacherId, studentName]
    );
    const aRow = await db.get(
      "SELECT COALESCE(SUM(points),0) AS total FROM AchievementRecord WHERE teacherId=? AND studentName=?",
      [teacherId, studentName]
    );
    const bTotal = Number(bRow?.total ?? 0);
    const aTotal = Number(aRow?.total ?? 0);
    return Math.max(0, bTotal - Math.floor(aTotal / 10));
  },

  // Returns a per-student summary for a teacher's class
  async getStudentPointsSummary(teacherId: string): Promise<Array<{
    studentName: string;
    behaviorTotal: number;
    achievementTotal: number;
    netBehavior: number;
    needsDetention: boolean;
  }>> {
    const db = await getBackend();
    const bRows = await db.all(
      "SELECT studentName, SUM(points) AS total FROM BehaviorRecord WHERE teacherId=? GROUP BY studentName",
      [teacherId]
    );
    const aRows = await db.all(
      "SELECT studentName, SUM(points) AS total FROM AchievementRecord WHERE teacherId=? GROUP BY studentName",
      [teacherId]
    );
    const bMap = new Map(bRows.map((r: any) => [r.studentName, Number(r.total)]));
    const aMap = new Map(aRows.map((r: any) => [r.studentName, Number(r.total)]));
    const names = new Set([...bMap.keys(), ...aMap.keys()]);
    return [...names].map((name) => {
      const behaviorTotal = bMap.get(name) ?? 0;
      const achievementTotal = aMap.get(name) ?? 0;
      const netBehavior = Math.max(0, behaviorTotal - Math.floor(achievementTotal / 10));
      return { studentName: name, behaviorTotal, achievementTotal, netBehavior, needsDetention: netBehavior >= 5 };
    }).sort((a, b) => b.netBehavior - a.netBehavior);
  },
};
