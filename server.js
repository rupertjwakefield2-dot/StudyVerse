// Custom Next.js server hosting Socket.io for live, Kahoot-style quiz rooms.
// Room state is authoritative and in-memory; the question timer runs here so
// all players stay in lockstep.

const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

// code -> room
const rooms = new Map();
const QUESTION_MS = 20000;
const REVEAL_MS = 4000;

function makeCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function publicPlayers(room) {
  return [...room.players.values()]
    .map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, streak: p.streak }))
    .sort((a, b) => b.score - a.score);
}

function emitRoom(io, room, event, payload) {
  io.to(room.code).emit(event, payload);
}

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res));
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    // --- Host creates a room with a quiz payload ---
    socket.on("host:create", ({ nickname, quiz }, cb) => {
      if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) {
        return cb && cb({ error: "Quiz has no questions." });
      }
      const code = makeCode();
      const room = {
        code,
        hostSocket: socket.id,
        hostName: nickname || "Host",
        quiz,
        status: "lobby",
        qIndex: -1,
        players: new Map(),
        answers: new Map(), // qIndex -> Set(playerId)
        timer: null,
        questionStart: 0,
      };
      rooms.set(code, room);
      socket.join(code);
      socket.data.code = code;
      socket.data.isHost = true;
      cb && cb({ code, title: quiz.title, total: quiz.questions.length });
    });

    // --- Player joins by code ---
    socket.on("player:join", ({ code, nickname }, cb) => {
      const room = rooms.get((code || "").toUpperCase());
      if (!room) return cb && cb({ error: "Room not found." });
      if (room.status !== "lobby") return cb && cb({ error: "Game already started." });
      const player = { id: socket.id, nickname: (nickname || "Player").slice(0, 18), score: 0, streak: 0 };
      room.players.set(socket.id, player);
      socket.join(room.code);
      socket.data.code = room.code;
      cb && cb({ code: room.code, title: room.quiz.title, total: room.quiz.questions.length });
      emitRoom(io, room, "lobby", { players: publicPlayers(room), hostName: room.hostName });
    });

    // --- Host starts ---
    socket.on("host:start", () => {
      const room = rooms.get(socket.data.code);
      if (!room || socket.id !== room.hostSocket) return;
      if (!room.players.size) return;
      room.status = "active";
      nextQuestion(io, room);
    });

    // --- Player answers ---
    socket.on("player:answer", ({ choiceIndex }) => {
      const room = rooms.get(socket.data.code);
      if (!room || room.status !== "active") return;
      const player = room.players.get(socket.id);
      if (!player) return;
      const answered = room.answers.get(room.qIndex) || new Set();
      if (answered.has(socket.id)) return; // one answer per question
      answered.add(socket.id);
      room.answers.set(room.qIndex, answered);

      const q = room.quiz.questions[room.qIndex];
      const correct = choiceIndex === q.answerIndex;
      if (correct) {
        const elapsed = Date.now() - room.questionStart;
        const speedBonus = Math.max(0, 1 - elapsed / QUESTION_MS);
        const points = Math.round(500 + 500 * speedBonus);
        player.streak += 1;
        player.score += points + (player.streak >= 3 ? 100 : 0);
      } else {
        player.streak = 0;
      }
      socket.emit("answer:ack", { correct, answerIndex: q.answerIndex });

      // If everyone answered, end the question early.
      if (answered.size >= room.players.size) {
        clearTimeout(room.timer);
        reveal(io, room);
      }
    });

    socket.on("disconnect", () => {
      const room = rooms.get(socket.data.code);
      if (!room) return;
      if (socket.id === room.hostSocket) {
        emitRoom(io, room, "room:closed", { reason: "Host left." });
        clearTimeout(room.timer);
        rooms.delete(room.code);
      } else if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.status === "lobby") {
          emitRoom(io, room, "lobby", { players: publicPlayers(room), hostName: room.hostName });
        }
      }
    });
  });

  function nextQuestion(io, room) {
    room.qIndex += 1;
    if (room.qIndex >= room.quiz.questions.length) {
      room.status = "finished";
      emitRoom(io, room, "game:over", { leaderboard: publicPlayers(room) });
      setTimeout(() => rooms.delete(room.code), 60000);
      return;
    }
    const q = room.quiz.questions[room.qIndex];
    room.questionStart = Date.now();
    room.answers.set(room.qIndex, new Set());
    emitRoom(io, room, "question", {
      index: room.qIndex,
      total: room.quiz.questions.length,
      prompt: q.prompt,
      choices: q.choices,
      durationMs: QUESTION_MS,
    });
    room.timer = setTimeout(() => reveal(io, room), QUESTION_MS);
  }

  function reveal(io, room) {
    const q = room.quiz.questions[room.qIndex];
    emitRoom(io, room, "reveal", {
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      leaderboard: publicPlayers(room),
    });
    room.timer = setTimeout(() => nextQuestion(io, room), REVEAL_MS);
  }

  server.listen(port, () => {
    console.log(`\n  ▸ Synapse ready on http://localhost:${port}\n`);
  });
});
