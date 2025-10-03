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

// --- Player (manual sequence input) ---
function wirePlayer() {
  el("play").addEventListener("click", async () => {
    const digits = parseDigits(el("seq").value);
    if (digits === null) { updateStatus("invalid (use digits 1–8)"); return; }
    if (!digits.length) { updateStatus("nothing to play"); return; }

    const bpm    = Math.max(30, Math.min(300, Number(el("bpm").value) || 224));
    const strike = Math.max(0.05, Math.min(3,   Number(el("len").value) || 0.6));
    const volume = Math.max(0,    Math.min(1,   Number(el("vol").value) || 0.9));

    await playSequence(digits, { bpm, strike, volume });
    updateStatus(`playing (${digits.length} notes @ ${bpm} BPM)`);
  });

  el("stop").addEventListener("click", () => {
    stopAll();
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
  out.innerHTML = `<ol>${list.map(s => `<li><code>${s}</code></li>`).join("")}</ol>`;
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
    if (!generatedRows.length) {
      const stage = clampStage(el("stage").value);
      generatedRows = generateList({
        pnString: (el("placeNotation").value || "").trim(),
        stage,
      });
      renderGeneratedList(generatedRows);
    }
    if (!generatedRows.length) return;

    // If paused, just resume audio; else start fresh
    if (playState.paused) {
      playState.paused = false;
      await resumeAudio();
      return;
    }
    playState.playing = true;
    playState.paused  = false;
    playState.abort   = false;
    playAllRows().catch(err => console.error(err));
  });

  el("pauseRows").addEventListener("click", async () => {
    if (!playState.playing || playState.paused) return;
    playState.paused = true;
    await pauseAudio();
  });

  el("stopRows").addEventListener("click", () => {
    if (!playState.playing) return;
    playState.abort  = true;
    playState.paused = false;
    playState.playing = false;
    stopAll();
    updateStatus("stopped");
  });
}

// Convert a row string like "123456" or "12340ET" to an array of place indexes [1..12]
function rowToPlaces(row) {
  const out = [];
  for (const ch of row) {
    const idx = symbolToIndex(ch);
    if (idx) out.push(idx);
  }
  return out;
}

async function playAllRows() {
  const bpm    = Math.max(30, Math.min(300, Number(el("bpm").value) || 224));
  const strike = Math.max(0.05, Math.min(3,   Number(el("len").value) || 0.6));
  const volume = Math.max(0,    Math.min(1,   Number(el("vol").value) || 0.9));

  const beat = 60 / bpm; // time between note starts inside a row

  for (let i = 0; i < generatedRows.length; i++) {
    if (playState.abort) break;

    // Pause handling
    while (playState.paused) {
      await sleep(80);
      if (playState.abort) break;
    }
    if (playState.abort) break;

    const row = generatedRows[i];
    const places = rowToPlaces(row);

    // Schedule this row's notes: notes are spaced exactly 1 beat apart.
    await playSequence(places, { bpm, strike, volume });
    updateStatus(`row ${i + 1}/${generatedRows.length} @ ${bpm} BPM`);

    // Compute inter-row delay from the last note START:
    // - base inter-row = 1 beat (same as between notes inside a row)
    // - long gap ("silent bell") = 2 beats total (i.e., an extra beat)
    // Pattern: first gap after rounds (i=0) is long; then alternate short/long...
    if (i < generatedRows.length - 1) {
      const baseBeats = places.length; // waits through the row to 1 beat after last note start
      const longGapExtra = (i % 2 === 0) ? 1 : 0; // i=0 => long gap (2 beats total), else 0 => short gap (1 beat total)
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