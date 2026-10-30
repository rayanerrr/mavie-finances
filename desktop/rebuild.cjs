// @electron/rebuild impose ~/.electron-gyp. Rediriger son homedir dans
// un cache dédié à ce processus, sans changer HOME ni les modules du projet.
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const cache = process.env.MAVIE_REBUILD_CACHE || path.join(os.homedir(), 'Library/Caches/MaVie-rebuild');
fs.mkdirSync(cache, { recursive: true });
os.homedir = () => cache;
(async () => {
  const { rebuild } = await import('@electron/rebuild');
  await rebuild({ buildPath: path.resolve('.next/standalone'), electronVersion: require('electron/package.json').version,
    arch: 'arm64', force: true, onlyModules: ['better-sqlite3'] });
})().catch(error => { console.error(error); process.exitCode = 1; });
