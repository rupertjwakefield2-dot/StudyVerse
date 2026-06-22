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

    // Free items are owned by everyone; otherwise must have purchased.
    if (item.price > 0 && !store.hasCosmetic(user.id, item.id)) {
      return bad("You don't own this item yet.", 403);
    }

    store.updateUser(user.id, { avatar: item.id });
    return ok({ equipped: item.id });
  });
}
