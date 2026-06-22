import { z } from "zod";
import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";
import { COSMETIC_MAP } from "@/lib/cosmetics";

const Body = z.object({ id: z.string() });

export async function POST(req: Request) {
  return handler(async () => {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Invalid request.");
    const item = COSMETIC_MAP.get(parsed.data.id);
    if (!item) return bad("Unknown item.", 404);

    const u = store.getUserById(user.id)!;
    if (item.premium && !u.isPremium) return bad("This item is exclusive to Premium members.", 403);
    if (item.price === 0 || store.hasCosmetic(user.id, item.id)) return bad("You already own this.", 409);
    if (u.coins < item.price) return bad("Not enough coins. Play more games to earn them!", 402);

    store.updateUser(user.id, { coins: u.coins - item.price });
    store.grantCosmetic(user.id, item.id);

    return ok({ owned: true, coins: u.coins - item.price });
  });
}
