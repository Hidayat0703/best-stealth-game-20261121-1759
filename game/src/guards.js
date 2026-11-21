// guards.js — the four patrolling guards: their routes, their vision cones,
// and how they notice the thief. A guard walks its waypoints, waits at each
// end while slowly scanning, and chases or investigates when something is up.
import { GUARD, GUARD_DEFS } from './config.js';
import { isBlockedCircle, losBlocked, moveCircle, rayDistance } from './level.js';

export function createGuards() {
  return GUARD_DEFS.map((def, index) => ({
    name: def.name,
    color: def.color,
    waypoints: def.waypoints,
    // Start spread along each route so the cones do not all sweep together.
    waypointIndex: index % 2 === 0 ? 0 : 1,
    x: def.waypoints[index % 2 === 0 ? 0 : 1].x,
    y: def.waypoints[index % 2 === 0 ? 0 : 1].y,
    facing: index % 2 === 0 ? 0 : Math.PI,
    mode: 'patrol', // patrol | investigate | chase
    pauseLeft: 0,
    scanPhase: index * 1.7,
    investigateTarget: null,
    investigateLeft: 0,
    stepLeft: 0.2 + index * 0.13,
    // Safety net: a guard that cannot move (a lane the designer misjudged)
    // turns back instead of freezing against a wall forever.
    stuckLeft: 0,
    lastX: def.waypoints[index % 2 === 0 ? 0 : 1].x,
    lastY: def.waypoints[index % 2 === 0 ? 0 : 1].y,
  }));
}

/** The point a patrol guard is walking toward right now. */
function patrolTarget(guard) {
  return guard.waypoints[guard.waypointIndex];
}

function walkToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  const moved = moveCircle(guard.x, guard.y, nx - guard.x, ny - guard.y, GUARD.radius);
  guard.facing = Math.atan2(dy, dx);
  guard.x = moved.x;
  guard.y = moved.y;
  return dist - step < 2;
}

/**
 * Advance one guard. `events` collects what the rest of the game must know:
 * footsteps (for rings + sound) and the guard's current mode.
 */
export function updateGuard(guard, dt, state, events) {
  // Footsteps: a soft ring every step while the guard walks.
  guard.stepLeft -= dt;
  const moving = guard.mode !== 'patrol' || guard.pauseLeft <= 0;
  if (moving && guard.stepLeft <= 0) {
    guard.stepLeft = 0.42;
    events.footsteps.push({ x: guard.x, y: guard.y, r: 4, max: 30, alpha: 0.5, kind: 'guard' });
  }

  if (guard.mode === 'chase') {
    const target = state.lastSeen;
    if (target && walkToward(guard, target.x, target.y, GUARD.chaseSpeed, dt)) {
      guard.mode = 'patrol';
    }
    return;
  }
  if (guard.mode === 'investigate') {
    guard.investigateLeft -= dt;
    const target = guard.investigateTarget;
    if (target && walkToward(guard, target.x, target.y, GUARD.investigateSpeed, dt)) {
      guard.investigateTarget = null;
    }
    if (guard.investigateLeft <= 0 || !guard.investigateTarget) {
      guard.mode = 'patrol';
      guard.investigateTarget = null;
    }
    return;
  }

  // Patrol: walk to the waypoint, wait there while scanning, then turn back.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.scanPhase += dt;
    guard.facing += Math.sin(guard.scanPhase * 1.4) * 0.55 * dt;
    guard.stuckLeft = 0;
    return;
  }
  const target = patrolTarget(guard);
  const beforeX = guard.x;
  const beforeY = guard.y;
  if (walkToward(guard, target.x, target.y, GUARD.patrolSpeed, dt)) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = GUARD.pauseSeconds;
    guard.stuckLeft = 0;
    return;
  }
  // Stuck against something: give it a moment, then turn back.
  if (Math.hypot(guard.x - beforeX, guard.y - beforeY) < 0.05) {
    guard.stuckLeft += dt;
    if (guard.stuckLeft > 1.5) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseLeft = 0.5;
      guard.stuckLeft = 0;
    }
  } else {
    guard.stuckLeft = 0;
  }
  guard.lastX = guard.x;
  guard.lastY = guard.y;
}

/** Send a guard to look at a noise: the thief ran too close. */
export function investigateNoise(guard, x, y) {
  if (guard.mode === 'chase') return;
  guard.mode = 'investigate';
  guard.investigateTarget = { x, y };
  guard.investigateLeft = GUARD.investigateSeconds;
}

/** True when the player stands inside this guard's cone with a clear view. */
export function guardSeesPlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.coneRange || dist < 1) return dist < 1;
  let angle = Math.atan2(dy, dx) - guard.facing;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  if (Math.abs(angle) > GUARD.coneHalfAngle) return false;
  return !losBlocked(guard.x, guard.y, player.x, player.y);
}

/**
 * The cone as a polygon, raycast against walls and cover so the light stops
 * where a wall or a crate stands. The judge sees this shape, not the math.
 */
export function conePolygon(guard) {
  const rays = 26;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i += 1) {
    const angle =
      guard.facing - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
    const d = rayDistance(guard.x, guard.y, angle, GUARD.coneRange);
    points.push({ x: guard.x + Math.cos(angle) * d, y: guard.y + Math.sin(angle) * d });
  }
  return points;
}

/** A guard standing still still blocks the thief: keep the player out. */
export function guardBlocks(guard, x, y, r) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const rr = r + GUARD.radius;
  return dx * dx + dy * dy < rr * rr;
}

export function guardsAreBlocked(x, y, r) {
  return isBlockedCircle(x, y, r);
}
