import type {
  AIProvider,
  DetectMeta,
  Difficulty,
  FlashcardResponse,
  QuizResponse,
  TutorRequest,
  TutorResponse,
} from "./types";

/**
 * A deterministic, heuristic provider so the entire product is usable with no
 * API key. It is intentionally simple but content-aware enough to feel alive.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "synapse-mock-1";

  async detect(text: string): Promise<DetectMeta> {
    return detectMeta(text);
  }

  async tutor(req: TutorRequest): Promise<TutorResponse> {
    const meta = detectMeta(`${req.subject ?? ""} ${req.topic ?? ""} ${req.question} ${req.sourceText ?? ""}`);
    const subject = req.subject && req.subject !== "General" ? req.subject : meta.subject;
    const topic = req.topic && req.topic !== "General" ? req.topic : meta.topic;
    const restate = `Let's work through: "${truncate(req.question, 110)}".`;

    if (req.mode === "hint") {
      return {
        mode: "hint",
        subject,
        topic,
        difficulty: req.difficulty,
        restate,
        steps: [
          { title: "Find the goal", detail: "What exactly is being asked for? Underline the unknown before doing anything else." },
          { title: "Spot the concept", detail: `This looks like a ${topic} problem. Which rule or formula connects what you're given to what you want?` },
          { title: "First move only", detail: "Make just the first step — don't solve it all. Often that unlocks the rest." },
        ],
        keyIdea: "Name the goal, name the concept, take one step. You've got this.",
        followUpTopics: [topic, ...meta.followUps],
        speech: `Here's a nudge rather than the answer. First, pin down exactly what you're solving for. Then ask which ${topic} idea links what you know to what you need. Try the very first step and see where it takes you.`,
      };
    }

    if (req.mode === "quiz") {
      return {
        mode: "quiz",
        subject,
        topic,
        difficulty: req.difficulty,
        restate,
        steps: [],
        checkQuestion: `Before I explain — in your own words, what is the first thing you'd do to approach this ${topic} problem, and why?`,
        keyIdea: "Explaining your first move out loud is how you find out what you actually understand.",
        followUpTopics: [topic, ...meta.followUps],
        speech: `Let's check your thinking first. In your own words, what would you do as a first step here, and why? Tell me and I'll guide you from there.`,
      };
    }

    // guided
    const steps = buildGuidedSteps(req.question, topic, req.difficulty);
    return {
      mode: "guided",
      subject,
      topic,
      difficulty: req.difficulty,
      restate,
      steps,
      keyIdea: `The heart of this ${topic} problem is to work one transformation at a time and check each result before moving on.`,
      followUpTopics: [topic, ...meta.followUps],
      speech: `Okay, let's solve this together. ${steps
        .map((s, i) => `Step ${i + 1}: ${s.title}. ${s.detail}`)
        .join(" ")} And that's the method — the key idea is to take it one careful step at a time.`,
    };
  }

  async generateQuiz(opts: {
    sourceText: string;
    subject?: string;
    topic?: string;
    difficulty: Difficulty;
    count: number;
  }): Promise<QuizResponse> {
    const meta = detectMeta(`${opts.subject ?? ""} ${opts.topic ?? ""} ${opts.sourceText}`);
    const subject = opts.subject || meta.subject;
    const topic = opts.topic || meta.topic;
    const terms = keyTerms(opts.sourceText, opts.count * 2);
    const questions = Array.from({ length: opts.count }).map((_, i) => {
      const term = terms[i % terms.length] || `${topic} concept ${i + 1}`;
      const correct = `The defining property of ${term}`;
      const choices = shuffleWithAnswer(
        correct,
        [
          `An unrelated detail about ${term}`,
          `The opposite of ${term}`,
          `A common misconception about ${term}`,
        ],
        i
      );
      return {
        id: `q${i + 1}`,
        prompt: `Which statement best captures ${term}?`,
        choices: choices.list,
        answerIndex: choices.answerIndex,
        explanation: `"${correct}" is correct because it states the core idea of ${term} rather than a surface detail or its opposite.`,
        topic,
        difficulty: opts.difficulty,
      };
    });
    return { title: `${topic} — practice quiz`, subject, topic, questions };
  }

  async generateFlashcards(opts: {
    sourceText: string;
    subject?: string;
    count: number;
  }): Promise<FlashcardResponse> {
    const meta = detectMeta(`${opts.subject ?? ""} ${opts.sourceText}`);
    const subject = opts.subject || meta.subject;
    const terms = keyTerms(opts.sourceText, opts.count);
    const cards = terms.slice(0, opts.count).map((t) => ({
      front: `What is ${t}?`,
      back: `${capitalize(t)} — ${firstSentenceContaining(opts.sourceText, t) || `a key idea in ${meta.topic}.`}`,
      topic: meta.topic,
    }));
    // Pad if not enough material.
    while (cards.length < opts.count) {
      const n = cards.length + 1;
      cards.push({
        front: `Define key term #${n} for ${meta.topic}`,
        back: `Add your own definition while revising — active recall makes it stick.`,
        topic: meta.topic,
      });
    }
    return { title: `${meta.topic} — flashcards`, subject, cards };
  }
}

// ---------------------------------------------------------------------------
// Heuristics
// ---------------------------------------------------------------------------

const SUBJECT_SIGNALS: { subject: string; topic: string; re: RegExp; followUps: string[] }[] = [
  { subject: "Mathematics", topic: "Algebra", re: /\b(solve|equation|\=|x\^?2|quadratic|factor|simplif|variable)\b/i, followUps: ["Linear equations", "Factoring"] },
  { subject: "Mathematics", topic: "Calculus", re: /\b(derivative|integral|limit|d\/dx|differentiat|∫)\b/i, followUps: ["Limits", "Chain rule"] },
  { subject: "Mathematics", topic: "Geometry", re: /\b(triangle|angle|area|perimeter|circle|theorem|pythag)\b/i, followUps: ["Triangles", "Circles"] },
  { subject: "Physics", topic: "Mechanics", re: /\b(velocity|force|acceleration|newton|momentum|energy|joule|mass)\b/i, followUps: ["Newton's laws", "Energy"] },
  { subject: "Chemistry", topic: "Reactions", re: /\b(mole|reaction|atom|molecul|bond|acid|base|ph|element|compound)\b/i, followUps: ["Stoichiometry", "Bonding"] },
  { subject: "Biology", topic: "Cells", re: /\b(cell|dna|enzyme|protein|mitochondri|organism|photosynth|gene)\b/i, followUps: ["Genetics", "Metabolism"] },
  { subject: "Computer Science", topic: "Algorithms", re: /\b(algorithm|function|array|loop|recursion|complexity|code|variable|class|big-?o)\b/i, followUps: ["Data structures", "Complexity"] },
  { subject: "History", topic: "Modern History", re: /\b(war|revolution|empire|century|treaty|king|president|ancient|civilization)\b/i, followUps: ["Causes & effects", "Key figures"] },
  { subject: "English", topic: "Literature", re: /\b(essay|metaphor|theme|character|author|poem|novel|paragraph|thesis)\b/i, followUps: ["Essay structure", "Literary devices"] },
  { subject: "Economics", topic: "Microeconomics", re: /\b(supply|demand|market|price|gdp|inflation|cost|profit|elasticity)\b/i, followUps: ["Markets", "Elasticity"] },
];

export function detectMeta(text: string): DetectMeta & { followUps: string[] } {
  const t = text || "";
  for (const s of SUBJECT_SIGNALS) {
    if (s.re.test(t)) {
      return { subject: s.subject, topic: s.topic, difficulty: guessDifficulty(t), followUps: s.followUps };
    }
  }
  return { subject: "General", topic: "Study Skills", difficulty: guessDifficulty(t), followUps: ["Active recall", "Note-taking"] };
}

function guessDifficulty(t: string): Difficulty {
  const len = t.length;
  if (/\b(prove|derive|advanced|university|a-?level|calculus|integral)\b/i.test(t) || len > 600) return "hard";
  if (/\b(basic|simple|introduction|year ?[1-6]|grade ?[1-6])\b/i.test(t) || len < 120) return "easy";
  return "medium";
}

function buildGuidedSteps(question: string, topic: string, difficulty: Difficulty) {
  // Detect a simple arithmetic/algebra expression and solve it concretely.
  const eq = question.match(/(-?\d+(\.\d+)?)\s*([+\-*/x×÷])\s*(-?\d+(\.\d+)?)/);
  if (eq) {
    const a = parseFloat(eq[1]);
    const op = eq[3];
    const b = parseFloat(eq[4]);
    const { result, name } = compute(a, op, b);
    return [
      { title: "Identify the operation", detail: `We're asked to ${name} ${a} and ${b}.` },
      { title: "Line up the numbers", detail: `Write it as ${a} ${normalizeOp(op)} ${b}.` },
      { title: "Compute carefully", detail: `${a} ${normalizeOp(op)} ${b} = ${result}.` },
      { title: "Sanity check", detail: `Does ${result} make sense in scale? Estimate quickly to confirm it's reasonable.` },
    ];
  }
  return [
    { title: "Understand the question", detail: `Restate it in your own words and underline what's being asked. This is a ${topic} task.` },
    { title: "Gather what you know", detail: "List the given facts and the formula or rule that connects them." },
    { title: "Work the method", detail: `Apply the ${topic} method one transformation at a time, writing each line out fully.` },
    { title: "Check the result", detail: difficulty === "hard" ? "Verify units and edge cases; re-derive a key line." : "Re-read the question and confirm your answer actually answers it." },
  ];
}

function compute(a: number, op: string, b: number) {
  switch (op) {
    case "+": return { result: a + b, name: "add" };
    case "-": return { result: a - b, name: "subtract" };
    case "*": case "x": case "×": return { result: a * b, name: "multiply" };
    case "/": case "÷": return { result: b === 0 ? NaN : a / b, name: "divide" };
    default: return { result: NaN, name: "evaluate" };
  }
}
function normalizeOp(op: string) {
  return op === "x" || op === "×" ? "×" : op === "÷" ? "÷" : op;
}

function keyTerms(text: string, n: number): string[] {
  const stop = new Set("the a an and or of to in is are for with on at by from as it this that these those be was were will can".split(" "));
  const counts = new Map<string, number>();
  for (const raw of (text || "").toLowerCase().match(/[a-z][a-z\-]{3,}/g) || []) {
    if (stop.has(raw)) continue;
    counts.set(raw, (counts.get(raw) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
  return ranked.length ? ranked.slice(0, n) : ["the main concept", "a key definition", "an example", "the core formula"];
}

function firstSentenceContaining(text: string, term: string): string | null {
  const sentences = (text || "").split(/(?<=[.!?])\s+/);
  const hit = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()));
  return hit ? truncate(hit.trim(), 160) : null;
}

function shuffleWithAnswer(correct: string, wrong: string[], seed: number) {
  const list = [correct, ...wrong];
  // deterministic shuffle by seed
  for (let i = list.length - 1; i > 0; i--) {
    const j = (seed * 9301 + 49297 * (i + 1)) % 233280 % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { list, answerIndex: list.indexOf(correct) };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
