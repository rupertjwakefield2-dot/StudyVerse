import { z } from "zod";
import { store } from "@/lib/store";
import { createSession, hashPassword } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  name: z.string().min(1).max(40),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  return handler(async () => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Please provide a name, valid email, and a 6+ character password.");
    const { name, email, password } = parsed.data;

    const existing = store.getUserByEmail(email);
    if (existing) return bad("An account with that email already exists.", 409);

    const user = store.createUser({
      name,
      email,
      passwordHash: await hashPassword(password),
      avatar: "fox", // default cosmetic; shop grants ownership lazily
    });

    await createSession(user.id);
    return ok({ id: user.id, name: user.name, email: user.email });
  });
}
