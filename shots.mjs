// Screenshots for Night Vault (best-stealth-game-20261121-1759):
// serves the entry's game/ and captures the four deterministic shot modes
// as JPEGs into screenshots/.
import { chromium } from '/home/hatch/workspace/makefun/threejs-fps-02-prep/node_modules/playwright-core/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const ENTRY = process.env.HOME + '/workspace/makefun/best-stealth-game-20261121-1759-entry';
const SHOTS = [
  { name: '1-cover.jpg', query: '?shot=cover&seed=1' },
  { name: '2-sneak.jpg', query: '?shot=sneak&seed=1' },
  { name: '3-alarm.jpg', query: '?shot=alarm&seed=1' },
  { name: '4-win.jpg', query: '?shot=win&seed=1' },
];

fs.mkdirSync(ENTRY + '/screenshots', { recursive: true });
const server = spawn('node', ['serve.ts', '--port', '8081'], { cwd: ENTRY, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));
const exe = process.env.HOME + '/workspace/.pw-browsers/chromium-1187/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 500)));
for (const s of SHOTS) {
  await page.goto('http://localhost:8081/' + s.query, { waitUntil: 'networkidle' });
  try {
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 30000 });
  } catch {
    console.log(s.name, 'shotReady TIMEOUT — capturing anyway');
  }
  await page.waitForTimeout(300);
  const path = ENTRY + '/screenshots/' + s.name;
  await page.screenshot({ path, type: 'jpeg', quality: 82 });
  const size = fs.statSync(path).size;
  console.log(s.name, size, 'bytes', size <= 262144 ? 'OK' : 'TOO BIG');
}
await browser.close();
server.kill();
console.log('done');
