// audio.js — every sound is synthesised with WebAudio: no files, no network.
// A footstep tick, a pickup chime, an alarm sting, a win arpeggio, a caught
// thud. Silent when the browser has no audio yet (before the first gesture).
let context = null;

export function ensureAudio() {
  if (context) return context;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  } catch {
    context = null;
  }
  return context;
}

function tone(freq, dur, type, gain, when = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur);
  } catch {
    // Sound is garnish: a failure here never stops the game.
  }
}

/** Named sound effects; the game calls these, never the tones directly. */
export function sfx(name) {
  if (name === 'step') tone(190, 0.05, 'sine', 0.04);
  if (name === 'loudStep') tone(140, 0.07, 'triangle', 0.07);
  if (name === 'guardStep') tone(120, 0.05, 'sine', 0.03);
  if (name === 'pickup') {
    tone(660, 0.12, 'sine', 0.09);
    tone(990, 0.18, 'sine', 0.09, 0.09);
  }
  if (name === 'alarm') {
    tone(520, 0.16, 'square', 0.06);
    tone(392, 0.22, 'square', 0.06, 0.16);
  }
  if (name === 'win') {
    tone(523, 0.14, 'sine', 0.09);
    tone(659, 0.14, 'sine', 0.09, 0.12);
    tone(784, 0.26, 'sine', 0.1, 0.24);
  }
  if (name === 'caught') {
    tone(220, 0.3, 'sawtooth', 0.08);
    tone(110, 0.4, 'sawtooth', 0.08, 0.1);
  }
  if (name === 'click') tone(440, 0.06, 'sine', 0.06);
}
