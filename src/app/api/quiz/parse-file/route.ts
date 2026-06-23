import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

// POST /api/quiz/parse-file — accepts multipart form with a "file" field.
// Extracts readable text from .txt, .pdf (via pdfjs), or .docx (via mammoth).
// Returns { text: string } — max 8000 chars for quiz generation.
export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "No form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Reject empty files
  if (file.size === 0) return NextResponse.json({ error: "File is empty (0 bytes)." }, { status: 422 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 413 });

  const name = file.name.toLowerCase();
  let text = "";

  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = await file.text();
    } else if (name.endsWith(".pdf")) {
      const pdf = (await import("pdf-parse" as any)).default;
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await pdf(buf);
      text = result.text;
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .pdf, .docx, or .txt." }, { status: 415 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to parse file: ${err.message}` }, { status: 422 });
  }

  text = text.replace(/\s+/g, " ").trim();
  if (!text) return NextResponse.json({ error: "No readable text found in this file." }, { status: 422 });

  return NextResponse.json({ text: text.slice(0, 8000) });
}
