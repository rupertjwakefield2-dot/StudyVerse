import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// Stripe sends POST to this endpoint after a successful payment.
// We verify the signature, extract the userId from metadata, and grant premium.
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  let event: any;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" as any });
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    if (userId) {
      await store.updateUser(userId, {
        isPremium: true,
        premiumSince: new Date().toISOString(),
        stripeCustomerId: session.customer ?? null,
      });
    }
  }

  return NextResponse.json({ received: true });
}

// Stripe needs the raw body to verify signatures — opt out of body parsing.
export const config = { api: { bodyParser: false } };
