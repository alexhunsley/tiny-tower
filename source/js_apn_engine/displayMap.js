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
import {Perm} from "./Permutation.js";

export function formatRowForDisplay(row, render) {
    let html = render.drawDigits ? row : '<span class="ghost-digit">' + row + '</span>';

    // if (true || !render.drawDigits) {
    //     return "";
    // }
    const digitsToGhost = render.huntingLines.concat(render.workingLines);

    console.log("digitsToGhost (huntingLines) = ", render.huntingLines);
    console.log("digitsToGhost = ", digitsToGhost);

    if (render.ghostDigitsUnderBluelines) {
        for (const d of digitsToGhost) {
            console.log(d);
            html = html.replaceAll(d, `<span class="ghost-digit">${d}</span>`);
        }
    }

    const style = row[0] === '1' ? 'perm-cycle-strong' : 'perm-cycle-weak';

    // const cycle_info = '<span class="ghost-digit">' + Perm.fromOneLine(row).permutationStringPretty() + '</span>';
    const cycle_info = `<span class="${style}">` + Perm.fromOneLine(row).permutationStringPretty() + '</span>';
    // const cycle_info = '<span class="perm-cycle">sffsddffs</span>';

    html = html + "  " + cycle_info;
    return html;
}
