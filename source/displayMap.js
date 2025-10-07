// // displayMap.js
// // A single hook to format rows for DISPLAY ONLY.
// // Default: identity (show the row normally).
// export function formatRowForDisplay(row, stage) {
//   // identity formatting (safe default)
//   return row.slice(0, stage);
// }

/*
 * Example custom mapping:
 * - show only bell "2": replace '2' with '*', others with spaces
 *   (monospace font recommended in your CSS).
 */
export function formatRowForDisplay(row, stage) {
  const target = "2";
  const s = row.slice(0, stage);
  return [...s].map(ch => (ch === target ? "*" : "&nbsp;&nbsp;")).join("");
}
