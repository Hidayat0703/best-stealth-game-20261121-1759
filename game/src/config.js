// Night Vault — Shadow Heist: every fixed number of the game lives here.
// One level, one canvas (1280x800), top-down. The player steals the Star Gem
// from the vault room, then reaches the exit unseen.
export const VIEW = { w: 1280, h: 800 };
export const FIELD = { x: 40, y: 104, w: 1200, h: 636 };

export const SCREEN = { TITLE: 0, PLAY: 1, WIN: 2, OVER: 3 };

export const PLAYER = {
  radius: 16,
  walk: 170,
  run: 255,
  // A guard that gets this close catches the thief, seen or not.
  catchRadius: 27,
  // Picking the gem up needs to be this close.
  pickupRadius: 34,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  investigateSpeed: 88,
  chaseSpeed: 108,
  // How long a guard waits at a waypoint, slowly scanning the room.
  pauseSeconds: 1.4,
  scanSweep: 0.9,
  coneRange: 205,
  coneHalfAngle: 0.56, // ~32 degrees each side
  // Detection meter 0..100. Fills while any guard sees the player.
  fillBase: 46,
  fillCloseBonus: 42,
  drain: 34,
  alarmDrain: 16,
  alarmSeconds: 5,
  // Standing in lamplight makes the meter fill faster.
  lampMultiplier: 1.3,
  // Noise a running thief makes: guards inside this radius investigate.
  noiseRadius: 110,
  investigateSeconds: 2.6,
};

// Interior walls (canvas coordinates). Gaps are the doors between rooms.
export const WALLS = [
  // Left wing divider, two segments with a doorway between them.
  { x: 430, y: 104, w: 16, h: 196 },
  { x: 430, y: 500, w: 16, h: 240 },
  // Vault room floor: the wall under the vault, gap on its left end.
  { x: 776, y: 380, w: 464, h: 16 },
  // Vault room left wall, gap at its bottom end.
  { x: 760, y: 104, w: 16, h: 150 },
  // A short wall in the main hall, makes a corner to hide behind.
  { x: 940, y: 520, w: 16, h: 120 },
];

// Crates (squares) and barrels (circles): cover that blocks sight and movement.
export const CRATES = [
  { x: 500, y: 216, s: 46 },
  { x: 552, y: 216, s: 46 },
  { x: 500, y: 268, s: 46 },
  { x: 896, y: 500, s: 46 },
  { x: 948, y: 500, s: 46 },
  { x: 200, y: 400, s: 46 },
  { x: 696, y: 636, s: 46 },
  { x: 180, y: 180, s: 46 },
];
export const BARRELS = [
  { x: 520, y: 520, r: 23 },
  { x: 572, y: 520, r: 23 },
  { x: 1050, y: 584, r: 23 },
  { x: 300, y: 180, r: 23 },
  { x: 852, y: 196, r: 23 },
  { x: 700, y: 600, r: 23 },
];

// Warm lamp pools. Standing in one fills the detection meter faster;
// the floor tint shows the player where the light falls.
export const LAMPS = [
  { x: 620, y: 200, r: 120 },
  { x: 1010, y: 470, r: 120 },
  { x: 250, y: 620, r: 110 },
  { x: 1120, y: 200, r: 110 },
];

export const GEM = { x: 1120, y: 200, r: 16 };
export const EXIT_DOOR = { x: 52, y: 664, w: 64, h: 56 };
export const PLAYER_START = { x: 116, y: 640 };

// Four guards, each with a fixed patrol the player can learn.
export const GUARD_DEFS = [
  {
    name: 'Rook',
    color: '#4d7dd1',
    waypoints: [
      { x: 500, y: 340 },
      { x: 1150, y: 340 },
    ],
  },
  {
    name: 'Vesper',
    color: '#c25a7a',
    waypoints: [
      { x: 1000, y: 140 },
      { x: 1000, y: 350 },
    ],
  },
  {
    name: 'Marlow',
    color: '#57a773',
    waypoints: [
      { x: 200, y: 470 },
      { x: 900, y: 470 },
    ],
  },
  {
    name: 'Ivy',
    color: '#c98f2e',
    waypoints: [
      { x: 640, y: 150 },
      { x: 640, y: 680 },
    ],
  },
];

export const COLORS = {
  floorA: '#20242e',
  floorB: '#1b1f28',
  carpet: '#5a2430',
  carpetEdge: '#7a3040',
  wall: '#3a4152',
  wallEdge: '#5a6478',
  wallTop: '#4a5468',
  crate: '#7a5a34',
  crateEdge: '#a8824e',
  barrel: '#2e5a44',
  barrelEdge: '#4d8a68',
  lamp: 'rgba(255, 196, 110, 0.10)',
  lampCore: 'rgba(255, 205, 120, 0.55)',
  gem: '#7fe7ff',
  exit: '#2fae5f',
  player: '#e8e4d8',
  playerHood: '#2b2f3a',
  hud: '#d8d4c8',
  danger: '#ff5a4e',
  warn: '#ffb03a',
  safe: '#7fe7a8',
};
