import {STAGE_SYMBOLS} from "./notation.js";

export function stedmanPNForStage(stage) {
    const tenorSymbol = STAGE_SYMBOLS[stage-1];
    return `3.1.${tenorSymbol}.3.1.3.1.3.${tenorSymbol}.1.3.1`;
}
