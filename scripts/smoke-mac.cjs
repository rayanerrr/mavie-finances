#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const [bundle, captures] = process.argv.slice(2);
if (!bundle || !captures) { console.error('Usage : node scripts/smoke-mac.cjs <MaVie.app> <dossier captures>'); process.exit(1); }
const appPath = path.resolve(bundle);
const out = path.resolve(captures);
fs.mkdirSync(out, { recursive: true });
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mavie-smoke-data-'));
const json = path.join(out, `resultat-${Date.now()}.json`);
const binary = path.join(appPath, 'Contents/MacOS/MaVie');
const sqlite = spawnSync(binary, ['-e', 'const db = require(process.argv[1])(":memory:"); console.log(db.prepare("select 1 as ok").get()); db.close()', path.join(appPath, 'Contents/Resources/server/node_modules/better-sqlite3')], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' });
console.log(`SQLite Electron : ${sqlite.status === 0 ? 'OK' : 'ÉCHEC'}`);
if (sqlite.status !== 0) { console.error(sqlite.stderr || sqlite.error); process.exit(1); }
const env = { ...process.env, FINANCES_DATA_DIR: data, MAVIE_SMOKE: '1', MAVIE_SMOKE_OUT: json };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(binary, [], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-32768); });
const timeout = setTimeout(() => { child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 3000).unref(); }, 180000);
child.on('error', error => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
child.on('exit', code => {
  clearTimeout(timeout);
  if (!fs.existsSync(json)) { console.error('Aucun rapport produit.', logs); process.exitCode = 1; return; }
  const result = JSON.parse(fs.readFileSync(json, 'utf8'));
  if (result.error) { console.error(result.error, logs); process.exitCode = 1; return; }
  const databases = [path.join(data, 'finances.db'), path.join(data, 'data/finances.db')];
  const database = databases.find(file => fs.existsSync(file) && fs.statSync(file).size > 0);
  for (const page of result.pages) console.log(`${page.status} ${page.route} · ${page.errors.length} erreur(s) console · ${page.capture}`);
  console.log(`Base temporaire : ${database || 'ABSENTE'}\nRapport : ${json}`);
  result.sqlite = true; result.database = database || null; result.exitCode = code;
  fs.writeFileSync(json, JSON.stringify(result, null, 2));
  const invalid = result.pages.some(page => ![200, 404].includes(page.status) || (page.status === 200 && page.errors.length) || !fs.statSync(page.capture).size);
  if (code !== 0 || !database || result.pages.find(page => page.route === '/')?.status !== 200 || invalid) process.exitCode = 1;
});
