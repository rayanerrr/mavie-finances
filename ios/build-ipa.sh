#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
command -v xcodebuild >/dev/null || { echo "Erreur : Xcode/xcodebuild est requis." >&2; exit 1; }
command -v xcodegen >/dev/null || { echo "Erreur : installe xcodegen avec brew install xcodegen." >&2; exit 1; }
xcodegen generate
xcodebuild -project MaVie.xcodeproj -scheme MaVie -sdk iphoneos CODE_SIGNING_ALLOWED=NO build
APP_PATH="$(find build -type d -path '*/MaVie.app' -print -quit)"
test -n "$APP_PATH" || { echo "Erreur : MaVie.app introuvable." >&2; exit 1; }
rm -rf Payload MaVie.ipa
mkdir Payload
cp -R "$APP_PATH" Payload/MaVie.app
/usr/bin/ditto -c -k --sequesterRsrc --keepParent Payload MaVie.ipa
if [ "${1:-}" = "--copy-to" ]; then
  test -n "${2:-}" || { echo "Usage : $0 [--copy-to dossier]" >&2; exit 2; }
  cp MaVie.ipa "$2/MaVie.ipa"
fi
echo "IPA créée : $(pwd)/MaVie.ipa"
