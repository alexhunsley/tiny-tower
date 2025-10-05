// defaults.js
export const DEFAULTS = {
  // Core method inputs
  stage: 6,
  placeNotation: "x16x16x16x16x16x12",

  // Playback
  bpm: 224,          // beats per minute
  strike: 1.0,       // seconds (decay length)
  volume: 0.9,       // 0..1

  // UI/behavior (you can tweak these too if you like)
  autoGenerateOnLoad: false,   // set true to auto-generate when URL has no params
  startHighlightAtRow0: true,
};
