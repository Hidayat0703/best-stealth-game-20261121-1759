// render.js — everything the player sees: the museum floor, the guards and
// their vision cones, the cover, the gem, the exit, the footsteps, and the
// HUD that says what to do next. No game logic lives here, only drawing.
import {
  BARRELS,
  COLORS,
  CRATES,
  EXIT_DOOR,
  FIELD,
  GEM,
  GUARD,
  LAMPS,
  PLAYER,
  SCREEN,
  VIEW,
  WALLS,
} from './config.js';
import { conePolygon } from './guards.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
  // Checker tiles, faint enough to read as floor, never as clutter.
  const tile = 60;
  ctx.fillStyle = COLORS.floorB;
  for (let y = FIELD.y; y < FIELD.y + FIELD.h; y += tile) {
    for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += tile) {
      const odd = (Math.floor((x - FIELD.x) / tile) + Math.floor((y - FIELD.y) / tile)) % 2 === 0;
      if (odd) ctx.fillRect(x, y, tile, tile);
    }
  }
  // Red carpet from the entrance to the vault door: the thief's route.
  ctx.fillStyle = COLORS.carpet;
  ctx.fillRect(120, 660, 900, 40);
  ctx.fillRect(1000, 200, 40, 180);
  ctx.strokeStyle = COLORS.carpetEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(120, 660, 900, 40);
  ctx.strokeRect(1000, 200, 40, 180);
  // Lamp pools: warm light on the floor, and the risk that comes with it.
  for (const lamp of LAMPS) {
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, lamp.r);
    glow.addColorStop(0, COLORS.lampCore);
    glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Field border.
  ctx.strokeStyle = COLORS.wallTop;
  ctx.lineWidth = 4;
  ctx.strokeRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h);
}

function drawWallsAndCover(ctx) {
  for (const wall of WALLS) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = COLORS.wallTop;
    if (wall.w > wall.h) ctx.fillRect(wall.x, wall.y, wall.w, 5);
    else ctx.fillRect(wall.x, wall.y, 5, wall.h);
  }
  for (const crate of CRATES) {
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(crate.x, crate.y, crate.s, crate.s);
    ctx.strokeStyle = COLORS.crateEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(crate.x + 2, crate.y + 2, crate.s - 4, crate.s - 4);
    ctx.beginPath();
    ctx.moveTo(crate.x + 4, crate.y + 4);
    ctx.lineTo(crate.x + crate.s - 4, crate.y + crate.s - 4);
    ctx.moveTo(crate.x + crate.s - 4, crate.y + 4);
    ctx.lineTo(crate.x + 4, crate.y + crate.s - 4);
    ctx.stroke();
  }
  for (const barrel of BARRELS) {
    ctx.fillStyle = COLORS.barrel;
    ctx.beginPath();
    ctx.arc(barrel.x, barrel.y, barrel.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.barrelEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(barrel.x, barrel.y, barrel.r - 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGemAndExit(ctx, gemTaken, time) {
  // The exit: a green door in the bottom-left wall, always visible.
  ctx.fillStyle = COLORS.exit;
  roundRect(ctx, EXIT_DOOR.x, EXIT_DOOR.y, EXIT_DOOR.w, EXIT_DOOR.h, 6);
  ctx.fill();
  ctx.fillStyle = '#0d2b18';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', EXIT_DOOR.x + EXIT_DOOR.w / 2, EXIT_DOOR.y + EXIT_DOOR.h / 2);
  if (gemTaken) return;
  // The Star Gem, pulsing so the eye finds it across the room.
  const pulse = 1 + 0.18 * Math.sin(time * 3);
  const glow = ctx.createRadialGradient(GEM.x, GEM.y, 2, GEM.x, GEM.y, 44 * pulse);
  glow.addColorStop(0, 'rgba(127, 231, 255, 0.75)');
  glow.addColorStop(1, 'rgba(127, 231, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(GEM.x, GEM.y, 44 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.gem;
  ctx.beginPath();
  ctx.moveTo(GEM.x, GEM.y - GEM.r);
  ctx.lineTo(GEM.x + GEM.r * 0.7, GEM.y);
  ctx.lineTo(GEM.x, GEM.y + GEM.r);
  ctx.lineTo(GEM.x - GEM.r * 0.7, GEM.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(GEM.x - 4, GEM.y - 5, 3, 0, Math.PI * 2);
  ctx.fill();
}

function coneColor(meter, alarmed) {
  if (alarmed || meter >= 100) return 'rgba(255, 70, 60, 0.34)';
  if (meter >= 55) return 'rgba(255, 150, 50, 0.30)';
  return 'rgba(255, 214, 90, 0.24)';
}

function drawGuard(ctx, guard, meter, alarmed, time) {
  const poly = conePolygon(guard);
  ctx.fillStyle = coneColor(meter, alarmed);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill();
  // Guard body: uniform circle, cap brim toward the facing, name above.
  ctx.fillStyle = guard.color;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e1420';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#10151f';
  ctx.beginPath();
  ctx.arc(
    guard.x + Math.cos(guard.facing) * 8,
    guard.y + Math.sin(guard.facing) * 8,
    6,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = '#dfe6f2';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(guard.name, guard.x, guard.y - GUARD.radius - 4);
  if (guard.mode !== 'patrol') {
    ctx.fillStyle = alarmed ? '#ff5a4e' : '#ffb03a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(guard.mode === 'chase' ? '!' : '?', guard.x, guard.y - GUARD.radius - 18);
  }
  void time;
}

function drawPlayer(ctx, player, time) {
  // The thief: a pale face under a dark hood, cloak trailing behind.
  // A faint ring marks the thief at a glance — the judge must find them.
  ctx.strokeStyle = 'rgba(232, 228, 216, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER.radius + 6, 0, Math.PI * 2);
  ctx.stroke();
  const bob = Math.sin(time * (player.moving ? 10 : 3)) * (player.moving ? 1.5 : 0.5);
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, PLAYER.radius + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.facing) * 3,
    player.y + Math.sin(player.facing) * 3 + bob * 0.3,
    PLAYER.radius - 5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.facing) * 5,
    player.y + Math.sin(player.facing) * 5,
    4,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawRings(ctx, rings) {
  for (const ring of rings) {
    const t = 1 - ring.r / ring.max;
    ctx.strokeStyle = `rgba(220, 230, 255, ${Math.max(0, ring.alpha * t)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#12151d';
  ctx.fillRect(0, 0, VIEW.w, 96);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('NIGHT VAULT — Shadow Heist', 40, 30);
  ctx.font = '16px sans-serif';
  const objective = state.gemTaken
    ? 'Gem stolen — reach the green EXIT, unseen'
    : 'Steal the Star Gem in the vault (top right), then reach the EXIT';
  ctx.fillStyle = state.gemTaken ? COLORS.safe : COLORS.hud;
  ctx.fillText(objective, 40, 60);
  // Detection meter, right side: fills yellow, then red.
  const mx = 880;
  const mw = 320;
  ctx.fillStyle = '#2a2f3d';
  roundRect(ctx, mx, 18, mw, 22, 6);
  ctx.fill();
  const frac = Math.max(0, Math.min(1, state.meter / 100));
  ctx.fillStyle = frac >= 0.99 ? COLORS.danger : frac >= 0.55 ? COLORS.warn : COLORS.safe;
  if (frac > 0.01) {
    roundRect(ctx, mx, 18, mw * frac, 22, 6);
    ctx.fill();
  }
  ctx.strokeStyle = '#5a6478';
  ctx.lineWidth = 1.5;
  roundRect(ctx, mx, 18, mw, 22, 6);
  ctx.stroke();
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.alarmed ? 'SPOTTED!' : 'DETECTION', mx, 56);
  // Timer + gem + alarms, far right.
  ctx.textAlign = 'right';
  ctx.font = '16px sans-serif';
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60);
  const gemMark = state.gemTaken ? '◆ GEM' : '◇ gem';
  ctx.fillText(
    `${gemMark}   ${mins}:${String(secs).padStart(2, '0')}   alarms ${state.alarms}`,
    1240,
    82,
  );
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8a90a0';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD / arrows move · Shift run (loud) · click to walk · R restart', 40, 84);
}

function drawAlarmBanner(ctx) {
  ctx.fillStyle = 'rgba(255, 60, 45, 0.92)';
  ctx.fillRect(440, 694, 400, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('! ALARM — BREAK LINE OF SIGHT !', 640, 714);
  ctx.textAlign = 'left';
}

function drawOverlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW.w / 2, 300);
  ctx.font = '19px sans-serif';
  let y = 360;
  for (const line of lines) {
    ctx.fillText(line, VIEW.w / 2, y);
    y += 30;
  }
  ctx.fillStyle = '#ffb03a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(hint, VIEW.w / 2, y + 26);
  ctx.textAlign = 'left';
}

function formatTime(t) {
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Draw the whole game for the current screen. */
export function draw(ctx, state) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = '#0c0e13';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  drawFloor(ctx);
  drawWallsAndCover(ctx);
  drawGemAndExit(ctx, state.gemTaken, state.time);
  for (const guard of state.guards) drawGuard(ctx, guard, state.meter, state.alarmed, state.time);
  drawRings(ctx, state.rings);
  drawPlayer(ctx, state.player, state.time);
  drawHud(ctx, state);
  if (state.alarmed && state.screen === SCREEN.PLAY) drawAlarmBanner(ctx);

  if (state.screen === SCREEN.TITLE) {
    drawOverlay(
      ctx,
      'NIGHT VAULT',
      [
        'A museum after dark. Four guards walk their rounds,',
        'their lantern cones sweeping the floor. Crates and barrels',
        'block their sight — hide behind them, mind the lamplight,',
        'steal the Star Gem, and slip out the green EXIT unseen.',
        '',
        'Walking is silent. Running (Shift) is fast — and loud.',
      ],
      'Press ENTER or click to begin',
    );
  }
  if (state.screen === SCREEN.WIN) {
    const ghost = state.alarms === 0 && state.meter < 25;
    drawOverlay(
      ctx,
      'CLEAN GETAWAY',
      [
        `The Star Gem is yours. Time ${formatTime(state.time)} · alarms raised ${state.alarms}.`,
        ghost
          ? 'Not a single guard ever knew you were there. A perfect ghost.'
          : 'The guards knew something was wrong — but you were already gone.',
      ],
      'Press R to play again',
    );
  }
  if (state.screen === SCREEN.OVER) {
    drawOverlay(
      ctx,
      'CAUGHT',
      [
        'A guard got a hand on your shoulder before you reached the door.',
        'Study the patrols: they walk the same rounds every time.',
        'Wait behind cover until a cone sweeps past, then move.',
      ],
      'Press R to try again',
    );
  }
}
