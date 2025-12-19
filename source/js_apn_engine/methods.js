import {expandPlaceNotation, STAGE_SYMBOLS} from "./notation.js";
import {isSafariFamily, arraysEqual} from "./utils.js";

export function stedmanPNForStage(stage) {
    const tenorSymbol = STAGE_SYMBOLS[stage-1];
    return `3.1.${tenorSymbol}.3.1.3.1.3.${tenorSymbol}.1.3.1`;
}

export function isStedman(pnTokens, stage) {
    const stedmanFullPN = stedmanPNForStage(stage);
    const stedmanFullPNList = expandPlaceNotation(stedmanFullPN, stage)
    // console.log("Comparing: ", pnTokens, stedmanFullPNList, " isStedman = ", isStedman);
    return arraysEqual(pnTokens, stedmanFullPNList);
}
