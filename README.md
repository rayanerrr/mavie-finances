# MaVie · Finances foyer

App locale (Mac) — un seul budget partagé. UI type mockup MaVie, OCR via Cursor.

## Démarrer

```bash
npm install
npm run db:seed
npm run db:demo   # optionnel : 6 mois de données de démonstration
npm run dev
```

Repartir de zéro :

```bash
rm -f data/finances.db data/finances.db-wal data/finances.db-shm
find data/receipts -type f ! -name .gitkeep -delete
npm run db:seed
```

Import en lot : `npm run db:import -- fichier.json` (tableau d’objets `{date, amount, description, store, person, category, subcategory}`).

Ouvre [http://localhost:3000](http://localhost:3000).

## Ajouter un reçu (OCR Cursor)

1. Dans **Ajouter un achat**, dépose une photo/PDF → statut `pending`.
2. Dans Cursor : *« analyse le reçu #ID »* (l’agent lit le fichier et appelle `POST /api/receipts/ID/analyze`).
3. Dans MaVie : vérifie les items → **Confirmer l’import**.

### Analyze (Cursor)

```bash
curl -X POST http://localhost:3000/api/receipts/1/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "store":"Maxi",
    "items":[
      {"description":"Boeuf haché 500g","amount":9.99,"category":"Alimentation","subcategory":"Viande"},
      {"description":"Poitrine de poulet","amount":12.45,"category":"Alimentation","subcategory":"Poulet"}
    ]
  }'
```

## App Mac

MaVie s’emballe en application macOS Apple Silicon (arm64), à partir de macOS 12.
La construction nécessite un Mac arm64, Node.js/npm et les outils de ligne de
commande Xcode (`xcode-select --install`).

```bash
npm install
# Dans un premier terminal : npm run dev
npm run desktop:dev
# MAVIE_URL permet de choisir un autre serveur Next local déjà lancé.

npm run desktop:build
# Ou copier le résultat après construction :
bash scripts/build-mac.sh --copy-to ~/Documents/Telechargements

codesign --verify --deep --strict /tmp/mavie-build/dist/mac-arm64/MaVie.app
npm run desktop:smoke -- /tmp/mavie-build/dist/mac-arm64/MaVie.app /tmp/mavie-smoke
```

Le script copie le dépôt dans `/tmp/mavie-build`, installe les dépendances,
construit Next en standalone puis recompile SQLite **uniquement dans la copie
standalone** pour Electron. Le module SQLite du projet reste utilisable par
Node et `npm run dev`. `MAVIE_SRC` et `MAVIE_BUILD_DIR` permettent de changer les
chemins ; le dossier de construction doit être séparé, vide au premier usage,
et hors de Documents/iCloud. Un marqueur permet de le réutiliser ensuite.
Les fichiers `.env*`, les données, `ios/` et les anciens livrables ne sont pas
copiés depuis le dépôt. Aucune clé API n’est incorporée au DMG.

Le livrable est `/tmp/mavie-build/dist/MaVie-1.0.0-arm64.dmg`. Glisse MaVie dans
Applications depuis le DMG. La signature est ad hoc, sans notarisation Apple ;
une ouverture par clic droit → Ouvrir peut être nécessaire.

Le serveur écoute uniquement sur `127.0.0.1`, sur un port libre. Les données et
les journaux sont dans `~/Library/Application Support/MaVie` ; le menu MaVie
ouvre ce dossier et `~/Library/Mobile Documents/com~apple~CloudDocs/MaVie`.
Les journaux tournent entre `logs/main.log` et `logs/main.log.1` (environ 1 Mo
chacun). Le serveur dispose de trois relances au maximum par session.
La branche historique écrit encore la base dans le sous-dossier `data/` ;
après fusion du moteur, `FINANCES_DATA_DIR` désigne directement le dossier
utilisateur. Une base historique existante devra être migrée avant ce changement.

Le test de fumée lance une fenêtre cachée et utilise une **nouvelle base
temporaire**, conservée pour inspection. Il vérifie SQLite sous Electron,
capture les huit pages et écrit leurs statuts HTTP et erreurs console dans un
rapport JSON horodaté. L’accueil doit répondre 200 ; les pages encore absentes
sur une branche peuvent répondre 404. Les notifications iCloud et le badge du
Dock attendent les API du moteur ; une route absente n’empêche pas le démarrage.
