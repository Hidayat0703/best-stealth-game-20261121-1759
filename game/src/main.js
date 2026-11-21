// main.js — Night Vault: the world, one step at a time, and the browser
// bootstrap. The loop reads keys, moves the thief and the guards, fills or
// drains the detection meter, and decides win, alarm and caught.
import { EXIT_DOOR, GEM, GUARD, PLAYER, PLAYER_START, SCREEN } from './config.js';
import { sfx } from './audio.js';
import { createGuards, guardSeesPlayer, investigateNoise, updateGuard } from './guards.js';
import { inLamp } from './level.js';
import { createPlayer, noiseRadius, playerIsLoud, updatePlayer } from './player.js';
import { draw } from './render.js';

/** A fresh world: title screen, thief at the door, guards on their rounds. */
export function createWorld() {
  return {
    screen: SCREEN.TITLE,
    time: 0,
    meter: 0,
    alarmed: false,
    alarmUntil: 0,
    alarms: 0,
    gemTaken: false,
    lastSeen: null,
    player: createPlayer(PLAYER_START),
    guards: createGuards(),
    rings: [],
  };
}

function playerInExit(player) {
  return (
    player.x > EXIT_DOOR.x &&
    player.x < EXIT_DOOR.x + EXIT_DOOR.w &&
    player.y > EXIT_DOOR.y &&
    player.y < EXIT_DOOR.y + EXIT_DOOR.h
  );
}

/**
 * One fixed step. `input` is { keys: Set, click: {x,y}|null,
 * start: boolean, restart: boolean }. `events` is filled with footsteps
 * the caller may turn into sound; the world itself stays silent.
 */
export function stepWorld(state, input, dt, events = { footsteps: [] }) {
  if (state.screen === SCREEN.TITLE) {
    if (input.start) {
      state.screen = SCREEN.PLAY;
      sfx('click');
    }
    return state;
  }
  if (state.screen === SCREEN.WIN || state.screen === SCREEN.OVER) {
    if (input.restart) {
      const fresh = createWorld();
      fresh.screen = SCREEN.PLAY;
      return fresh;
    }
    return state;
  }

  // --- PLAY ---
  state.time += dt;
  if (input.click) state.player.target = { x: input.click.x, y: input.click.y };
  updatePlayer(state.player, input.keys, dt, events);

  // Detection: the fastest-seeing guard sets the fill rate; lamplight hurries it.
  let seenBy = null;
  let seenDist = Infinity;
  for (const guard of state.guards) {
    if (guardSeesPlayer(guard, state.player)) {
      const d = Math.hypot(state.player.x - guard.x, state.player.y - guard.y);
      if (d < seenDist) {
        seenDist = d;
        seenBy = guard;
      }
    }
  }
  if (seenBy) {
    state.lastSeen = { x: state.player.x, y: state.player.y };
    const closeness = 1 - seenDist / GUARD.coneRange;
    let rate = GUARD.fillBase + GUARD.fillCloseBonus * closeness;
    if (inLamp(state.player.x, state.player.y)) rate *= GUARD.lampMultiplier;
    state.meter = Math.min(100, state.meter + rate * dt);
  } else {
    const drain = state.alarmed ? GUARD.alarmDrain : GUARD.drain;
    state.meter = Math.max(0, state.meter - drain * dt);
  }

  // Meter full: the alarm goes up, every guard runs for the last seen spot.
  if (state.meter >= 100 && !state.alarmed) {
    state.alarmed = true;
    state.alarms += 1;
    state.alarmUntil = state.time + GUARD.alarmSeconds;
    for (const guard of state.guards) guard.mode = 'chase';
    sfx('alarm');
  }
  if (state.alarmed && state.time >= state.alarmUntil) {
    state.alarmed = false;
    for (const guard of state.guards) {
      if (guard.mode === 'chase') guard.mode = 'patrol';
    }
  }

  // A running thief is heard: the nearest guard comes to look.
  if (playerIsLoud(state.player)) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const guard of state.guards) {
      const d = Math.hypot(state.player.x - guard.x, state.player.y - guard.y);
      if (d < noiseRadius() && d < nearestDist) {
        nearest = guard;
        nearestDist = d;
      }
    }
    if (nearest) investigateNoise(nearest, state.player.x, state.player.y);
  }

  for (const guard of state.guards) updateGuard(guard, dt, state, events);

  // Footstep rings expand and fade.
  for (const ring of state.rings) ring.r += 42 * dt;
  state.rings = state.rings.filter((ring) => ring.r < ring.max);
  for (const step of events.footsteps) {
    state.rings.push(step);
    if (step.kind === 'quiet') sfx('step');
    if (step.kind === 'loud') sfx('loudStep');
  }
  events.footsteps.length = 0;

  // Caught: a guard gets a hand on the thief.
  for (const guard of state.guards) {
    const d = Math.hypot(state.player.x - guard.x, state.player.y - guard.y);
    if (d < PLAYER.catchRadius) {
      state.screen = SCREEN.OVER;
      sfx('caught');
      return state;
    }
  }

  // The gem, then the door.
  if (!state.gemTaken) {
    const d = Math.hypot(state.player.x - GEM.x, state.player.y - GEM.y);
    if (d < PLAYER.pickupRadius) {
      state.gemTaken = true;
      sfx('pickup');
    }
  }
  if (state.gemTaken && playerInExit(state.player)) {
    state.screen = SCREEN.WIN;
    sfx('win');
  }
  return state;
}

/** The canvas is fixed 1280x800; the page scales it to fit the window. */
export function fitCanvas(canvas) {
  canvas.width = 1280;
  canvas.height = 800;
}

/** Browser bootstrap: keyboard, mouse, the loop, and the ?shot= scenes. */
export function startGame(canvas) {
  fitCanvas(canvas);
  const ctx = canvas.getContext('2d');
  let state = createWorld();
  const keys = new Set();
  let click = null;

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    import('./shots.js').then(({ stageShot }) => {
      state = stageShot(shot, state);
      draw(ctx, state);
      window.__shotReady = true;
    });
    return;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.code);
    if (event.code === 'Enter' && state.screen === SCREEN.TITLE) {
      state = stepWorld(state, { keys, click: null, start: true, restart: false }, 0);
    }
    if (event.code === 'KeyR' && (state.screen === SCREEN.WIN || state.screen === SCREEN.OVER)) {
      state = stepWorld(state, { keys, click: null, start: false, restart: true }, 0);
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 800;
    if (state.screen === SCREEN.TITLE) {
      state = stepWorld(state, { keys, click: null, start: true, restart: false }, 0);
      return;
    }
    click = { x, y };
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const input = { keys, click, start: false, restart: false };
    click = null;
    const next = stepWorld(state, input, dt);
    if (next !== state) state = next;
    draw(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('game');
  if (canvas) startGame(canvas);
}
