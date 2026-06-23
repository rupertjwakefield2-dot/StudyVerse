import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { COSMETICS, type CosmeticDef } from "@/lib/cosmetics";

const PACKS = {
  common: { cost: 100, minRarity: ["common", "rare"] },
  rare: { cost: 300, minRarity: ["rare", "epic"] },
  legendary: { cost: 1000, minRarity: ["epic", "legendary"] },
} as const;

type PackKey = keyof typeof PACKS;
const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

// POST /api/shop/gacha — spend coins to pull a random cosmetic from a pack tier.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { pack } = (await req.json()) as { pack: PackKey };

    if (!PACKS[pack]) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

    const { cost, minRarity } = PACKS[pack];
    const fullUser = await store.getUserById(user.id);
    if (!fullUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (fullUser.coins < cost) return NextResponse.json({ error: "Not enough coins" }, { status: 402 });

    // Filter eligible cosmetics: correct rarity tier, not already owned
    const owned = await store.ownedCosmetics(user.id);
    const ownedSet = new Set(owned);
    const pool: CosmeticDef[] = COSMETICS.filter((c) => {
      if (ownedSet.has(c.id)) return false;
      if (c.premium && !fullUser.isPremium) return false;
      return (minRarity as readonly string[]).includes(c.rarity) || RARITY_ORDER.indexOf(c.rarity) >= RARITY_ORDER.indexOf(minRarity[0]);
    });

    if (!pool.length) {
      // All eligible cosmetics already owned — refund
      return NextResponse.json({ error: "You already own everything in this pack tier!" }, { status: 409 });
    }

    // Weighted random: legendary is rarest
    const weights: Record<string, number> = { common: 60, rare: 25, epic: 12, legendary: 3 };
    const weightedPool = pool.map((c) => ({ c, w: weights[c.rarity] ?? 5 }));
    const totalWeight = weightedPool.reduce((s, e) => s + e.w, 0);
    let rng = Math.random() * totalWeight;
    let pulled = pool[pool.length - 1]; // fallback
    for (const { c, w } of weightedPool) {
      rng -= w;
      if (rng <= 0) { pulled = c; break; }
    }

    // Deduct coins, grant cosmetic
    await store.updateUser(user.id, { coins: fullUser.coins - cost });
    await store.grantCosmetic(user.id, pulled.id);

    return NextResponse.json({ pulled, remaining: fullUser.coins - cost });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
