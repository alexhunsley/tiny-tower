// import { DEFAULTS, TT_VERSION } from "./defaults.js";
// import { formatRowForDisplay } from "./displayMap.js";
// import {
//     stopAll,
//     pause as pauseAudio,
//     resume as resumeAudio,
//     triggerPlace,   // used by live, note-by-note scheduler
//     initAudioUnlock
// } from "./audioEngine.js";
// import { isSafariFamily } from "./utils.js";
// import { generateList, clampStage, symbolToIndex, roundsForStage, collapsePlaceNotation } from "./notation.js";
// import { renderBlueLineOverlay } from "./blueLine.js";
// import { evaluatePNAndStage, derivePermCycles, count87s, arePermCyclesConsideredDifferential, measureTopPairDistances } from "./newAlg.js";

import {derivePermCycles} from "./newAlg.js";
import {STAGE_SYMBOLS} from "./notation.js";

// console.log("G7:\n\nPlain lead: ", derivePermCycles('1253746'));
//
// console.log("Bob: ", derivePermCycles('1752634'));

// // outputs 1432 -- incorrect wrt PBs -- it's backwards
// console.log(derivePermCycles('4123'));
//
// // outputs 1234 -- incorrect wrt PBs -- it's backwards
// console.log(derivePermCycles('2341'));
//
// // outputs 13, 24 -- correct wrt PBs
// console.log(derivePermCycles('3412'));
//
// // outputs 12, 345 -- correct for 12, incorrect for 345! so yes some sorting thing.
// console.log(derivePermCycles('21453'));

/**
 * Compose a list of permutation cycles into a single cycle.
 * Each cycle is given as a string of symbols, e.g. ["12", "543"].
 *
 * Returns a canonical cycle string (may produce multiple cycles concatenated).
 *
 * @param {string[]} cycles
 * @returns {string}  e.g. "1432"
 */
export function composeCycles(cycles) {
    if (!Array.isArray(cycles) || cycles.length === 0) {
        throw new Error("Expected a non-empty array of cycle strings");
    }

    // --- Build total alphabet (unique symbols across all cycles)
    const alphabet = [...new Set(cycles.join(""))];

    // Helper: build mapping from one cycle string
    function mappingFromCycle(cycleStr) {
        const m = new Map();
        const n = cycleStr.length;
        for (let i = 0; i < n; i++) {
            m.set(cycleStr[i], cycleStr[(i + 1) % n]);
        }
        return m;
    }

    // Start with identity mapping
    const map = new Map(alphabet.map(ch => [ch, ch]));

    // Apply each cycle in sequence to the mapping
    for (const cyc of cycles) {
        const m = mappingFromCycle(cyc);
        for (const ch of alphabet) {
            const image = map.get(ch);
            map.set(ch, m.get(image) ?? image); // stays as image if not moved by this cycle
        }
    }

    // --- Now extract the resulting cycles
    const visited = new Set();
    const outCycles = [];

    for (const start of alphabet) {
        if (visited.has(start)) continue;

        let cur = start;
        const cyc = [];
        while (!visited.has(cur)) {
            visited.add(cur);
            cyc.push(cur);
            cur = map.get(cur);
        }

        if (cyc.length > 1) {
            outCycles.push(cyc.join(""));
        }
    }

    // If everything is fixed: still return something canonical
    if (outCycles.length === 0) {
        return "";
    }

    // --- Return concatenated cycles
    return outCycles.join("");
}

/// named changes

// queens = { cycles: [ '1', '532', '674' ], period: 3 }
console.log("queens =", derivePermCycles('1357246'));


/// GRANDSIRE

// g P = { cycles: [ '1', '2', '46753' ], period: 5 }
const gp = '1253746';
console.log("g P =", derivePermCycles(gp));

// handstroke of lead (lead end)
// g P' = { cycles: [ '1', '352', '74', '6' ], period: 6 }
console.log("g P' =", derivePermCycles('1527364'));

// g - = { cycles: [ '1', '472', '653' ], period: 3 }
const gb = '1752634';
const gb_c = derivePermCycles(gb);
console.log("g - =", gb_c);

// g s = { cycles: [ '1', '473652' ], period: 6 }
const gs = '1572634';
const gs_c = derivePermCycles(gs);
console.log("g s =", gs_c);



// const c1 = composeCycles([gb, gb, gp, gp]);
// const cyc1 = derivePermCycles(c1)
// console.log("BBPP =", c1, cyc1);
//
// const c2 = composeCycles([derivePermCycles(gb), derivePermCycles(gs)]);
// const cyc2 = derivePermCycles(c2)
// console.log("BS =", c2, cyc2);



// ... so I think a sort effect is doing it somewhere in the func.

// come back to this below! Interesting!

// // output all rotations of different stages and the resulting permCycles.
// // This demonstrates how the rotations form factorisation of the stage,
// // and hence e.g. prime stages have no breakdown of cycles: just the number itself
// for (let n = 4; n <= 16; n++) {
//     const base = STAGE_SYMBOLS.slice(0, n);
//
//     console.log("\n\n===================\n", "(", n, ")", base);
//
//     for (let i = 0; i < n; i++) {
//         const rotation = base.slice(i) + base.slice(0, i);
//         const permCycles = derivePermCycles(rotation);
//         // console.log(`${rotation}: ${permCycles}`)
//         console.log("Rot:", rotation, permCycles);
//
//     }
// }
