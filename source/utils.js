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
