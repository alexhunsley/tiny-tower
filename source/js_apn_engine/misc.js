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

// outputs 1432 -- incorrect wrt PBs -- it's backwards
console.log(derivePermCycles('4123'));

// outputs 1234 -- incorrect wrt PBs -- it's backwards
console.log(derivePermCycles('2341'));

// outputs 13, 24 -- correct wrt PBs
console.log(derivePermCycles('3412'));

// outputs 12, 345 -- correct for 12, incorrect for 345! so yes some sorting thing.
console.log(derivePermCycles('21453'));


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
