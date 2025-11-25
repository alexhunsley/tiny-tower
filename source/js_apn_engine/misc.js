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
import {reverseString} from "./newAlg.util.js";

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
 * Convert a list of cycle strings into a mapping value -> image.
 *
 * Example: ["472","653"] means (4 7 2)(6 5 3)
 */
function cyclesToMapping(cycles) {
    const mapping = new Map();

    for (const cyc of cycles) {
        const n = cyc.length;
        if (n === 0) continue;
        for (let i = 0; i < n; i++) {
            const from = cyc[i];
            const to   = cyc[(i + 1) % n];
            mapping.set(from, to);
        }
    }

    return mapping;
}

/**
 * Convert a mapping back into an array of cycle strings.
 * `alphabet` controls which symbols to consider and in what order.
 */
function mappingToCycles(mapping, alphabet) {
    const visited = new Set();
    const cycles = [];

    for (const start of alphabet) {
        if (visited.has(start)) continue;

        let cur = start;
        const cyc = [];
        while (!visited.has(cur)) {
            visited.add(cur);
            cyc.push(cur);
            const next = mapping.get(cur) ?? cur; // identity if not moved
            cur = next;
        }

        if (cyc.length > 1) {
            cycles.push(cyc.join(""));
        } else {
            // 1-cycle: record it explicitly as a string of length 1
            cycles.push(cyc[0]);
        }
    }

    return cycles;
}

/**
 * Compose two permutations P and Q given as arrays of cycle strings.
 * Returns an array of cycle strings for Q ∘ P (apply P first, then Q).
 *
 * Example:
 *   P = ["1","472","653"]
 *   Q = ["1","473652"]
 *   composePerms(P, Q)  // => ["1","435627"]
 */
export function composeCycles(pCycles, qCycles) {
    // Alphabet: all symbols that appear anywhere, in first-seen order
    const alphabet = [
        ...new Set(pCycles.join("") + qCycles.join(""))
    ];

    // Build mapping for P and Q
    const mapP = cyclesToMapping(pCycles);
    const mapQ = cyclesToMapping(qCycles);

    // Compose: (Q ∘ P)(x) = Q(P(x))
    const composed = new Map();
    for (const x of alphabet) {
        const y = mapP.get(x) ?? x;      // P(x)
        const z = mapQ.get(y) ?? y;      // Q(P(x))
        composed.set(x, z);
    }

    // Turn mapping back into cycle strings
    return mappingToCycles(composed, alphabet);
}

// compose an array of permutations, each as array-of-cycle-strings
export function composeManyCycles(listOfPerms) {
    if (listOfPerms.length === 0) {
        throw new Error("Need at least one permutation");
    }
    return listOfPerms.reduce((acc, perm) => composeCycles(acc, perm));
}

/**
 * Given a list of cycle strings (e.g. ["12","34"]),
 * return the one-line permutation string, assuming
 * the underlying set is {1,2,...,maxSymbol}.
 *
 * Example: ["12","34"] → "2143"  (1→2, 2→1, 3→4, 4→3)
 */
function cyclesToPermutationString(cycles) {
    // Find the highest symbol used: assumed to be digits ("1","2",...)
    const maxSymbol = Math.max(...cycles.join("").split("").map(Number)) || 0;

    // Start with identity mapping
    const map = {};
    for (let i = 1; i <= maxSymbol; i++) {
        map[i] = String(i);
    }

    // Apply each cycle
    for (const cycIn of cycles) {
        // note we reverse, because we want perms to be PB order
        // (we also reverse when converting the other way)
        const cyc = reverseString(cycIn);
        const n = cyc.length;
        for (let i = 0; i < n; i++) {
            const from = cyc[i];
            const to   = cyc[(i + 1) % n];
            map[from] = to;
        }
    }

    // Build the final one-line permutation string
    let result = "";
    for (let i = 1; i <= maxSymbol; i++) {
        result += map[i];
    }
    return result;
}

const rep = (n, x) => Array(n).fill(x);

/// named changes

// queens = { cycles: [ '1', '532', '674' ], period: 3 }
console.log("queens =", derivePermCycles('1357246'));


/// GRANDSIRE

// g P = { cycles: [ '1', '2', '46753' ], period: 5 }
const gp = '1253746';
const gp_c = derivePermCycles(gp).cycles;
console.log("g P =", gp_c);

// handstroke of lead (lead end)
// g P' = { cycles: [ '1', '352', '74', '6' ], period: 6 }
console.log("g P' =", derivePermCycles('1527364'));


// g - = { cycles: [ '1', '472', '653' ], period: 3 }
const gb = '1752634';
const gb_c = derivePermCycles(gb).cycles;
console.log("gb_c - =", gb_c);

// g s = { cycles: [ '1', '473652' ], period: 6 }
const gs = '1572634';
const gs_c = derivePermCycles(gs).cycles;
console.log("gs_c =", gs_c);


// const c1 = composeCycles([gb, gb, gp, gp]);
// const cyc1 = derivePermCycles(c1)
// console.log("BBPP =", c1, cyc1);

const repo = rep(5, gp_c);
console.log("repo = ", repo);

// expect a plain course (no change)
const compPx7 = composeManyCycles(repo);
console.log("compPx7 = ", compPx7);

const compBBPP = composeManyCycles([gb_c, gb_c, gp_c, gp_c]);
console.log("compBBPP = ", compBBPP, cyclesToPermutationString(compBBPP));

const compPBBP = composeManyCycles([gp_c, gb_c, gb_c, gp_c]);
console.log("compPBBP = ", compPBBP, cyclesToPermutationString(compPBBP));
// mixes in the 7! splitty
const compPPBB = composeManyCycles([gp_c, gp_c, gb_c, gb_c]);
console.log("compPPBB = ", compPPBB, cyclesToPermutationString(compPPBB));

// moves the 6 (splitty)
const compBSPP = composeManyCycles([gb_c, gs_c, gp_c, gp_c]);
console.log("compBSPP = ", compBSPP, cyclesToPermutationString(compBSPP));

const compPBSP = composeManyCycles([gp_c, gb_c, gs_c, gp_c]);
console.log("compPBSP = ", compPBSP, cyclesToPermutationString(compPBSP));

// mixes in 7
const compPPBS = composeManyCycles([gp_c, gp_c, gb_c, gs_c]);
console.log("compPPBS = ", compPPBS, cyclesToPermutationString(compPPBS));

// mixes in 7 and 6, into sep groups (7 in a triple, 6 in a pair)
const compPPSB = composeManyCycles([gp_c, gp_c, gs_c, gb_c]);
console.log("compPPSB = ", compPPSB, cyclesToPermutationString(compPPSB));

// swaps 23 and 67. over cycle 2
const compBPBP = composeManyCycles([gb_c, gp_c, gb_c, gp_c]);
console.log("compBPBP = ", compBPBP, cyclesToPermutationString(compBPBP));


// const compBBPPx2 = composeManyCycles([gb_c, gb_c, gp_c, gp_c,  gb_c, gb_c, gp_c, gp_c]);
// console.log("compBBPPx2 = ", compBBPPx2, cyclesToPermutationString(compBBPPx2));
//
// const compBBPPx3 = composeManyCycles([gb_c, gb_c, gp_c, gp_c,  gb_c, gb_c, gp_c, gp_c,   gb_c, gb_c, gp_c, gp_c]);
// console.log("compBBPPx3 = ", compBBPPx3, cyclesToPermutationString(compBBPPx3));

// swaps 67 and rots 253
const compPSBP = composeManyCycles([gp_c, gs_c, gb_c, gp_c]);
console.log("compPSBP = ", compPSBP, cyclesToPermutationString(compPSBP));


// this works, flips 67 overall, so a two part.
const tryMix = composeManyCycles([compPBSP, compPSBP]);
console.log(tryMix, cyclesToPermutationString(tryMix));

// swap 45 and 36
const compPSPBS = composeManyCycles([gp_c, gs_c, gp_c, gb_c, gs_c]);
console.log("compPSPBS = ", compPSPBS, cyclesToPermutationString(compPSPBS));

// console.log("tryMix = ", tryMix, cyclesToPermutationString(tryMix));

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
