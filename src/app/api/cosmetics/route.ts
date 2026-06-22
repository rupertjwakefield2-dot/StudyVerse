import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { COSMETICS } from "@/lib/cosmetics";

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const u = store.getUserById(user.id)!;
    const ownedSet = new Set(store.ownedCosmetics(user.id));

    return ok({
      coins: u.coins,
      equipped: u.avatar,
      isPremium: u.isPremium,
      items: COSMETICS.map((c) => ({
        ...c,
        owned: c.price === 0 || ownedSet.has(c.id),
        equipped: u.avatar === c.id,
      })),
    });
  });
}
