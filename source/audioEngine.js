// audioEngine.js
// Pure sine tones with a simple amplitude envelope (attack + decay).
// Mapping: 1 = highest, ... up to 12 = lowest (C major descending).

let AC = null;
let master = null;

// Diatonic C major descending: C5..C4..B3..A3..G3..F3  (1..12)
export const BELL_FREQS = [
  523.25, // 1 -> C5
  493.88, // 2 -> B4
  440.00, // 3 -> A4
  392.00, // 4 -> G4
  349.23, // 5 -> F4
  329.63, // 6 -> E4
  293.66, // 7 -> D4
  261.63, // 8 -> C4
  246.94, // 9 -> B3
  220.00, // 10 -> A3  (symbol '0')
  196.00, // 11 -> G3  (symbol 'E')
  174.61, // 12 -> F3  (symbol 'T')
];

export async function ensureAudio(volume = 0.9) {
  if (!AC || AC.state === "closed") {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = Number.isFinite(volume) ? volume : 0.9;
    master.connect(AC.destination);
  }
  try { await AC.resume(); } catch {}
  return AC;
}

export function setVolume(v) {
  if (!AC || !master) return;
  const now = AC.currentTime;
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), now, 0.01);
}

export function stopAll() {
  if (!AC) return;
  const now = AC.currentTime;
  master.gain.setTargetAtTime(0.0001, now, 0.02);
  setTimeout(() => { try { AC.close(); } catch {} AC = null; master = null; }, 120);
}

export async function pause() {
  if (AC && AC.state === "running") { try { await AC.suspend(); } catch {} }
}
export async function resume() {
  if (AC && AC.state === "suspended") { try { await AC.resume(); } catch {} }
}

// Pure sine with minimal envelope to avoid clicks and add decay
function scheduleSineWithEnvelope(freq, when, dur) {
  const osc = AC.createOscillator();
  const amp = AC.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  // Envelope: tiny attack, smooth decay to near-zero by the end
  const attack = Math.min(0.005, dur * 0.1);
  const releasePad = 0.01;
  const t0 = when;
  const tAttackEnd = t0 + attack;
  const tDecayEnd  = t0 + dur;

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(1.0, tAttackEnd);
  amp.gain.exponentialRampToValueAtTime(0.0001, tDecayEnd);

  osc.connect(amp).connect(master);
  osc.start(t0);
  osc.stop(tDecayEnd + releasePad);
}

export async function playSequence(indices, { bpm = 224, strike = 0.6, volume = 0.9 } = {}) {
  if (!Array.isArray(indices) || !indices.length) return;
  await ensureAudio(volume);
  setVolume(volume);

  const beat = 60 / Math.max(30, Math.min(300, bpm));
  const dur  = Math.max(0.05, Math.min(3, strike));
  const start = AC.currentTime + 0.05;

  indices.forEach((place, i) => {
    if (place < 1 || place > BELL_FREQS.length) return; // ignore out-of-range
    const when = start + i * beat;
    const freq = BELL_FREQS[place - 1];
    scheduleSineWithEnvelope(freq, when, dur);
  });
}

// Convenience beep
export async function testBeep() {
  await ensureAudio();
  const now = AC.currentTime + 0.02;
  scheduleSineWithEnvelope(880, now, 0.25);
}