// main.js
import { DEFAULTS } from "./defaults.js";
import { formatRowForDisplay } from "./displayMap.js";
import {
  stopAll,
  pause as pauseAudio,
  resume as resumeAudio,
  triggerPlace,   // used by live, note-by-note scheduler
  initAudioUnlock
} from "./audioEngine.js";
import { isSafariFamily } from "./utils.js";
import { generateList, clampStage, symbolToIndex, roundsForStage, collapsePlaceNotation } from "./notation.js";
import { renderBlueLineOverlay } from "./blueLine.js";
import { evaluatePNAndStage, derivePermCycles, count87s, arePermCyclesConsideredDifferential, measureTopPairDistances } from "./newAlg.js";

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

// function getLiveBpm()    { return Math.max(30, Math.min(300, Number(el("bpm").value) || DEFAULTS.bpm)); }

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
    console.log("highlightRow: element not found for index", i, "selector:", selector);
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
function renderGeneratedList(list, blueLines = ["2"]) {
  console.log("renderGeneratedList: list len = ", list.length, " blueLines = ", blueLines);
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

  const blueLineContainer = document.getElementById("notationOutput");
  if (!blueLineContainer) throw new Error("blueLine: couldn't get blueLineContainer in main.js");

  console.log("renderGeneratedList: list len 2 = ", list.length);

  // stage 9 to render 3 lines (differential):
  //    7.14589
  const lineColors = [
    "deepskyblue",
    "tomato",
    "limegreen",
    "gold",
    "orchid",
    "cyan",
    "orange",
  ];

  blueLines.forEach((targetChar, i) => {
    const color = lineColors[i % lineColors.length];
    renderBlueLineOverlay({
        scroller: blueLineContainer,
        rows: list,
        // targetChar: "1",                 // e.g. bell 2; later can be a user choice
        // options: { color: "red", width: 2 }
        targetChar: targetChar, // "2",                 // e.g. bell 2; later can be a user choice
        options: { color: color, width: 2 }
      });
  });
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
    console.log(" PART 2: updating stage from control to ", n);
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

  // Generate: validate/clamp once and proceed (now uses centralized flow)
  el("generate").addEventListener("click", () => {
    const pnString = (el("placeNotation").value || "").trim();
    const n = parseStageLoose(el("stage").value);
    const stage = clampStage(n == null ? 6 : n);
    el("stage").value = stage; // normalize

    console.log(" PART 1: updating UI control for stage to ", stage);
    generateAndRender({ pnString, stageFromUI: stage });
    writeURLParams({ pn: pnString, stage });
  });

  el("playRows").addEventListener("click", async () => {
    if (playState.playing && !playState.paused) return; // prevent double start

    if (!generatedRows.length) {
      const stage = clampStage(el("stage").value);
      const pnString = (el("placeNotation").value || "").trim();
      // Use the same centralized flow so report/overlay are consistent
      generateAndRender({ pnString });
      writeURLParams({ pn: pnString, stage });
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
  const maxPlace = 12;
  const effectiveStage = (stage % 2 === 0) ? stage : stage + 1;
  const offset = maxPlace - effectiveStage;
  const out = [];

  for (const ch of row) {
    const local = symbolToIndex(ch);
    if (!local) continue;
    if (local < 1 || local > stage) continue; // ignore symbols outside stage (defensive)
    const global = offset + local;
    if (global >= 1 && global <= maxPlace) out.push(global);
  }

  if (stage % 2 === 1) {
    const coverGlobal = offset + effectiveStage; // lowest of the mapped set
    if (coverGlobal >= 1 && coverGlobal <= maxPlace) out.push(coverGlobal);
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

/* -------------------- Centralized generate + render (rows, overlay, report) -------------------- */
function generateAndRender({ pnString, stageFromUI, maxChanges = 6000 }) {
  console.log(">> Entered generateAndRender() with pnString = ", pnString, " stageFromUI = ", stageFromUI);

  const { pnTokens} = evaluatePNAndStage(pnString, stageFromUI) ?? {};

  const s = clampStage(stageFromUI);

  console.log("pnTokens = ", pnTokens, " pnString = ", pnString);

  // generatedRows = generateList(pnString, stage);

  generatedRows = generateList({ leadTokens: pnTokens, stage: s, maxChanges: 6000 });

  console.log("generatedRows = ", generatedRows);

  const {reportLines, blueLineIndexes} = buildGenerationReport({
    pnTokens,
    stage: s,
    rows: generatedRows,
    maxChanges
  });
  renderReport(reportLines);

  // const blueLineIndexes = [1, 7, 8];
  // console.log("================ got blueLine indexes = ", blueLineIndexes, " report lines = ", reportLines);

  renderGeneratedList(generatedRows, blueLineIndexes);
  clearRowHighlight();

  return generatedRows;
}

function init() {
  try {
    [
      "bpm","placeNotation","stage","generate","notationOutput",
      "playRows","pauseRows","stopRows","reportPanel"
    ].forEach(id => el(id));

    const { pn, stage } = readURLParams();
    if (pn) el("placeNotation").value = pn;
    if (stage != null) el("stage").value = clampStage(stage);
    applyDefaultsToControls();

    initAudioUnlock();

    if (pn && stage != null && DEFAULTS.autoGenerateOnLoad) {
      const s = clampStage(el("stage").value);
      const pnString = (el("placeNotation").value || "").trim();
      generateAndRender({ pnString, stageFromUI: s });

      /* --- autoplay */

      const q = new URLSearchParams(location.search);
      const autoPlay = q.get("autoPlay");
      console.log(">>>> init: pn, stage, autoGenerateOnLoad = ", pn, stage, DEFAULTS.autoGenerateOnLoad, " autoPlay = ", autoPlay);

      if (autoPlay === "1") {
        if (isSafariFamily()) {
          console.log("Safari detected — skipping autoplay (gesture block)");
          // Optional: show a small banner/button prompting the user to press Play
          // el("playHint").classList.remove("hidden");
        } else {
          console.log("Non-safari detected, autoplaying");
          // kick playback after render (desktop Chromium/Firefox, iOS Chrome still requires gesture)
          setTimeout(() => el("playRows").click(), 300);
        }
      }
    }
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

function renderReport(lines) {
  const box = document.getElementById("reportPanel");
  if (!lines || !lines.length) {
    box.innerHTML = '<span class="muted">No report.</span>';
    return;
  }
  console.log(">>>>>>>>> Lines: ", lines);
  box.innerHTML = lines.map(s => {
    // allow lightweight color tags via prefixes
    if (s.startsWith("[ALERT]")) return `<div class="alert">${s.slice(7)}</div>`;
    if (s.startsWith("[WARN]")) return `<div class="warn">${s.slice(6)}</div>`;
    if (s.startsWith("[OK]"))   return `<div class="ok">${s.slice(4)}</div>`;
    return `<div>${s}</div>`;
  }).join("");
}

// herus
function buildGenerationReport({ pnTokens, stage, rows, maxChanges = 6000 }) {

  console.log("buildGenerationReport, pnTokens = ", pnTokens, " stage = ", stage);

  console.log(" calling evaluateExpressionInternal....");

  const lines = [];
  // const s = clampStage(resolvedStage);
  const rounds = roundsForStage(stage);

  // const tokens = expandPlaceNotation(pnString, s);
  console.log("pnTokens = ", pnTokens);

  const fullPN = collapsePlaceNotation(pnTokens);
  const steps = Math.max(0, rows.length - 1);
  const leadLen = Math.max(1, pnTokens.length);
  const fullLeads = Math.floor(steps / leadLen);
  const remainder = steps % leadLen;
  const returned = rows.length > 0 && rows[rows.length - 1] === rounds;
  const firstLeadEndRow = rows[leadLen];

  // return {rows: ["12345678"], blueLineIndexes: [1]};


  // Facts
  lines.push(`Length: ${rows.length - 1}`);
  lines.push(`Lead length: ${leadLen}`);
  lines.push(`Leads: ${fullLeads}` + (remainder ? ` + ${remainder} steps` : ""));
  lines.push(`Lead end: ${firstLeadEndRow}`);

  lines.push(`[OK] Expanded PN: ${fullPN} (length ${pnTokens.length})`);

  console.log("firstLeadEndRow = ", firstLeadEndRow);

  const { cycles, period } = derivePermCycles(firstLeadEndRow); //, STAGE_SYMBOLS.slice(0, 6));

  // if (cycles.length != 1) {
  if (arePermCyclesConsideredDifferential(cycles)) {
    lines.push(`[WARN] DIFFERENTIAL: period=${period} cycles=${cycles}`);    
  }

  // // first number of each group tells us which blue lines to draw
  const blueLines = cycles.map(s => s[0]);

  const backwardTenorsCount = count87s(rows, stage);
  console.log(`Back tenor count: ${backwardTenorsCount}`);

  if (backwardTenorsCount > 0) {
    lines.push(`[ALERT] reverse tenors at backstroke (${backwardTenorsCount} rows)`);
  }

  // tenor dist tryout


  const distancesList = measureTopPairDistances(stage, rows);
  const distances = distancesList.join("\n\n");
  console.log("tenor distances: ", distancesList);

  // lines.push(distancesList);
  lines.push(distances);
  //

  // --- Duplicate/early-rounds detection (exclude the final row) ---
  if (Array.isArray(rows) && rows.length > 1) {
    const lastIdx = rows.length - 1;

    // Collect all occurrence indices (0..lastIdx-1) per row text
    const occurrences = new Map(); // rowText -> number[] (indices)
    let earlyRoundsAt = null;

    for (let i = 0; i < lastIdx; i++) {
      const r = rows[i];
      let arr = occurrences.get(r);
      if (!arr) {
        arr = [];
        occurrences.set(r, arr);
      }
      arr.push(i);

      if (r === rounds && i !== 0 && earlyRoundsAt === null) {
        earlyRoundsAt = i; // rounds appeared early (not the initial 0)
      }
    }

    // Emit one warning per repeated row text
    for (const [text, idxs] of occurrences) {
      if (idxs.length >= 2) {
        const repeatCount = idxs.length - 1; // repeats beyond the first
        // Positions for repeat occurrences only (skip the first at idxs[0])
        const where = idxs.map(i => {
          const L = Math.floor(i / leadLen);
          const R = i % leadLen;
          return `(L:${L+1}, R:${R+1})`;
        }).join(", ");
        lines.push(`[WARN] Duplicate rows: ${repeatCount+1} x "${text}": ${where}`);
      }
    }
  }
  
  if (!returned) {
    lines.push(`[WARN] Did not return to rounds within safety cutoff of ${maxChanges} changes.`);
  }

  return {
    reportLines: lines,
    blueLineIndexes: blueLines,
  };
}
