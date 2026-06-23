import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { COSMETICS } from "@/lib/cosmetics";

export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    const u = (await store.getUserById(user.id))!;
    const ownedSet = new Set(await store.ownedCosmetics(user.id));

    return ok({
      coins: u.coins,
      equipped: {
        character: u.avatar,
        background: u.background,
        nametag: u.nametag,
      },
      isPremium: u.isPremium,
      items: COSMETICS.map((c) => ({
        ...c,
        owned: c.price === 0 || ownedSet.has(c.id),
        equipped:
          (c.type === "character" && u.avatar === c.id) ||
          (c.type === "background" && u.background === c.id) ||
          (c.type === "nametag" && u.nametag === c.id),
      })),
    });
  });
}
