// main.js
import {
  playSequence,   // still used by manual player
  stopAll,
  testBeep,
  setVolume,
  pause as pauseAudio,
  resume as resumeAudio,
  triggerPlace,   // used by live, note-by-note scheduler
} from "./audioEngine.js";
import { parseDigits } from "./utils.js";
import { generateList, clampStage, symbolToIndex } from "./notation.js";

function el(id) {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Element #${id} not found. Check index.html IDs and cache.`);
  return n;
}
function updateStatus(text) { el("status").textContent = text; }

/* -------------------- Manual player (sequence box) -------------------- */
let manualPlaying = false;
let manualTimer = null;

function setManualControls({ playing }) {
  el("play").disabled = !!playing;
}
function wirePlayer() {
  el("play").addEventListener("click", async () => {
    if (manualPlaying) return; // prevent double start

    const digits = parseDigits(el("seq").value);
    if (digits === null) { updateStatus("invalid (use digits 1–8)"); return; }
    if (!digits.length) { updateStatus("nothing to play"); return; }

    const bpm    = Math.max(30, Math.min(300, Number(el("bpm").value) || 224));
    const strike = Math.max(0.05, Math.min(3,   Number(el("len").value) || 0.6));
    const volume = Math.max(0,    Math.min(1,   Number(el("vol").value) || 0.9));

    manualPlaying = true;
    setManualControls({ playing: true });

    await playSequence(digits, { bpm, strike, volume });
    updateStatus(`playing (${digits.length} notes @ ${bpm} BPM)`);

    // Estimate end to re-enable Play
    const beat = 60 / bpm;
    const estMs = (digits.length * beat + 0.2) * 1000;
    clearTimeout(manualTimer);
    manualTimer = setTimeout(() => {
      manualPlaying = false;
      setManualControls({ playing: false });
      updateStatus("idle");
    }, estMs);
  });

  el("stop").addEventListener("click", () => {
    stopAll();
    manualPlaying = false;
    clearTimeout(manualTimer);
    setManualControls({ playing: false });
    updateStatus("stopped");
  });

  el("beep").addEventListener("click", async () => {
    await testBeep();
    updateStatus("beep");
  });

  el("vol").addEventListener("input", (e) => {
    const v = Math.max(0, Math.min(1, Number(e.target.value) || 0.9));
    setVolume(v);
  });

  el("seq").value = "12345678";
  setManualControls({ playing: false });
}

/* -------------------- Notation + generated rows playback -------------------- */
let generatedRows = [];
const playState = { playing: false, paused: false, abort: false };

function setRowControls({ playing, paused }) {
  el("playRows").disabled  = !!playing && !paused;
  el("pauseRows").disabled = !playing || paused;
  el("stopRows").disabled  = !playing;
}

function renderGeneratedList(list) {
  const out = el("notationOutput");
  if (!list || !list.length) {
    out.innerHTML = '<em class="muted">— nothing generated —</em>';
    return;
  }
  const stage = clampStage(el("stage").value);
  // Strictly show stage-length rows (no tenor in UI)
  out.innerHTML = list.map(s => `<div><code>${s.slice(0, stage)}</code></div>`).join("");
}

function wireNotation() {
  el("generate").addEventListener("click", () => {
    const pnString = (el("placeNotation").value || "").trim();
    const stage = clampStage(el("stage").value);
    el("stage").value = stage;
    generatedRows = generateList({ pnString, stage });
    renderGeneratedList(generatedRows);
  });

  el("playRows").addEventListener("click", async () => {
    if (playState.playing && !playState.paused) return; // prevent double start

    if (!generatedRows.length) {
      const stage = clampStage(el("stage").value);
      generatedRows = generateList({ pnString: (el("placeNotation").value || "").trim(), stage });
      renderGeneratedList(generatedRows);
    }
    if (!generatedRows.length) return;

    if (playState.paused) {
      playState.paused = false;
      setRowControls({ playing: true, paused: false });
      await resumeAudio();
      return;
    }

    playState.playing = true;
    playState.paused  = false;
    playState.abort   = false;
    setRowControls({ playing: true, paused: false });
    playAllRows().catch(err => console.error(err));
  });

  el("pauseRows").addEventListener("click", async () => {
    if (!playState.playing || playState.paused) return;
    playState.paused = true;
    setRowControls({ playing: true, paused: true });
    await pauseAudio();
  });

  el("stopRows").addEventListener("click", () => {
    if (!playState.playing) return;
    playState.abort  = true;
    playState.paused = false;
    playState.playing = false;
    setRowControls({ playing: false, paused: false });
    stopAll();
    updateStatus("stopped");
  });

  setRowControls({ playing: false, paused: false });
}

// Map a row string to GLOBAL bell indexes [1..12] for playback.
// Odd stages: append a cover bell (lowest of the mapped set) for playback only.
// Mapping: effectiveStage M = evenized stage (stage or stage+1).
// Local 1..M → global (12 - M) + local (deepest M).
function rowToPlaces(row, stage) {
  const effectiveStage = (stage % 2 === 0) ? stage : stage + 1;
  const offset = 12 - effectiveStage;
  const out = [];

  for (const ch of row) {
    const local = symbolToIndex(ch);
    if (!local) continue;
    if (local < 1 || local > stage) continue; // ignore symbols outside stage (defensive)
    const global = offset + local;
    if (global >= 1 && global <= 12) out.push(global);
  }

  if (stage % 2 === 1) {
    const coverGlobal = offset + effectiveStage; // lowest of the mapped set
    if (coverGlobal >= 1 && coverGlobal <= 12) out.push(coverGlobal);
  }
  return out;
}

/* -------------------- Live, note-by-note scheduler -------------------- */

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

// Wait for a number of beats, reading BPM live and respecting pause/abort
async function waitBeatsDynamic(beatsTarget, checkPausedAbort) {
  let elapsedBeats = 0;
  let last = performance.now();
  while (elapsedBeats < beatsTarget) {
    if (checkPausedAbort("abort")) return;
    while (checkPausedAbort("paused")) {
      await sleep(60);
      if (checkPausedAbort("abort")) return;
      last = performance.now(); // reset timing after pause
    }
    await sleep(20);
    const now = performance.now();
    const dtSec = (now - last) / 1000;
    last = now;

    const bpm = Math.max(30, Math.min(300, Number(el("bpm").value) || 224));
    const secPerBeat = 60 / bpm;
    elapsedBeats += dtSec / secPerBeat;
  }
}

async function playAllRows() {
  const stage  = clampStage(el("stage").value);
  const volume = Math.max(0, Math.min(1, Number(el("vol").value) || 0.9));

  const checkPausedAbort = (mode) => {
    if (mode === "abort") return playState.abort;
    if (mode === "paused") return playState.paused;
    return playState.abort || playState.paused;
  };

  for (let i = 0; i < generatedRows.length; i++) {
    if (playState.abort) break;

    // Respect pause before each row
    while (playState.paused) {
      await sleep(60);
      if (playState.abort) break;
    }
    if (playState.abort) break;

    const row = generatedRows[i];
    const places = rowToPlaces(row, stage);

    // NOTE-BY-NOTE: re-read BPM/Strike live; DO NOT wait after the last note here
    for (let k = 0; k < places.length; k++) {
      if (playState.abort) break;
      while (playState.paused) {
        await sleep(60);
        if (playState.abort) break;
      }
      if (playState.abort) break;

      const strike = Math.max(0.05, Math.min(3, Number(el("len").value) || 0.6));
      await triggerPlace(places[k], { strike, volume });

      // Wait exactly 1 beat between notes INSIDE the row,
      // but not after the final note — that’s what caused the gap regression.
      if (k < places.length - 1) {
        await waitBeatsDynamic(1, checkPausedAbort);
      }
    }

    updateStatus(`row ${i + 1}/${generatedRows.length}`);

    // INTER-ROW GAPS (from last note START of row i to first note START of row i+1):
    // - short gap: 1 beat
    // - long gap (silent bell): 2 beats
    // Start with LONG after rounds (i=0), then alternate: 2,1,2,1,...
    if (i < generatedRows.length - 1) {
      const gapBeats = (i % 2 === 0) ? 2 : 1;
      await waitBeatsDynamic(gapBeats, checkPausedAbort);
    }
  }

  if (!playState.abort) updateStatus("done");
  playState.playing = false;
  playState.paused  = false;
  playState.abort   = false;
  setRowControls({ playing: false, paused: false });
}

/* -------------------- init -------------------- */
function init() {
  try {
    [
      "seq","play","stop","beep","status","bpm","len","vol",
      "placeNotation","stage","generate","notationOutput",
      "playRows","pauseRows","stopRows"
    ].forEach(id => el(id));

    wirePlayer();
    wireNotation();
    updateStatus("idle");
  } catch (err) {
    console.error(err);
    alert(err.message + "\n\nTip: hard-reload (Ctrl+F5 / Cmd+Shift+R) to bust cache.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}