export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
