import { store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";

/**
 * Grants premium. In a real deployment this is called by the Stripe webhook
 * after a successful $10 one-time payment. Without Stripe keys configured it
 * acts as a local dev unlock so the premium flows are fully testable.
 */
export async function POST() {
  return handler(async () => {
    const user = await requireUser();

    if (process.env.STRIPE_SECRET_KEY) {
      // Stripe is configured — real payment must go through checkout + webhook.
      return bad("Use the Stripe checkout flow to purchase premium.", 400);
    }

    store.updateUser(user.id, { isPremium: true, premiumSince: new Date().toISOString() });
    return ok({ isPremium: true, devUnlock: true });
  });
}
