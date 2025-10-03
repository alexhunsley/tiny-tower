// utils.js
export function parseDigits(raw) {
  const s = String(raw || "").replace(/\s+/g, "");
  if (!s) return [];
  if (!/^[1-8]+$/.test(s)) return null;
  return s.split("").map(d => parseInt(d, 10));
}