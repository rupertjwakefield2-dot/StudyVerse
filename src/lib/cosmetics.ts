// Cosmetic catalog — shared by the shop UI and the purchase API so prices and
// premium gating can never drift between client and server.

export interface CosmeticDef {
  id: string;
  emoji: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  premium?: boolean;
}

export const COSMETICS: CosmeticDef[] = [
  { id: "fox", emoji: "🦊", name: "Fox", rarity: "common", price: 0 },
  { id: "owl", emoji: "🦉", name: "Owl", rarity: "common", price: 0 },
  { id: "cat", emoji: "🐱", name: "Cat", rarity: "common", price: 80 },
  { id: "panda", emoji: "🐼", name: "Panda", rarity: "rare", price: 200 },
  { id: "dragon", emoji: "🐉", name: "Dragon", rarity: "epic", price: 600 },
  { id: "astronaut", emoji: "🧑‍🚀", name: "Astronaut", rarity: "epic", price: 800 },
  { id: "wizard", emoji: "🧙", name: "Wizard", rarity: "legendary", price: 1500, premium: true },
  { id: "phoenix", emoji: "🔥", name: "Phoenix", rarity: "legendary", price: 2000, premium: true },
];

export const COSMETIC_MAP = new Map(COSMETICS.map((c) => [c.id, c]));
// Avatars everyone owns from the start.
export const DEFAULT_OWNED = ["fox", "owl"];
