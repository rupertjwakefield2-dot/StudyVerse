// Cosmetic catalog shared by the shop UI and purchase/equip APIs.

export interface CosmeticDef {
  id: string;
  preview: string;
  name: string;
  type: "character" | "background" | "nametag";
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  premium?: boolean;
}

export const COSMETICS: CosmeticDef[] = [
  { id: "spark", preview: "SV", name: "Spark", type: "character", rarity: "common", price: 0 },
  { id: "nova", preview: "NV", name: "Nova", type: "character", rarity: "common", price: 0 },
  { id: "pixel", preview: "PX", name: "Pixel", type: "character", rarity: "common", price: 80 },
  { id: "orbit", preview: "OB", name: "Orbit", type: "character", rarity: "rare", price: 220 },
  { id: "cipher", preview: "CP", name: "Cipher", type: "character", rarity: "epic", price: 650 },
  { id: "astral", preview: "AS", name: "Astral", type: "character", rarity: "epic", price: 850 },
  { id: "wizard", preview: "WZ", name: "Wizard", type: "character", rarity: "legendary", price: 1500, premium: true },
  { id: "phoenix", preview: "PH", name: "Phoenix", type: "character", rarity: "legendary", price: 2000, premium: true },

  { id: "midnight-grid", preview: "GRID", name: "Midnight Grid", type: "background", rarity: "common", price: 0 },
  { id: "paper-desk", preview: "PAPER", name: "Paper Desk", type: "background", rarity: "common", price: 120 },
  { id: "arcade-pop", preview: "POP", name: "Arcade Pop", type: "background", rarity: "rare", price: 350 },
  { id: "aurora-lab", preview: "AURA", name: "Aurora Lab", type: "background", rarity: "epic", price: 700 },
  { id: "gold-stage", preview: "GOLD", name: "Gold Stage", type: "background", rarity: "legendary", price: 1400, premium: true },

  { id: "rookie", preview: "Rookie", name: "Rookie", type: "nametag", rarity: "common", price: 0 },
  { id: "quizsmith", preview: "Quizsmith", name: "Quizsmith", type: "nametag", rarity: "common", price: 160 },
  { id: "streakstar", preview: "Streakstar", name: "Streakstar", type: "nametag", rarity: "rare", price: 420 },
  { id: "brainboss", preview: "Brain Boss", name: "Brain Boss", type: "nametag", rarity: "epic", price: 760 },
  { id: "study-royalty", preview: "Study Royalty", name: "Study Royalty", type: "nametag", rarity: "legendary", price: 1600, premium: true },
];

export const COSMETIC_MAP = new Map(COSMETICS.map((c) => [c.id, c]));
export const DEFAULT_OWNED = ["spark", "nova", "midnight-grid", "rookie"];
