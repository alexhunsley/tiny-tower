// notation.js
// Place notation utilities (initial stub): only "rounds" generation for now.

const STAGE_SYMBOLS = "1234567890ET"; // 10=0, 11=E, 12=T

export function clampStage(n) {
  const v = Number(n);
  return Math.max(4, Math.min(12, Number.isFinite(v) ? v : 6));
}

export function roundsForStage(stage) {
  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
}

// Placeholder for future expansion:
// export function expandPlaceNotation(pnString, stage) { ... }

export function generateList({ pnString, stage }) {
  // For now, just return [rounds]
  return [roundsForStage(stage)];
}
