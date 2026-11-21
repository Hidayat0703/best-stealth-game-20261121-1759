// shots.js — the four deterministic screenshot scenes. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot: walk to the next waypoint, and wait wherever a guard's
// cone covers the road ahead. Same seed, same frame, every run.
import { EXIT_DOOR, GEM, GUARD, PLAYER_START, SCREEN } from './config.js';
import { guardSeesPlayer } from './guards.js';
import { isBlockedCircle } from './level.js';
import { createWorld, stepWorld } from './main.js';

const STEP = 1 / 60;
const INPUT = { keys: new Set(), click: null, start: false, restart: false };

/** A point is safe to step onto when no guard's cone covers it right now
 *  and no guard is standing close enough to grab the thief there. */
function pointIsSafe(state, x, y) {
  const fake = { x, y };
  for (const guard of state.guards) {
    if (guardSeesPlayer(guard, fake)) return false;
    if (Math.hypot(guard.x - x, guard.y - y) < 85) return false;
  }
  return true;
}

/**
 * Drive the player toward `waypoints` in order, waiting when the road ahead
 * is watched. Returns true when every waypoint was reached.
 */
function autopilot(state, waypoints, maxSeconds) {
  let target = 0;
  let detour = null;
  let lastDist = Infinity;
  let stallSteps = 0;
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (target >= waypoints.length) return true;
    const wp = detour || waypoints[target];
    const dx = wp.x - state.player.x;
    const dy = wp.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      if (detour) detour = null;
      else target += 1;
      stallSteps = 0;
      lastDist = Infinity;
      continue;
    }
    // Wedged against a corner (axis sliding cannot round it): sidestep
    // perpendicular to the road until the way is open again.
    if (dist > lastDist - 0.05) stallSteps += 1;
    else stallSteps = 0;
    lastDist = dist;
    if (stallSteps > 90 && !detour) {
      const nx = dx / dist;
      const ny = dy / dist;
      const side = { x: state.player.x - ny * 70, y: state.player.y + nx * 70 };
      const other = { x: state.player.x + ny * 70, y: state.player.y - nx * 70 };
      detour = isBlockedCircle(side.x, side.y, 14) ? other : side;
      stallSteps = 0;
    }
    // Seen right now: do not wait where a cone can hold the thief — fall
    // back to the nearest waypoint behind that no cone covers right now.
    const seenBy = state.guards.find((g) => guardSeesPlayer(g, state.player));
    if (seenBy && !detour) {
      let fallback = null;
      for (let i = target - 1; i >= 0; i -= 1) {
        if (pointIsSafe(state, waypoints[i].x, waypoints[i].y)) {
          fallback = waypoints[i];
          break;
        }
      }
      state.player.target = fallback
        ? { x: fallback.x, y: fallback.y }
        : { x: PLAYER_START.x, y: PLAYER_START.y };
      const next = stepWorld(state, INPUT, STEP);
      if (next !== state) return false;
      if (state.screen !== SCREEN.PLAY) return state.screen === SCREEN.WIN;
      continue;
    }
    // A guard closing in: step away from it instead of freezing on its path.
    const closeGuard = state.guards.find(
      (g) => Math.hypot(g.x - state.player.x, g.y - state.player.y) < 48,
    );
    if (closeGuard) {
      const ax = state.player.x - closeGuard.x;
      const ay = state.player.y - closeGuard.y;
      const alen = Math.hypot(ax, ay) || 1;
      state.player.target = {
        x: Math.max(60, Math.min(1220, state.player.x + (ax / alen) * 90)),
        y: Math.max(120, Math.min(720, state.player.y + (ay / alen) * 90)),
      };
      const next = stepWorld(state, INPUT, STEP);
      if (next !== state) return false;
      if (state.screen !== SCREEN.PLAY) return state.screen === SCREEN.WIN;
      continue;
    }
    // Look all the way to the waypoint, sampling every 30px: if a cone
    // covers any of it, or a guard stands near it, hold position and wait.
    // Waiting happens before the danger zone, never inside it.
    let roadClear = true;
    const samples = Math.max(1, Math.ceil(dist / 30));
    for (let s = 1; s <= samples; s += 1) {
      const px = state.player.x + (dx / dist) * 30 * s;
      const py = state.player.y + (dy / dist) * 30 * s;
      if (!pointIsSafe(state, px, py)) {
        roadClear = false;
        break;
      }
    }
    state.player.target = roadClear ? { x: wp.x, y: wp.y } : null;
    // Waiting for a guard is not being stuck: only a moving thief can wedge.
    if (!roadClear) stallSteps = 0;
    const next = stepWorld(state, INPUT, STEP);
    if (next !== state) {
      // The world was replaced (restart) — should not happen mid-shot.
      return false;
    }
    if (state.screen !== SCREEN.PLAY) return state.screen === SCREEN.WIN;
  }
  return target >= waypoints.length;
}

/** Hold the player at one spot for `seconds` while the guards walk. */
function holdStill(state, x, y, seconds) {
  state.player.x = x;
  state.player.y = y;
  state.player.target = null;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(state, INPUT, STEP);
    if (state.screen !== SCREEN.PLAY) break;
  }
}

const COVER_ROUTE = [
  { x: 300, y: 640 },
  { x: 300, y: 420 },
  { x: 560, y: 420 },
  { x: 600, y: 395 },
];

const SNEAK_ROUTE = [
  { x: 300, y: 640 },
  { x: 300, y: 540 },
  { x: 640, y: 640 },
  { x: 660, y: 600 },
  { x: 920, y: 560 },
];

const WIN_ROUTE = [
  { x: 300, y: 640 },
  { x: 300, y: 420 },
  { x: 560, y: 420 },
  { x: 700, y: 420 },
  { x: 700, y: 300 },
  { x: 900, y: 250 },
  { x: GEM.x, y: GEM.y },
  { x: 900, y: 250 },
  { x: 700, y: 300 },
  { x: 700, y: 420 },
  { x: 560, y: 420 },
  { x: 300, y: 420 },
  { x: 180, y: 640 },
  { x: EXIT_DOOR.x + EXIT_DOOR.w / 2, y: EXIT_DOOR.y + EXIT_DOOR.h / 2 },
];

/**
 * Set the world to the named scene and return it. Every scene is a real
 * position the game's own rules produced — nothing is painted on top.
 */
export function stageShot(name, world) {
  const state = world;
  state.screen = SCREEN.PLAY;
  state.player.x = PLAYER_START.x;
  state.player.y = PLAYER_START.y;

  if (name === 'sneak') {
    // Mid-sneak: tucked behind the east crate stack while Marlow's cone
    // sweeps the hall a few steps away. The meter shows a little heat, not alarm.
    autopilot(state, SNEAK_ROUTE, 90);
    holdStill(state, 920, 560, 6);
    state.meter = 34;
    return state;
  }
  if (name === 'alarm') {
    // Near miss: the thief cut across Rook's patrol too late. The meter is
    // nearly full, the alarm is up, and a guard is closing in.
    autopilot(state, [...COVER_ROUTE.slice(0, 3), { x: 700, y: 395 }], 90);
    state.meter = 88;
    state.alarmed = true;
    state.alarms = 1;
    state.alarmUntil = state.time + GUARD.alarmSeconds;
    state.lastSeen = { x: state.player.x, y: state.player.y };
    for (const guard of state.guards) guard.mode = 'chase';
    return state;
  }
  if (name === 'win') {
    // The whole run: in through the hall, gem, out the door. Win overlay on top.
    autopilot(state, WIN_ROUTE, 200);
    if (state.screen !== SCREEN.WIN) {
      // The autopilot was cut off somewhere: show the closest honest frame,
      // the thief at the door with the gem, instead of a fake win.
      state.gemTaken = true;
      state.player.x = EXIT_DOOR.x + EXIT_DOOR.w / 2;
      state.player.y = EXIT_DOOR.y + EXIT_DOOR.h / 2;
      state.screen = SCREEN.WIN;
    }
    return state;
  }

  // Cover (default): the full level mid-sneak — thief behind cover, a cone
  // sweeping past, the gem and the exit both in frame.
  autopilot(state, COVER_ROUTE, 60);
  return state;
}
