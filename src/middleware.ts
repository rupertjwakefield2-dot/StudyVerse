import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const FREE_GAME_PAGES = ["/games/solo", "/games/host", "/games/join", "/games/tower"];
const PREMIUM_GAME_PAGES = ["/games/crypto", "/games/kingdom"];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-change-me-to-a-long-random-string"
);

async function getSessionUser(req: NextRequest): Promise<{ id: string; isPremium: boolean } | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { id: payload.sub as string, isPremium: Boolean(payload.isPremium) };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block premium-only game pages for free users
  if (PREMIUM_GAME_PAGES.some((p) => pathname.startsWith(p))) {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!user.isPremium) {
      return NextResponse.redirect(new URL("/premium?reason=game", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/games/crypto/:path*", "/games/kingdom/:path*"],
};
