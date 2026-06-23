import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

// POST /api/premium/checkout — creates a Stripe Checkout session and returns the URL.
// Falls back to instant-grant if STRIPE_SECRET_KEY is not set (dev mode).
export async function POST() {
  const user = await requireUser();

  if (!process.env.STRIPE_SECRET_KEY) {
    // Dev bypass: grant premium directly
    const { store } = await import("@/lib/store");
    await store.updateUser(user.id, { isPremium: true, premiumSince: new Date().toISOString() });
    return NextResponse.json({ devBypass: true });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" as any });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 1000, // $10.00
          product_data: {
            name: "Synapse Premium — Lifetime Access",
            description: "Unlimited AI tutoring, all game modes, 1.5× XP/coins, and exclusive cosmetics.",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: user.id },
    customer_email: user.email,
    success_url: `${appUrl}/premium?success=1`,
    cancel_url: `${appUrl}/premium`,
  });

  return NextResponse.json({ url: session.url });
}
