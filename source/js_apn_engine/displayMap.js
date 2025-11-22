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
export function formatRowForDisplay(row, digitsToGhost = []) {
    let html = row;

    for (const d of digitsToGhost) {
        html = html.replaceAll(d, `<span class="ghost-digit">${d}</span>`);
    }
    return html;
}
