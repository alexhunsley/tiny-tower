// defaults.js
export const DEFAULTS = {
  // Core method inputs
  stage: 6,
  placeNotation: "x16x16x16x16x16x16",

  // Playback
  bpm: 230,          // beats per minute
  strike: 1.1,       // seconds (decay length)
  volume: 0.25,       // 0..1

  // UI/behavior (you can tweak these too if you like)
  autoGenerateOnLoad: false,   // set true to auto-generate when URL has no params
  startHighlightAtRow0: true,
};
