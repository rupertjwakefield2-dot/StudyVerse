import { z } from "zod";
import { store } from "@/lib/store";
import { createSession, verifyPassword } from "@/lib/auth";
import { handler, ok, bad } from "@/lib/api";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  return handler(async () => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("Enter your email and password.");
    const { email, password } = parsed.data;

    const user = await store.getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return bad("Incorrect email or password.", 401);
    }

    await createSession(user.id);
    return ok({ id: user.id, name: user.name, email: user.email });
  });
}
