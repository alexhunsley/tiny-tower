// utils.js
export function parseDigits(raw) {
  const s = String(raw || "").replace(/\s+/g, "");
  if (!s) return [];
  if (!/^[1-8]+$/.test(s)) return null;
  return s.split("").map(d => parseInt(d, 10));
}

export function isSafariFamily() {
  const ua = navigator.userAgent || "";
  const vendor = navigator.vendor || "";
  const isSafariVendor = /Apple Computer/.test(vendor);
  const isSafariUA = /Safari/.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR|Brave)/.test(ua);
  return isSafariVendor && isSafariUA;
}

export function repeatList(list, n) {
    if (n <= 0 || list.length === 0) return [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(...list);
    return out;
}

export function toCSVRow(arr) {
    return arr
        .map(s => `"${String(s).replace(/"/g, '""')}"`)
        .join(",");
}

export function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
}
