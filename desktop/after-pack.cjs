'use strict';
// electron-builder écarte toujours les node_modules des extraResources.
// On les recopie dans le serveur embarqué, avant la signature.
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

exports.default = async function afterPack(context) {
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const from = path.join(context.packager.projectDir, '.next', 'standalone', 'node_modules');
  const to = path.join(app, 'Contents', 'Resources', 'server', 'node_modules');
  if (!fs.existsSync(from)) throw new Error(`node_modules du serveur introuvable : ${from}`);
  fs.rmSync(to, { recursive: true, force: true });
  execFileSync('ditto', [from, to]);
  console.log(`  • node_modules du serveur copiés (${fs.readdirSync(to).length} paquets)`);
};
