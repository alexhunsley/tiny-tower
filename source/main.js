// main.js
import { DEFAULTS } from "./defaults.js";
import { formatRowForDisplay } from "./displayMap.js";
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
import { generateList, clampStage, symbolToIndex, roundsForStage, expandPlaceNotation } from "./notation.js";

function el(id) {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Element #${id} not found. Check index.html IDs and cache.`);
  return n;
}

// Parse, but allow empty/partial during typing
function parseStageLoose(v) {
  const s = String(v ?? "").trim();
  if (s === "") return null;               // allow empty while typing
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

// --- URL <-> controls sync ---
function readURLParams() {
  const q = new URLSearchParams(location.search);
  // URLSearchParams already decodes (so x16x16... is fine)
  const pn = q.get("pn") || "";
  const st = q.get("st");
  const stage = st != null ? Number(st) : null;
  return { pn, stage };
}

function writeURLParams({ pn, stage }) {
  const q = new URLSearchParams(location.search);
  if (pn && pn.trim()) q.set("pn", pn.trim()); else q.delete("pn");
  q.set("st", String(clampStage(stage)));
  const newUrl = `${location.pathname}?${q.toString()}${location.hash}`;
  history.replaceState(null, "", newUrl); // no reload
}

function applyDefaultsToControls() {
  // Only set if empty, so URL values (if any) win
  if (!el("placeNotation").value) el("placeNotation").value = DEFAULTS.placeNotation;
  if (!el("stage").value)         el("stage").value         = DEFAULTS.stage;
  if (!el("bpm").value)           el("bpm").value           = DEFAULTS.bpm;
}

function getLiveBpm()    { return Math.max(30, Math.min(300, Number(el("bpm").value) || DEFAULTS.bpm)); }

// simple debounce to avoid spamming history
function debounce(fn, ms = 250) {
  let t; 
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const writeURLParamsDebounced = debounce(writeURLParams, 250);

// Helpers
function clearRowHighlight() {
  document.querySelectorAll('#notationOutput .row-item.playing')
    .forEach(el => el.classList.remove('playing'));
}
function highlightRow(i) {
  const selector = `#notationOutput .row-item[data-row="${i}"]`;
  const el = document.querySelector(selector);
  if (!el) {
    console.debug("highlightRow: element not found for index", i, "selector:", selector);
    return;
  }
  clearRowHighlight();
  el.classList.add('playing');
  // keep visible without jumping
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* -------------------- Notation + generated rows playback -------------------- */
let generatedRows = [];
const playState = { playing: false, paused: false, abort: false };

function setRowControls({ playing, paused }) {
  el("playRows").disabled  = !!playing && !paused;
  el("pauseRows").disabled = !playing || paused;
  el("stopRows").disabled  = !playing;
}

// Renderer
function renderGeneratedList(list) {
  console.debug("renderGeneratedList");
  const out = el("notationOutput");
  if (!list || !list.length) {
    out.innerHTML = '<em class="muted">— nothing generated —</em>';
    return;
  }
  const stage = clampStage(el("stage").value);

  out.innerHTML = list
    .map((row, i) => {
      const display = formatRowForDisplay(row, stage);
      return `<div class="row-item" data-row="${i}"><code>${display}</code></div>`;
    })
    .join("");
}

function wireNotation() {
  let composingPN = false;

  // Track IME composition so we don't interfere mid-composition (Android keyboards)
  el("placeNotation").addEventListener("compositionstart", () => composingPN = true);
  el("placeNotation").addEventListener("compositionend",   () => composingPN = false);

  // PN: update URL (debounced) only when not composing
  el("placeNotation").addEventListener("input", () => {
    if (composingPN) return;
    const pn = el("placeNotation").value;
    if (pn.trim()) {
      writeURLParamsDebounced({ pn, stage: parseStageLoose(el("stage").value) ?? undefined });
    }
  });

  // Stage: don't clamp on input; allow empty/partial edits
  el("stage").addEventListener("input", () => {
    const raw = el("stage").value;
    const n = parseStageLoose(raw);
    if (n !== null && n >= 1 && n <= 99) {
      // only write URL if plausibly numeric; do NOT clamp here
      writeURLParamsDebounced({ pn: el("placeNotation").value, stage: n });
    }
  });

  // Stage: on blur, normalize to clamped value (so UI is tidy after edit)
  el("stage").addEventListener("blur", () => {
    const n = parseStageLoose(el("stage").value);
    if (n === null) return; // leave empty if user cleared it
    const s = clampStage(n);
    if (String(el("stage").value) !== String(s)) el("stage").value = s;
    writeURLParams({ pn: el("placeNotation").value, stage: s });
  });

  // Generate: validate/clamp once and proceed
  el("generate").addEventListener("click", () => {
    const pnString = (el("placeNotation").value || "").trim();
    const n = parseStageLoose(el("stage").value);
    const stage = clampStage(n == null ? 6 : n);
    el("stage").value = stage; // now it’s safe to normalize

    generatedRows = generateList({ pnString, stage });
    renderGeneratedList(generatedRows);
    clearRowHighlight();

    writeURLParams({ pn: pnString, stage });
    // report

    // const pnString = (document.getElementById("placeNotation").value || "").trim();
    // const s = clampStage(document.getElementById("stage").value);

    const maxLeads = 12; // or your existing safety value
    generatedRows = generateList({ pnString, stage: stage, maxLeads });
    renderGeneratedList(generatedRows);

    const lines = buildGenerationReport({
      pnString,
      stage: stage,
      rows: generatedRows,
      maxLeads
    });
    renderReport(lines);
  });

  el("playRows").addEventListener("click", async () => {
    if (playState.playing && !playState.paused) return; // prevent double start

    if (!generatedRows.length) {
      const stage = clampStage(el("stage").value);
      generatedRows = generateList({ pnString: (el("placeNotation").value || "").trim(), stage });
      renderGeneratedList(generatedRows);
      clearRowHighlight();
      writeURLParams({ pn: el("placeNotation").value, stage });
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
    clearRowHighlight();
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

    highlightRow(i);
    console.debug("Playing row", i, generatedRows[i]);

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

      await triggerPlace(places[k], {});

      // Wait exactly 1 beat between notes INSIDE the row,
      // but not after the final note — that’s what caused the gap regression.
      if (k < places.length - 1) {
        await waitBeatsDynamic(1, checkPausedAbort);
      }
    }

    // INTER-ROW GAPS (from last note START of row i to first note START of row i+1):
    // - short gap: 1 beat
    // - long gap (silent bell): 2 beats
    // Start with LONG after rounds (i=0), then alternate: 2,1,2,1,...
    if (i < generatedRows.length - 1) {
      const gapBeats = (i % 2 === 0) ? 2 : 1;
      await waitBeatsDynamic(gapBeats, checkPausedAbort);
    }
  }

  clearRowHighlight();
    

  playState.playing = false;
  playState.paused  = false;
  playState.abort   = false;
  setRowControls({ playing: false, paused: false });
}

/* -------------------- init -------------------- */
function init() {
  try {
    // Ensure required elements exist
    [
      "bpm","placeNotation","stage","generate","notationOutput",
      "playRows","pauseRows","stopRows"
    ].forEach(id => el(id));

    // Prefill from URL, then fill any blanks from DEFAULTS
    const { pn, stage } = readURLParams();
    if (pn) el("placeNotation").value = pn;
    if (stage != null) el("stage").value = clampStage(stage);
    applyDefaultsToControls(); // uses DEFAULTS.* for any empty fields

    // Auto-generate rows if URL provided pn/stage; otherwise respect DEFAULTS flag
    if (pn || stage != null || DEFAULTS.autoGenerateOnLoad) {
      const s = clampStage(el("stage").value);
      generatedRows = generateList({ pnString: (el("placeNotation").value || "").trim(), stage: s });
      renderGeneratedList(generatedRows);
      clearRowHighlight();
    }

    // Wire up UI
    wireNotation();

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

// report

function renderReport(lines) {
  const box = document.getElementById("reportPanel");
  if (!lines || !lines.length) {
    box.innerHTML = '<span class="muted">No report.</span>';
    return;
  }
  box.innerHTML = lines.map(s => {
    // allow lightweight color tags via prefixes
    if (s.startsWith("[WARN]")) return `<div class="warn">${s.slice(6)}</div>`;
    if (s.startsWith("[OK]"))   return `<div class="ok">${s.slice(4)}</div>`;
    return `<div>${s}</div>`;
  }).join("");
}

function buildGenerationReport({ pnString, stage, rows, maxLeads = 12 }) {
  const lines = [];
  const s = clampStage(stage);
  const rounds = roundsForStage(s);
  const tokens = expandPlaceNotation(pnString, s);
  const steps = Math.max(0, rows.length - 1);
  const leadLen = Math.max(1, tokens.length);
  const fullLeads = Math.floor(steps / leadLen);
  const remainder = steps % leadLen;
  const returned = rows.length > 0 && rows[rows.length - 1] === rounds;

  // Facts
  lines.push(`Length: ${rows.length - 1}`);
  lines.push(`Leads: ${fullLeads}` + (remainder ? ` + ${remainder} steps` : ""));

  // --- Duplicate row detection (includes early rounds) ---
  if (Array.isArray(rows) && rows.length > 1) {
    const firstIndex = new Map();   // row -> first index seen
    let earlyRoundsAt = null;       // index where rounds reappears (not last)
    let repeatCount = 0;
    const samples = [];             // capture a few examples to show

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (firstIndex.has(r)) {
        repeatCount++;
        const j = firstIndex.get(r);
        if (samples.length < 3) samples.push({ row: r, first: j, again: i });

        if (r === rounds && i !== rows.length - 1 && earlyRoundsAt === null) {
          earlyRoundsAt = i;
        }
      } else {
        firstIndex.set(r, i);
      }
    }

    if (earlyRoundsAt !== null) {
      const leadIdx = Math.floor(earlyRoundsAt / leadLen);       // 0-based lead index
      const stepInLead = earlyRoundsAt % leadLen;                // step within lead
      lines.push(
        `[WARN] Rounds occurred early at step ${earlyRoundsAt} (lead ${leadIdx}, step ${stepInLead}).`
      );
    }

    if (repeatCount > 0) {
      lines.push(
        `[WARN] Detected repeated rows (${repeatCount} repeats). This can indicate falseness or cycling before cutoff.`
      );
      samples.forEach(({ row, first, again }) => {
        const leadA = Math.floor(first / leadLen), stepA = first % leadLen;
        const leadB = Math.floor(again / leadLen), stepB = again % leadLen;
        lines.push(
          `  · "${row}" repeated: first at step ${first} (lead ${leadA}, step ${stepA}), again at step ${again} (lead ${leadB}, step ${stepB})`
        );
      });
    }
  }

  // Warnings / OK
  if (!returned) {
    lines.push(`[WARN] Did not return to rounds within safety cutoff of ${maxLeads} leads.`);
  }

  // Heuristics: commas / semicolon usage
  if (pnString && pnString.includes(";")) {
    lines.push("[OK] Semicolon mode detected (special mirroring).");
  }
  if (pnString && pnString.includes(",")) {
    lines.push("[OK] Comma-separated segments with palindromic mirroring.");
  }

  return lines;
}
