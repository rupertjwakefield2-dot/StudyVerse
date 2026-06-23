import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { store } from "@/lib/store";

// POST /api/games/session — issue a one-use session token before a game starts.
// The token is consumed on score submission so multi-tab farming earns nothing.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { mode } = await req.json();
    if (!mode || typeof mode !== "string") return NextResponse.json({ error: "mode required" }, { status: 400 });
    const sessionId = await store.createGameSession(user.id, mode);
    return NextResponse.json({ sessionId });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
