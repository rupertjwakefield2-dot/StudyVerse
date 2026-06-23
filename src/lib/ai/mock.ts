import type {
  AIProvider,
  DetectMeta,
  Difficulty,
  FlashcardResponse,
  QuizResponse,
  TutorRequest,
  TutorResponse,
} from "./types";

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
        mode: "hint", subject, topic, difficulty: req.difficulty, restate,
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
        mode: "quiz", subject, topic, difficulty: req.difficulty, restate, steps: [],
        checkQuestion: `Before I explain — in your own words, what is the first thing you'd do to approach this ${topic} problem, and why?`,
        keyIdea: "Explaining your first move out loud is how you find out what you actually understand.",
        followUpTopics: [topic, ...meta.followUps],
        speech: `Let's check your thinking first. In your own words, what would you do as a first step here, and why? Tell me and I'll guide you from there.`,
      };
    }

    const steps = buildGuidedSteps(req.question, topic, req.difficulty);
    return {
      mode: "guided", subject, topic, difficulty: req.difficulty, restate, steps,
      keyIdea: `The heart of this ${topic} problem is to work one transformation at a time and check each result before moving on.`,
      followUpTopics: [topic, ...meta.followUps],
      speech: `Okay, let's solve this together. ${steps.map((s, i) => `Step ${i + 1}: ${s.title}. ${s.detail}`).join(" ")} And that's the method — the key idea is to take it one careful step at a time.`,
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

    // If real content is pasted (not a topic-only stub), extract questions from it.
    const strippedText = opts.sourceText
      .replace(/^quiz(?: me on)?[^.!?\n]{0,80}[.!?\n]?/i, "")
      .trim();
    const questions: ReturnType<typeof makeQ>[] = [];

    if (strippedText.length > 250) {
      const textBased = extractFromText(strippedText, topic, opts.difficulty);
      questions.push(...textBased.slice(0, opts.count));
    }

    // Fill from the curated topic bank until we have enough.
    if (questions.length < opts.count) {
      const bank = getTopicBank(topic, subject, opts.difficulty);
      const used = new Set(questions.map((q) => q.prompt));
      for (const q of shuffleArray(bank)) {
        if (questions.length >= opts.count) break;
        if (!used.has(q.prompt)) { questions.push(q); used.add(q.prompt); }
      }
    }

    // Last resort: generate sensible generic questions.
    while (questions.length < opts.count) {
      questions.push(makeFallbackQ(topic, subject, opts.difficulty, questions.length));
    }

    return {
      title: `${topic} — practice quiz`,
      subject,
      topic,
      questions: questions.slice(0, opts.count).map((q, i) => ({ id: `q${i + 1}`, ...q, difficulty: q.difficulty ?? opts.difficulty })),
    };
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
    while (cards.length < opts.count) {
      const n = cards.length + 1;
      cards.push({ front: `Define key term #${n} for ${meta.topic}`, back: `Add your own definition while revising — active recall makes it stick.`, topic: meta.topic });
    }
    return { title: `${meta.topic} — flashcards`, subject, cards };
  }
}

// ---------------------------------------------------------------------------
// Humanizer (heuristic text rewriting for the humanizer feature)
// ---------------------------------------------------------------------------
export function humanizeText(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\butilize\b/gi, "use"],
    [/\bdemonstrate\b/gi, "show"],
    [/\bfacilitate\b/gi, "help"],
    [/\bsubsequently\b/gi, "then"],
    [/\bfurthermore\b/gi, "also"],
    [/\bhowever\b/gi, "but"],
    [/\btherefore\b/gi, "so"],
    [/\bnevertheless\b/gi, "still"],
    [/\bin conclusion\b/gi, "to sum up"],
    [/\bit is important to note that\b/gi, "worth noting"],
    [/\bin order to\b/gi, "to"],
    [/\bdue to the fact that\b/gi, "because"],
    [/\ba significant\b/gi, "a key"],
    [/\bcommence\b/gi, "start"],
    [/\bterminate\b/gi, "end"],
    [/\bpurchase\b/gi, "buy"],
    [/\badditionally\b/gi, "plus"],
    [/\bmoreover\b/gi, "what's more"],
    [/\bconsequently\b/gi, "as a result"],
    [/\bIt should be noted that\b/gi, "Note that"],
    [/\bone can\b/gi, "you can"],
    [/\bThis essay will\b/gi, "I'll"],
    [/\bThis paper will\b/gi, "I'll"],
    [/\bdo not\b/gi, "don't"],
    [/\bcannot\b/gi, "can't"],
    [/\bwill not\b/gi, "won't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bis not\b/gi, "isn't"],
    [/\bare not\b/gi, "aren't"],
    [/\bwas not\b/gi, "wasn't"],
    [/\bwould not\b/gi, "wouldn't"],
    [/\bshould not\b/gi, "shouldn't"],
    [/\bcould not\b/gi, "couldn't"],
    [/\bhave not\b/gi, "haven't"],
    [/\bhas not\b/gi, "hasn't"],
    [/\bhad not\b/gi, "hadn't"],
  ];

  let result = text;
  for (const [re, rep] of replacements) result = result.replace(re, rep);

  // Split very long sentences (>40 words) at conjunctions.
  const sentences = result.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    if (words.length > 38) {
      const mid = s.search(/\b(and|but|so|yet|because|although|while|whereas)\b/gi);
      if (mid > s.length * 0.3 && mid < s.length * 0.7) {
        const pivot = s.slice(mid, mid + 20).search(/\b(and|but|so|yet|because|although|while|whereas)\b/gi);
        const breakAt = mid + pivot;
        const first = s.slice(0, breakAt).trimEnd();
        const second = capitalize(s.slice(breakAt).trimStart());
        out.push(first.endsWith(".") ? first : first + ".", second);
        continue;
      }
    }
    out.push(s);
  }
  return out.join(" ");
}

// ---------------------------------------------------------------------------
// Topic-specific curated question banks
// ---------------------------------------------------------------------------

interface QBank { prompt: string; choices: string[]; answerIndex: number; explanation: string; topic: string; difficulty?: Difficulty; }

const TOPIC_BANKS: Record<string, QBank[]> = {
  algebra: [
    { prompt: "What is the value of x in the equation 2x + 4 = 12?", choices: ["x = 4", "x = 3", "x = 6", "x = 8"], answerIndex: 0, explanation: "Subtract 4 from both sides: 2x = 8. Divide by 2: x = 4.", topic: "Algebra" },
    { prompt: "Which of these is a quadratic equation?", choices: ["x² + 3x - 5 = 0", "3x + 7 = 0", "x + y = 10", "√x = 4"], answerIndex: 0, explanation: "A quadratic has the form ax² + bx + c = 0 where a ≠ 0. Only the first option has an x² term." , topic: "Algebra" },
    { prompt: "What does FOIL stand for in algebra?", choices: ["First, Outer, Inner, Last", "Factor, Order, Integrate, Limit", "Find, Operate, Isolate, Linearise", "Form, Order, Invert, Label"], answerIndex: 0, explanation: "FOIL is a method for expanding two brackets: multiply First, Outer, Inner, then Last terms.", topic: "Algebra" },
    { prompt: "Solve: 3(x − 2) = 9", choices: ["x = 5", "x = 3", "x = 7", "x = 1"], answerIndex: 0, explanation: "Expand: 3x − 6 = 9. Add 6: 3x = 15. Divide: x = 5.", topic: "Algebra" },
    { prompt: "What is the gradient (slope) of the line y = 3x − 7?", choices: ["3", "−7", "7", "−3"], answerIndex: 0, explanation: "In y = mx + c, m is the gradient. Here m = 3.", topic: "Algebra" },
    { prompt: "Which of these is the correct factorisation of x² − 9?", choices: ["(x+3)(x−3)", "(x+9)(x−1)", "(x+3)²", "(x−9)(x+1)"], answerIndex: 0, explanation: "Difference of two squares: a² − b² = (a+b)(a−b). So x² − 9 = (x+3)(x−3).", topic: "Algebra" },
    { prompt: "If y = 2x + 1, what is y when x = 5?", choices: ["11", "12", "9", "10"], answerIndex: 0, explanation: "Substitute: y = 2(5) + 1 = 10 + 1 = 11.", topic: "Algebra" },
    { prompt: "What is the y-intercept of y = 4x − 3?", choices: ["−3", "4", "3", "0"], answerIndex: 0, explanation: "The y-intercept is c in y = mx + c. Here c = −3.", topic: "Algebra" },
  ],
  calculus: [
    { prompt: "What is the derivative of x²?", choices: ["2x", "x", "x²/2", "2"], answerIndex: 0, explanation: "Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(x²) = 2x.", topic: "Calculus" },
    { prompt: "What does the derivative of a function represent geometrically?", choices: ["The gradient of the tangent at a point", "The area under the curve", "The y-intercept", "The maximum value"], answerIndex: 0, explanation: "The derivative gives the instantaneous rate of change, which equals the gradient of the tangent line at any point.", topic: "Calculus" },
    { prompt: "What is the integral of 2x dx?", choices: ["x² + C", "2x² + C", "x + C", "x²/2 + C"], answerIndex: 0, explanation: "∫2x dx = 2 · x²/2 + C = x² + C.", topic: "Calculus" },
    { prompt: "What is the derivative of a constant, e.g. d/dx(7)?", choices: ["0", "7", "1", "−7"], answerIndex: 0, explanation: "Constants don't change, so their derivative is always 0.", topic: "Calculus" },
    { prompt: "If f(x) = 3x³, what is f'(x)?", choices: ["9x²", "3x²", "9x³", "x³"], answerIndex: 0, explanation: "Power rule: f'(x) = 3·3x² = 9x².", topic: "Calculus" },
    { prompt: "What does a definite integral calculate?", choices: ["The area under a curve between two limits", "The gradient at a point", "The maximum of a function", "The zeros of a function"], answerIndex: 0, explanation: "A definite integral sums infinitely many infinitesimal strips to find the area between the curve and the x-axis.", topic: "Calculus" },
  ],
  geometry: [
    { prompt: "What is the area of a circle with radius 5?", choices: ["25π", "10π", "5π", "50π"], answerIndex: 0, explanation: "Area = πr² = π × 25 = 25π.", topic: "Geometry" },
    { prompt: "In a right triangle, the square on the hypotenuse equals what?", choices: ["The sum of the squares on the other two sides", "Twice the area of the triangle", "The product of the other two sides", "Half the perimeter squared"], answerIndex: 0, explanation: "Pythagoras' theorem: c² = a² + b² where c is the hypotenuse.", topic: "Geometry" },
    { prompt: "How many degrees do the interior angles of a triangle sum to?", choices: ["180°", "360°", "90°", "270°"], answerIndex: 0, explanation: "The angles in any triangle always add to 180°.", topic: "Geometry" },
    { prompt: "What is the circumference of a circle with diameter 10?", choices: ["10π", "5π", "100π", "20π"], answerIndex: 0, explanation: "Circumference = πd = π × 10 = 10π.", topic: "Geometry" },
    { prompt: "What is the area of a rectangle 8 cm wide and 5 cm tall?", choices: ["40 cm²", "26 cm²", "13 cm²", "45 cm²"], answerIndex: 0, explanation: "Area = length × width = 8 × 5 = 40 cm².", topic: "Geometry" },
    { prompt: "Angles on a straight line sum to how many degrees?", choices: ["180°", "90°", "360°", "270°"], answerIndex: 0, explanation: "A straight line forms a 180° angle, so any angles sitting on it must sum to 180°.", topic: "Geometry" },
  ],
  mechanics: [
    { prompt: "What is Newton's First Law of Motion?", choices: ["An object stays at rest or in uniform motion unless acted on by a force", "F = ma", "Every action has an equal and opposite reaction", "Force equals mass times acceleration"], answerIndex: 0, explanation: "Newton's First Law (inertia): objects continue in their current state unless a net force acts on them.", topic: "Mechanics" },
    { prompt: "What is the formula for kinetic energy?", choices: ["½mv²", "mv", "mgh", "F × d"], answerIndex: 0, explanation: "KE = ½mv², where m is mass in kg and v is speed in m/s.", topic: "Mechanics" },
    { prompt: "A car accelerates from 0 to 20 m/s in 4 s. What is its acceleration?", choices: ["5 m/s²", "80 m/s²", "0.2 m/s²", "4 m/s²"], answerIndex: 0, explanation: "a = Δv/t = 20/4 = 5 m/s².", topic: "Mechanics" },
    { prompt: "What is the unit of force in SI units?", choices: ["Newton (N)", "Joule (J)", "Watt (W)", "Pascal (Pa)"], answerIndex: 0, explanation: "Force is measured in Newtons. 1 N = 1 kg·m/s².", topic: "Mechanics" },
    { prompt: "What does Newton's Third Law state?", choices: ["For every action there is an equal and opposite reaction", "Force equals mass times acceleration", "Objects stay in motion unless acted upon", "Energy cannot be created or destroyed"], answerIndex: 0, explanation: "Newton's 3rd Law: forces come in equal and opposite pairs between two objects.", topic: "Mechanics" },
    { prompt: "What is the gravitational potential energy of a 2 kg object at height 10 m? (g = 10 N/kg)", choices: ["200 J", "20 J", "100 J", "2000 J"], answerIndex: 0, explanation: "GPE = mgh = 2 × 10 × 10 = 200 J.", topic: "Mechanics" },
  ],
  reactions: [
    { prompt: "What is a mole in chemistry?", choices: ["6.02 × 10²³ particles", "The atomic mass in grams", "A unit of temperature", "The number of protons in an atom"], answerIndex: 0, explanation: "One mole contains Avogadro's number (6.02 × 10²³) of particles — atoms, molecules, or ions.", topic: "Reactions" },
    { prompt: "What type of reaction produces water and a salt?", choices: ["Neutralisation", "Combustion", "Oxidation", "Displacement"], answerIndex: 0, explanation: "Acid + Base → Salt + Water is a neutralisation reaction.", topic: "Reactions" },
    { prompt: "In the periodic table, elements in the same group share what?", choices: ["The same number of outer electrons", "The same atomic mass", "The same number of neutrons", "The same melting point"], answerIndex: 0, explanation: "Elements in the same group have the same number of electrons in their outer shell, giving them similar chemical properties.", topic: "Reactions" },
    { prompt: "What does pH measure?", choices: ["The concentration of hydrogen ions in solution", "The amount of oxygen in water", "The boiling point of an acid", "The colour of a solution"], answerIndex: 0, explanation: "pH = −log[H⁺]. Low pH = acidic (many H⁺ ions). High pH = alkaline (few H⁺ ions).", topic: "Reactions" },
    { prompt: "What is oxidation in terms of electrons?", choices: ["Loss of electrons", "Gain of electrons", "Gain of protons", "Loss of neutrons"], answerIndex: 0, explanation: "OIL RIG: Oxidation Is Loss, Reduction Is Gain (of electrons).", topic: "Reactions" },
    { prompt: "What is the formula for water?", choices: ["H₂O", "H₂O₂", "HO₂", "OH"], answerIndex: 0, explanation: "Water consists of two hydrogen atoms bonded to one oxygen atom: H₂O.", topic: "Reactions" },
  ],
  cells: [
    { prompt: "What is the function of the mitochondria?", choices: ["Producing ATP through respiration", "Controlling cell division", "Synthesising proteins", "Storing genetic information"], answerIndex: 0, explanation: "The mitochondria are the cell's power stations — they produce ATP via aerobic respiration.", topic: "Biology" },
    { prompt: "What does the nucleus of a cell contain?", choices: ["DNA and the cell's genetic information", "Chlorophyll for photosynthesis", "ATP for energy", "Proteins for the cell membrane"], answerIndex: 0, explanation: "The nucleus houses the cell's DNA, controlling its activities and reproduction.", topic: "Biology" },
    { prompt: "What organelle do plant cells have that animal cells do not?", choices: ["Chloroplasts", "Mitochondria", "Ribosomes", "Cell membrane"], answerIndex: 0, explanation: "Chloroplasts contain chlorophyll and are used for photosynthesis — only found in plant cells.", topic: "Biology" },
    { prompt: "What is the role of the cell membrane?", choices: ["Controls what enters and leaves the cell", "Produces energy for the cell", "Contains the cell's DNA", "Synthesises lipids"], answerIndex: 0, explanation: "The cell membrane is selectively permeable — it controls the movement of substances in and out of the cell.", topic: "Biology" },
    { prompt: "What is the equation for photosynthesis?", choices: ["6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O", "CO₂ + H₂O → O₂ + glucose", "O₂ + glucose → CO₂ + H₂O"], answerIndex: 0, explanation: "Plants use carbon dioxide and water, with light energy, to make glucose and oxygen.", topic: "Biology" },
    { prompt: "What is DNA?", choices: ["The molecule that carries genetic information", "A type of protein", "A form of energy storage", "An organelle in the cell"], answerIndex: 0, explanation: "DNA (deoxyribonucleic acid) stores genetic instructions used for growth, functioning, and reproduction.", topic: "Biology" },
  ],
  "modern history": [
    { prompt: "When did World War I begin?", choices: ["1914", "1939", "1918", "1900"], answerIndex: 0, explanation: "WWI started in 1914 following the assassination of Archduke Franz Ferdinand.", topic: "History" },
    { prompt: "What caused the start of the Cold War?", choices: ["Ideological conflict between capitalism (USA) and communism (USSR)", "A military battle between the US and Soviet Union", "The assassination of a world leader", "A trade dispute over nuclear weapons"], answerIndex: 0, explanation: "The Cold War (1947–1991) was a period of political tension rooted in ideological differences between the democratic West and the communist Soviet bloc.", topic: "History" },
    { prompt: "What was the significance of the Berlin Wall?", choices: ["It divided East and West Germany, symbolising the Iron Curtain", "It protected Germany from invasion in WWI", "It marked the border between France and Germany", "It was built to control flooding in Berlin"], answerIndex: 0, explanation: "Built in 1961, the Berlin Wall physically separated communist East Berlin from democratic West Berlin until 1989.", topic: "History" },
    { prompt: "Which treaty ended World War I?", choices: ["Treaty of Versailles", "Treaty of Paris", "Treaty of Westphalia", "Treaty of Berlin"], answerIndex: 0, explanation: "The Treaty of Versailles (1919) officially ended WWI and imposed harsh penalties on Germany.", topic: "History" },
    { prompt: "What was the Holocaust?", choices: ["The systematic genocide of 6 million Jews by Nazi Germany", "The bombing of Dresden in WWII", "The mass execution of Soviet POWs", "The destruction of Warsaw by German forces"], answerIndex: 0, explanation: "The Holocaust was the state-sponsored murder of approximately six million Jews, along with millions of others, by Nazi Germany during WWII.", topic: "History" },
    { prompt: "When did World War II end?", choices: ["1945", "1944", "1946", "1943"], answerIndex: 0, explanation: "WWII ended in 1945 — VE Day (Victory in Europe) was May 8, and VJ Day (Victory over Japan) was August 15.", topic: "History" },
  ],
  literature: [
    { prompt: "What is a metaphor?", choices: ["A direct comparison saying one thing IS another", "A comparison using 'like' or 'as'", "A word that imitates a sound", "A type of rhyme scheme"], answerIndex: 0, explanation: "A metaphor states that one thing IS something else (e.g. 'Life is a journey'), unlike a simile which uses 'like' or 'as'.", topic: "English" },
    { prompt: "What is the theme of a story?", choices: ["The central message or idea explored throughout the text", "The setting in which events occur", "The sequence of events in the plot", "The main character's name"], answerIndex: 0, explanation: "Theme is the underlying message or big idea a text explores (e.g. love, betrayal, justice).", topic: "English" },
    { prompt: "What does 'foreshadowing' mean?", choices: ["Hints earlier in a text about what will happen later", "The climax of the plot", "When a narrator describes their own feelings", "A character's internal conflict"], answerIndex: 0, explanation: "Foreshadowing is when an author drops clues or hints about future events to build suspense or prepare the reader.", topic: "English" },
    { prompt: "Who wrote 'Romeo and Juliet'?", choices: ["William Shakespeare", "Charles Dickens", "John Keats", "Jane Austen"], answerIndex: 0, explanation: "Romeo and Juliet was written by William Shakespeare, likely around 1594–1596.", topic: "English" },
    { prompt: "What is an 'unreliable narrator'?", choices: ["A narrator whose account of events cannot be fully trusted", "A narrator who tells the story from multiple viewpoints", "A narrator who speaks directly to the reader", "A narrator who doesn't know the ending"], answerIndex: 0, explanation: "An unreliable narrator may be biased, mistaken, or deliberately deceptive — their version of events is not objectively true.", topic: "English" },
    { prompt: "What literary device is 'the sun smiled down'?", choices: ["Personification", "Metaphor", "Simile", "Alliteration"], answerIndex: 0, explanation: "Personification gives human qualities or actions to non-human things — the sun cannot actually smile.", topic: "English" },
  ],
  algorithms: [
    { prompt: "What does O(n) mean in Big-O notation?", choices: ["The algorithm's time grows linearly with input size", "The algorithm runs in constant time", "The algorithm's time doubles for each extra input", "The algorithm never finishes"], answerIndex: 0, explanation: "O(n) (linear time) means if the input doubles, the time taken roughly doubles. Each element is visited once.", topic: "Computer Science" },
    { prompt: "What is a 'for loop' used for?", choices: ["Repeating a block of code a set number of times", "Storing a list of values", "Defining a function", "Handling errors"], answerIndex: 0, explanation: "A for loop iterates a fixed number of times or over each element in a collection.", topic: "Computer Science" },
    { prompt: "What is the difference between a compiled and interpreted language?", choices: ["Compiled code is translated all at once; interpreted code runs line by line", "Compiled languages are slower than interpreted ones", "Interpreted languages can only run on specific hardware", "There is no practical difference"], answerIndex: 0, explanation: "A compiler translates the full source code to machine code before running. An interpreter executes it line by line at runtime.", topic: "Computer Science" },
    { prompt: "What is recursion?", choices: ["A function calling itself", "A loop that never ends", "A type of data structure", "Copying one variable into another"], answerIndex: 0, explanation: "Recursion is when a function calls itself as part of its own definition, with a base case to stop it.", topic: "Computer Science" },
    { prompt: "What does an array store?", choices: ["An ordered collection of elements at indexed positions", "A key-value mapping", "A set of unique values", "A first-in first-out queue"], answerIndex: 0, explanation: "An array holds elements in order, accessed by their position (index), starting at 0 in most languages.", topic: "Computer Science" },
    { prompt: "What is a boolean value?", choices: ["True or False", "A whole number", "A decimal number", "A piece of text"], answerIndex: 0, explanation: "A boolean can only be one of two values: true or false. Used in conditions and logic.", topic: "Computer Science" },
  ],
  microeconomics: [
    { prompt: "What does the law of demand state?", choices: ["As price rises, quantity demanded falls (all else equal)", "As price rises, quantity demanded rises", "Demand is always equal to supply", "Price has no effect on how much consumers buy"], answerIndex: 0, explanation: "The law of demand: when price goes up, consumers buy less, showing an inverse relationship.", topic: "Economics" },
    { prompt: "What is an elastic demand?", choices: ["Quantity demanded changes significantly when price changes", "Demand stays the same regardless of price", "Only luxury goods experience demand changes", "Price and demand move in the same direction"], answerIndex: 0, explanation: "Elastic demand (PED > 1) means consumers are sensitive to price changes — a small rise causes a big drop in sales.", topic: "Economics" },
    { prompt: "What is GDP?", choices: ["The total value of goods and services produced in a country in a year", "The government's tax revenue", "The average income of citizens", "The amount of money in circulation"], answerIndex: 0, explanation: "Gross Domestic Product (GDP) measures the total monetary value of all final goods and services produced within a country in a specific time period.", topic: "Economics" },
    { prompt: "What causes inflation?", choices: ["Too much money chasing too few goods", "A decrease in government spending", "Falling wages", "Rising unemployment"], answerIndex: 0, explanation: "Inflation occurs when demand for goods and services outpaces supply, or when production costs rise and are passed to consumers.", topic: "Economics" },
    { prompt: "What is opportunity cost?", choices: ["The value of the next best alternative foregone", "The total cost of a purchase", "The profit made on a transaction", "The cost of borrowing money"], answerIndex: 0, explanation: "Opportunity cost is what you give up when you make a choice — the value of the option you didn't take.", topic: "Economics" },
  ],
};

const TOPIC_KEY_MAP: Record<string, string> = {
  algebra: "algebra", "linear equations": "algebra", "quadratic": "algebra", "equations": "algebra",
  calculus: "calculus", "derivatives": "calculus", "integration": "calculus", "differentiation": "calculus",
  geometry: "geometry", "shapes": "geometry", "triangles": "geometry", "circles": "geometry",
  mechanics: "mechanics", "physics": "mechanics", "forces": "mechanics", "newton": "mechanics", "velocity": "mechanics",
  chemistry: "reactions", "reactions": "reactions", "atoms": "reactions", "molecules": "reactions", "acids": "reactions",
  biology: "cells", "cells": "cells", "photosynthesis": "cells", "dna": "cells", "genetics": "cells",
  history: "modern history", "world war": "modern history", "wwi": "modern history", "wwii": "modern history", "cold war": "modern history",
  english: "literature", "literature": "literature", "shakespeare": "literature", "poetry": "literature", "essay": "literature",
  "computer science": "algorithms", "coding": "algorithms", "programming": "algorithms", "code": "algorithms",
  economics: "microeconomics", "supply": "microeconomics", "demand": "microeconomics", "market": "microeconomics",
};

function getTopicBank(topic: string, subject: string, difficulty: Difficulty): QBank[] {
  const key = topic.toLowerCase();
  const subKey = subject.toLowerCase();
  // Try topic, then subject, then partial matches
  for (const [k, v] of Object.entries(TOPIC_KEY_MAP)) {
    if (key.includes(k) || subKey.includes(k)) {
      return (TOPIC_BANKS[v] ?? []).map((q) => ({ ...q, difficulty }));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Text-based question extraction (for when real source text is provided)
// ---------------------------------------------------------------------------

function extractFromText(text: string, topic: string, difficulty: Difficulty): QBank[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300);

  const questions: QBank[] = [];
  const definitionRe = /\b(?:is|are|means|refers to|defined as|describes?|represents?|consists? of|involves?)\b/i;

  for (const sentence of sentences) {
    if (!definitionRe.test(sentence)) continue;
    const parts = sentence.split(definitionRe);
    if (parts.length < 2) continue;
    const subject = parts[0].trim().replace(/^(a|an|the)\s+/i, "");
    const definition = parts.slice(1).join(" ").trim();
    if (subject.length < 3 || definition.length < 10) continue;

    // Build 3 wrong answers from other sentences' subjects
    const otherSubjects = sentences
      .filter((s) => s !== sentence && definitionRe.test(s))
      .slice(0, 3)
      .map((s) => s.split(definitionRe).slice(1).join(" ").trim().slice(0, 80));

    const wrongAnswers = otherSubjects.length >= 3
      ? otherSubjects
      : ["This is not the correct definition.", "This refers to a different concept entirely.", "This is a common misconception."];

    const allChoices = [capitalize(definition.slice(0, 80)), ...wrongAnswers.map((w) => capitalize(w.slice(0, 80)))];
    const { list, answerIndex } = shuffleWithAnswer(allChoices[0], allChoices.slice(1), questions.length);

    questions.push({
      prompt: `What is ${subject.length > 40 ? topic : subject}?`,
      choices: list,
      answerIndex,
      explanation: `${capitalize(subject)} ${definition.slice(0, 120)}.`,
      topic,
      difficulty,
    });

    if (questions.length >= 10) break;
  }
  return questions;
}

function makeFallbackQ(topic: string, subject: string, difficulty: Difficulty, idx: number): QBank {
  const genericQs = [
    { prompt: `Which of these best describes a core principle of ${topic}?`, choices: [`A fundamental concept that applies broadly in ${topic}`, `An exception that rarely applies in ${topic}`, `A rule unique to advanced ${subject} courses`, `A disproven historical theory in ${topic}`], answerIndex: 0 },
    { prompt: `When studying ${topic}, what is the most useful first step?`, choices: ["Identify what the question is asking before applying any method", "Apply the most complex formula immediately", "Guess and check from the answer options", "Skip the question and return to it later"], answerIndex: 0 },
    { prompt: `What distinguishes an expert approach to ${topic} from a beginner's?`, choices: ["Checking whether the method fits the problem before starting", "Working faster without checking", "Memorising every formula by heart", "Avoiding difficult problems entirely"], answerIndex: 0 },
  ];
  const q = genericQs[idx % genericQs.length];
  return { ...q, explanation: `Understanding the fundamentals of ${topic} means ${q.choices[0].toLowerCase()}.`, topic, difficulty };
}

function makeQ(q: QBank) { return q; }

// ---------------------------------------------------------------------------
// Heuristics
// ---------------------------------------------------------------------------

const SUBJECT_SIGNALS: { subject: string; topic: string; re: RegExp; followUps: string[] }[] = [
  { subject: "Mathematics", topic: "Algebra", re: /\b(solve|equation|\=|x\^?2|quadratic|factor|simplif|variable|gradient|linear)\b/i, followUps: ["Linear equations", "Factoring"] },
  { subject: "Mathematics", topic: "Calculus", re: /\b(derivative|integral|limit|d\/dx|differentiat|∫|calculus)\b/i, followUps: ["Limits", "Chain rule"] },
  { subject: "Mathematics", topic: "Geometry", re: /\b(triangle|angle|area|perimeter|circle|theorem|pythag|shape|volume|radius)\b/i, followUps: ["Triangles", "Circles"] },
  { subject: "Physics", topic: "Mechanics", re: /\b(velocity|force|acceleration|newton|momentum|energy|joule|mass|physics|motion)\b/i, followUps: ["Newton's laws", "Energy"] },
  { subject: "Chemistry", topic: "Reactions", re: /\b(mole|reaction|atom|molecul|bond|acid|base|ph|element|compound|chemistry)\b/i, followUps: ["Stoichiometry", "Bonding"] },
  { subject: "Biology", topic: "Cells", re: /\b(cell|dna|enzyme|protein|mitochondri|organism|photosynth|gene|biology|nucleus)\b/i, followUps: ["Genetics", "Metabolism"] },
  { subject: "Computer Science", topic: "Algorithms", re: /\b(algorithm|function|array|loop|recursion|complexity|code|variable|class|big-?o|programming)\b/i, followUps: ["Data structures", "Complexity"] },
  { subject: "History", topic: "Modern History", re: /\b(war|revolution|empire|century|treaty|king|president|ancient|civilization|history)\b/i, followUps: ["Causes & effects", "Key figures"] },
  { subject: "English", topic: "Literature", re: /\b(essay|metaphor|theme|character|author|poem|novel|paragraph|thesis|shakespeare|literary)\b/i, followUps: ["Essay structure", "Literary devices"] },
  { subject: "Economics", topic: "Microeconomics", re: /\b(supply|demand|market|price|gdp|inflation|cost|profit|elasticity|economics)\b/i, followUps: ["Markets", "Elasticity"] },
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
  if (/\b(prove|derive|advanced|university|a-?level|calculus|integral)\b/i.test(t) || t.length > 600) return "hard";
  if (/\b(basic|simple|introduction|year ?[1-6]|grade ?[1-6])\b/i.test(t) || t.length < 120) return "easy";
  return "medium";
}

function buildGuidedSteps(question: string, topic: string, difficulty: Difficulty) {
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
      { title: "Sanity check", detail: `Does ${result} make sense in scale? Estimate quickly to confirm.` },
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
  for (let i = list.length - 1; i > 0; i--) {
    const j = (seed * 9301 + 49297 * (i + 1)) % 233280 % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { list, answerIndex: list.indexOf(correct) };
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
