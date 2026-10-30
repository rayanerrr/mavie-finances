#!/bin/bash
set -euo pipefail
SRC="${MAVIE_SRC:-$(cd "$(dirname "$0")/.." && pwd)}"
BUILD="${MAVIE_BUILD_DIR:-/tmp/mavie-build}"
COPY_TO=""
if [[ $# -gt 0 ]]; then
  [[ $# -eq 2 && "$1" == '--copy-to' ]] || { echo 'Usage : build-mac.sh [--copy-to dossier]' >&2; exit 1; }
  COPY_TO="$2"
fi
[[ "$(uname -s)" == Darwin && "$(uname -m)" == arm64 ]] || { echo 'Un Mac Apple Silicon est requis.' >&2; exit 1; }
mkdir -p "$BUILD"
SRC="$(cd "$SRC" && pwd -P)"
BUILD="$(cd "$BUILD" && pwd -P)"
case "$BUILD/" in "$SRC/"*|"$HOME/Documents/"*|*'/Mobile Documents/'*|*'/CloudStorage/'*) echo 'Choisis un dossier de construction séparé et hors iCloud.' >&2; exit 1;; esac
# Ne jamais nettoyer un dossier arbitraire fourni par erreur.
if [[ -n "$(ls -A "$BUILD")" && ! -f "$BUILD/.mavie-build" ]]; then
  echo "Dossier non vide sans marqueur .mavie-build : $BUILD" >&2; exit 1
fi
touch "$BUILD/.mavie-build"
export npm_config_cache="${npm_config_cache:-/tmp/mavie-npm-cache}"
export ELECTRON_CACHE="${ELECTRON_CACHE:-$HOME/Library/Caches/electron}"
echo '1/7 · Copie isolée du projet'
rsync -a --delete --exclude=.mavie-build --exclude=.git --exclude=node_modules --exclude=.next --exclude=data --exclude='.env*' --exclude=ios --exclude=dist "$SRC/" "$BUILD/"
cd "$BUILD"
echo '2/7 · Installation des dépendances'
npm ci
# npm peut conserver l’archive Electron sans exécuter son extraction.
node node_modules/electron/install.js
echo '3/7 · Construction Next standalone'
export FINANCES_DATA_DIR="$BUILD/build-data"
MAVIE_BUILD=1 npm run build
echo '4/7 · Assemblage du serveur et des ressources'
rsync -a --delete .next/static/ .next/standalone/.next/static/
rsync -a --delete public/ .next/standalone/public/
# Next ne trace pas les sources C++ nécessaires à la recompilation.
rsync -a --delete node_modules/better-sqlite3/ .next/standalone/node_modules/better-sqlite3/
# Le traceur crée un lien vers SQLite dans .next ; electron-builder ne sait pas
# toujours le suivre depuis une extraResource. Garder une copie réelle ici.
for SQLITE_TRACE in .next/standalone/.next/node_modules/better-sqlite3-*; do
  [[ -L "$SQLITE_TRACE" ]] || continue
  rm "$SQLITE_TRACE"
  rsync -a --delete .next/standalone/node_modules/better-sqlite3/ "$SQLITE_TRACE/"
done
echo '5/7 · Recompilation SQLite uniquement dans standalone'
node desktop/rebuild.cjs
ELECTRON_BIN="$(node -p "require('electron')")"
ELECTRON_RUN_AS_NODE=1 "$ELECTRON_BIN" -e 'const db = require(process.argv[1])(":memory:"); console.log("SQLite Electron :", db.prepare("select 1 as ok").get()); db.close()' "$BUILD/.next/standalone/node_modules/better-sqlite3"
node -e 'const db = require("better-sqlite3") (":memory:"); db.close(); console.log("SQLite Node système : OK")'
echo '6/7 · Création du DMG arm64'
npx electron-builder --mac dmg --arm64
VERSION="$(node -p "require('./package.json').version")"
DMG="$BUILD/dist/MaVie-$VERSION-arm64.dmg"
[[ -f "$DMG" ]]
echo '7/7 · Livrable'
if [[ -n "$COPY_TO" ]]; then
  mkdir -p "$COPY_TO"
  cp "$DMG" "$COPY_TO/"
  echo "$COPY_TO/$(basename "$DMG")"
fi
ls -lh "$DMG"
