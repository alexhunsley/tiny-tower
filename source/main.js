// main.js
import { playSequence, stopAll, testBeep, setVolume } from "./audioEngine.js";
import { parseDigits } from "./utils.js";
import { generateList, clampStage } from "./notation.js";

// Strict element getter: throws if not found (helps catch cache/markup issues)
function el(id) {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Element #${id} not found. Check index.html IDs and cache.`);
  return n;
}

function updateStatus(text) { el("status").textContent = text; }

function wirePlayer() {
  el("play").addEventListener("click", async () => {
    const digits = parseDigits(el("seq").value);
    if (digits === null) { updateStatus("invalid (use digits 1–8)"); return; }
    if (!digits.length) { updateStatus("nothing to play"); return; }

    const bpm = Math.max(30, Math.min(300, Number(el("bpm").value) || 120));
    const strike = Math.max(0.1, Math.min(3, Number(el("len").value) || 0.6));
    const volume = Math.max(0, Math.min(1, Number(el("vol").value) || 0.9));

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

  // Seed example
  el("seq").value = "12345678";
}

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
    const pnString = (el("placeNotation").value || "").trim(); // reserved for future use
    const stage = clampStage(el("stage").value);
    el("stage").value = stage; // normalize back into the input
    const list = generateList({ pnString, stage });
    renderGeneratedList(list);
  });
}

function init() {
  try {
    // Verify all expected IDs exist before wiring
    [
      "seq","play","stop","beep","status","bpm","len","vol",
      "placeNotation","stage","generate","notationOutput"
    ].forEach(id => el(id));

    wirePlayer();
    wireNotation();
    updateStatus("idle");
  } catch (err) {
    console.error(err);
    alert(err.message + "\n\nTip: hard-reload (Ctrl+F5 / Cmd+Shift+R) to bust cache.");
  }
}

// Run after DOM truly ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}