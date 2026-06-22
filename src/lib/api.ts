import { NextResponse } from "next/server";
import { UnauthorizedError } from "./auth";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap an API handler with consistent auth + error handling. */
export function handler(fn: () => Promise<Response>) {
  return (async () => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof UnauthorizedError) return bad("Not authenticated", 401);
      console.error("[api] error:", err);
      return bad("Something went wrong", 500);
    }
  })();
}
