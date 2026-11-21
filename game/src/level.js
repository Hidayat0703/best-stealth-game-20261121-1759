// level.js — the museum floor: walls, cover, lamps, the gem and the exit.
// It answers the two questions the rest of the game keeps asking:
// can something move here, and can a guard see from here to there?
import { BARRELS, CRATES, FIELD, GEM, LAMPS, WALLS } from './config.js';

function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function circleHitsCircle(cx, cy, r, other) {
  const dx = cx - other.x;
  const dy = cy - other.y;
  const rr = r + other.r;
  return dx * dx + dy * dy < rr * rr;
}

/** True when a circle of radius r at (x, y) overlaps a wall, cover or the edge. */
export function isBlockedCircle(x, y, r) {
  if (x - r < FIELD.x || x + r > FIELD.x + FIELD.w) return true;
  if (y - r < FIELD.y || y + r > FIELD.y + FIELD.h) return true;
  for (const wall of WALLS) if (circleHitsRect(x, y, r, wall)) return true;
  for (const crate of CRATES) {
    if (circleHitsRect(x, y, r, { x: crate.x, y: crate.y, w: crate.s, h: crate.s })) return true;
  }
  for (const barrel of BARRELS) if (circleHitsCircle(x, y, r, barrel)) return true;
  return false;
}

/**
 * Move a circle by (dx, dy) one axis at a time, so it slides along walls
 * instead of sticking on corners.
 */
export function moveCircle(x, y, dx, dy, r) {
  if (!isBlockedCircle(x + dx, y, r)) x += dx;
  if (!isBlockedCircle(x, y + dy, r)) y += dy;
  return { x, y };
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: the segment crosses the rect when the entry interval overlaps.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let lo = 0;
  let hi = 1;
  const axes = [
    { d: dx, a: x1, min: rect.x, max: rect.x + rect.w },
    { d: dy, a: y1, min: rect.y, max: rect.y + rect.h },
  ];
  for (const axis of axes) {
    if (axis.d === 0) {
      if (axis.a < axis.min || axis.a > axis.max) return false;
    } else {
      let t0 = (axis.min - axis.a) / axis.d;
      let t1 = (axis.max - axis.a) / axis.d;
      if (t0 > t1) [t0, t1] = [t1, t0];
      lo = Math.max(lo, t0);
      hi = Math.min(hi, t1);
      if (lo > hi) return false;
    }
  }
  return lo <= hi && hi >= 0 && lo <= 1;
}

function segmentHitsCircle(x1, y1, x2, y2, circle) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ox = x1 - circle.x;
    const oy = y1 - circle.y;
    return ox * ox + oy * oy < circle.r * circle.r;
  }
  let t = ((circle.x - x1) * dx + (circle.y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx - circle.x;
  const py = y1 + t * dy - circle.y;
  return px * px + py * py < circle.r * circle.r;
}

/**
 * True when a wall or a piece of cover stands between the two points.
 * Crates and barrels block sight, so hiding behind one breaks a cone.
 */
export function losBlocked(x1, y1, x2, y2) {
  for (const wall of WALLS) if (segmentHitsRect(x1, y1, x2, y2, wall)) return true;
  for (const crate of CRATES) {
    if (segmentHitsRect(x1, y1, x2, y2, { x: crate.x, y: crate.y, w: crate.s, h: crate.s })) return true;
  }
  for (const barrel of BARRELS) if (segmentHitsCircle(x1, y1, x2, y2, barrel)) return true;
  return false;
}

/** Raycast used by the cone drawing: distance from (x, y) along an angle. */
export function rayDistance(x, y, angle, maxDist) {
  const step = 6;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  for (let d = step; d <= maxDist; d += step) {
    px += dx;
    py += dy;
    if (px < FIELD.x || px > FIELD.x + FIELD.w || py < FIELD.y || py > FIELD.y + FIELD.h) return d;
    if (isBlockedCircle(px, py, 1)) return d;
  }
  return maxDist;
}

/** True when the point stands inside a warm lamp pool. */
export function inLamp(x, y) {
  for (const lamp of LAMPS) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy < lamp.r * lamp.r) return true;
  }
  return false;
}

export function gemAt() {
  return GEM;
}
