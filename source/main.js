// main.js
import {
  playSequence,
  stopAll,
  testBeep,
  setVolume,
  pause as pauseAudio,
  resume as resumeAudio,
} from "./audioEngine.js";
import { parseDigits } from "./utils.js";
import { generateList, clampStage, symbolToIndex } from "./notation.js";

function el(id) {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Element #${id} not found. Check index.html IDs and cache.`);
  return n;
}
function updateStatus(text) { el("status").textContent = text; }

// --- UI state helpers ---
function setManualControls({ playing }) {
  el("play").disabled = !!playing;
  // Stop/Beep stay available for manual case
}
function setRowControls({ playing, paused }) {
  el("playRows").disabled  = !!playing && !paused;  // disabled if actively playing
  el("pauseRows").disabled = !playing || paused;    // can pause only when playing & not paused
  el("stopRows").disabled  = !playing;              // stop only when playing
}

// --- Player (manual sequence input) ---
let manualPlaying = false;
let manualTimer = null;

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

    // Estimate when manual playback ends to re-enable the button
    const beat = 60 / bpm;
    const estMs = (digits.length * beat + 0.2) * 1000; // 0.2s small tail
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

// --- Notation generation + playback of generated rows ---
let generatedRows = [];
const playState = { playing: false, paused: false, abort: false };

function renderGeneratedList(list) {
  const out = el("notationOutput");
  if (!list || !list.length) {
    out.innerHTML = '<em class="muted">— nothing generated —</em>';
    return;
  }
  // Un-numbered rows (no prefixes)
  out.innerHTML = list.map(s => `<div><code>${s}</code></div>`).join("");
}

function wireNotation() {
  el("generate").addEventListener("click", () => {
    const pnString = (el("placeNotation").value || "").trim();
    const stage = clampStage(el("stage").value);
    el("stage").value = stage; // normalize
    generatedRows = generateList({ pnString, stage });
    renderGeneratedList(generatedRows);
  });

  el("playRows").addEventListener("click", async () => {
    // Prevent double start: if already playing and not paused, ignore
    if (playState.playing && !playState.paused) return;

    if (!generatedRows.length) {
      const stage = clampStage(el("stage").value);
      generatedRows = generateList({
        pnString: (el("placeNotation").value || "").trim(),
        stage,
      });
      renderGeneratedList(generatedRows);
    }
    if (!generatedRows.length) return;

    if (playState.paused) {
      playState.paused = false;
      setRowControls({ playing: true, paused: false });
      await resumeAudio();
      return;
    }

    // Start fresh
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

// Convert a row string (e.g. "123456") to GLOBAL bell indexes [1..12],
// mapping stage N → deepest N bells: offset = 12 - N, so local 1..N → (offset+1)..12
function rowToPlaces(row, stage) {
  const offset = 12 - stage; // stage 6 -> +6 => 1..6 -> 7..12   | stage 4 -> +8 => 1..4 -> 9..12
  const out = [];
  for (const ch of row) {
    const local = symbolToIndex(ch); // 1..stage
    if (!local) continue;
    const global = offset + local;   // 1..12
    if (global >= 1 && global <= 12) out.push(global);
  }
  return out;
}

async function playAllRows() {
  const bpm    = Math.max(30, Math.min(300, Number(el("bpm").value) || 224));
  const strike = Math.max(0.05, Math.min(3,   Number(el("len").value) || 0.6));
  const volume = Math.max(0,    Math.min(1,   Number(el("vol").value) || 0.9));
  const stage  = clampStage(el("stage").value);

  const beat = 60 / bpm; // time between note starts inside a row

  for (let i = 0; i < generatedRows.length; i++) {
    if (playState.abort) break;

    while (playState.paused) {
      await sleep(80);
      if (playState.abort) break;
    }
    if (playState.abort) break;

    const row = generatedRows[i];
    const places = rowToPlaces(row, stage); // <-- pass stage here

    await playSequence(places, { bpm, strike, volume });
    updateStatus(`row ${i + 1}/${generatedRows.length} @ ${bpm} BPM`);

    if (i < generatedRows.length - 1) {
      // Inter-row timing: same rules as before
      const baseBeats = places.length;              // to 1 beat after last note start
      const longGapExtra = (i % 2 === 0) ? 1 : 0;   // long gap after rounds, then alternate
      const totalBeats = baseBeats + longGapExtra;

      let waitedMs = 0;
      const waitMs = totalBeats * beat * 1000;
      while (waitedMs < waitMs) {
        if (playState.abort) break;
        while (playState.paused) {
          await sleep(80);
          if (playState.abort) break;
        }
        if (playState.abort) break;
        const chunk = Math.min(100, waitMs - waitedMs);
        await sleep(chunk);
        waitedMs += chunk;
      }
    }
  }

  if (!playState.abort) updateStatus("done");
  playState.playing = false;
  playState.paused  = false;
  playState.abort   = false;
  setRowControls({ playing: false, paused: false });
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

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