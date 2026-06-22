"use client";

/**
 * Client-side OCR via tesseract.js — extracts text from a photo of a worksheet
 * with no server round-trip and no API key. Dynamically imported so it never
 * bloats the initial bundle.
 */
export async function runOcr(
  file: File | Blob,
  onProgress?: (pct: number) => void
): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  return result.data.text.trim();
}
