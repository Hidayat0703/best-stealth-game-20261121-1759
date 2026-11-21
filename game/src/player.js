// player.js — the thief: WASD/arrows to sneak, Shift to run, click to walk
// to a point. Walking is silent; running is fast and loud, and loud brings
// the nearest guard over to look.
import { GUARD, PLAYER } from './config.js';
import { moveCircle } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2,
    moving: false,
    running: false,
    // Click-to-move target, null when the keys drive.
    target: null,
    stepLeft: 0,
    // How long the last noise ring has been out: guards hear running.
    noiseLeft: 0,
  };
}

/**
 * Advance the thief one step. `keys` is a Set of pressed key names,
 * `events` collects footsteps for rings and sound. Returns nothing;
 * the player object is updated in place.
 */
export function updatePlayer(player, keys, dt, events) {
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;

  // Click-to-move: steer toward the clicked point until the keys take over.
  if (dx === 0 && dy === 0 && player.target) {
    const tx = player.target.x - player.x;
    const ty = player.target.y - player.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 6) {
      player.target = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  } else if (dx !== 0 || dy !== 0) {
    player.target = null;
  }

  const len = Math.hypot(dx, dy);
  player.moving = len > 0;
  if (!player.moving) {
    player.running = false;
    return;
  }
  player.running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = player.running ? PLAYER.run : PLAYER.walk;
  const step = speed * dt;
  const moved = moveCircle(player.x, player.y, (dx / len) * step, (dy / len) * step, PLAYER.radius);
  player.x = moved.x;
  player.y = moved.y;
  player.facing = Math.atan2(dy, dx);

  // Footsteps: small and silent while walking, big and loud while running.
  player.stepLeft -= dt;
  if (player.stepLeft <= 0) {
    player.stepLeft = player.running ? 0.3 : 0.5;
    events.footsteps.push({
      x: player.x,
      y: player.y,
      r: 3,
      max: player.running ? 46 : 22,
      alpha: player.running ? 0.55 : 0.3,
      kind: player.running ? 'loud' : 'quiet',
    });
    if (player.running) player.noiseLeft = 0.35;
  }
  if (player.noiseLeft > 0) player.noiseLeft -= dt;
}

/** True while the thief's last step is still loud enough to be heard. */
export function playerIsLoud(player) {
  return player.noiseLeft > 0;
}

/** Distance at which a guard hears a running thief. */
export function noiseRadius() {
  return GUARD.noiseRadius;
}
