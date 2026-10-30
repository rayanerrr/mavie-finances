# MaVie : plan de la v1 (contrat commun aux agents)

## But
MaVie est l'app de finances du foyer (un seul budget partagé), en français du Québec, avec des montants en CAD.
- **Mac** : une app `.dmg` (Electron qui emballe ce projet Next.js). Les données sont sur le Mac.
- **iPhone** : une app `.ipa` (SwiftUI). Elle prend la photo du reçu et la dépose dans **iCloud Drive/MaVie/A-traiter/**.
- Le Mac surveille ce dossier. Chaque nouveau reçu est importé, puis **lu par Gemini** (clé API gratuite de l'utilisateur), qui renvoie chaque article avec sa catégorie et sa sous-catégorie. Le reçu passe alors « à vérifier ». L'utilisateur contrôle et confirme, et les articles deviennent des dépenses.
- **Dépenses fixes** (loyer, internet, téléphone, assurances, abonnements, salaire…) : on les saisit une fois et elles sont créées automatiquement à chaque échéance.
- Interface très claire, très détaillée et accueillante. Logo **TWR** (`public/logo.svg`, fond sombre, trait blanc).

## Règles pour tous les agents
- Ne touche **que** les fichiers de ton périmètre (listé dans ton prompt). Si tu as besoin d'autre chose, note-le dans ton rapport final au lieu de le faire.
- Pas de `git commit`, pas de `git add`. Ne supprime jamais `data/` ni la base existante. Ne lance pas `npm run db:seed`, `db:demo` ni `db:import` sur `data/`. Pour tester, utilise un dossier temporaire via `FINANCES_DATA_DIR=/tmp/mavie-test-xxx`.
- Next.js 16.4 (voir `AGENTS.md` : lis `node_modules/next/dist/docs/` avant d'utiliser une API Next que tu ne connais pas bien). React 19, Tailwind 4 (déjà configuré), Drizzle + better-sqlite3.
- Les textes visibles sont en **français** (tutoiement : « Ajoute ton premier reçu »).
- Aucune dépendance npm nouvelle, sauf pour l'agent desktop (electron, electron-builder, @electron/rebuild).
- Finis par un rapport : fichiers créés ou modifiés, comment tu as vérifié, et ce qui reste douteux.

## Données (agent MOTEUR)
- `src/db/index.ts` : le dossier de données vient de `process.env.FINANCES_DATA_DIR`, sinon `path.join(process.cwd(),"data")`. Si la base n'a aucune catégorie, le seed (catégories, sous-catégories, comptes, réglages par défaut) est appliqué automatiquement. Le code du seed est déplacé dans `src/db/seed-core.ts` et réutilisé par `scripts/seed.ts`.
- Nouvelle table `recurring` (dépenses et revenus fixes) : `id, name, amount REAL, type ('expense'|'income'), category_id, subcategory_id NULL, account_id NULL, person NULL, store NULL, frequency ('monthly'|'weekly'|'biweekly'|'yearly'), day_of_month INT NULL (1-31, ramené à la fin du mois si besoin ; pour weekly/biweekly on part de start_date), start_date TEXT (YYYY-MM-DD), end_date TEXT NULL, active INT default 1, notes NULL, created_at`.
- `expenses.recurring_id INTEGER NULL` + index unique `(recurring_id, date)` WHERE recurring_id IS NOT NULL. Les dépenses créées ont `source='recurring'`.
- Nouvelle table `category_rules` (apprentissage) : `id, pattern TEXT (description normalisée : minuscules, sans accents, sans chiffres ni ponctuation superflue), merchant_key NULL, category TEXT, subcategory TEXT NULL, hits INT, updated_at`, avec un index unique sur `(pattern, merchant_key)`.
- Nouvelles colonnes sur `receipts` : `purchase_date TEXT NULL, total REAL NULL, subtotal REAL NULL, taxes REAL NULL, origin TEXT default 'upload' ('upload'|'icloud'), error TEXT NULL, ai_raw TEXT NULL (JSON), model TEXT NULL`. Statuts : `pending` → `analyzing` → `analyzed` (à vérifier) | `error` → `confirmed`.
- Nouvelles colonnes sur `receipt_items` : `quantity REAL NULL, raw_text TEXT NULL (texte exact du reçu), confidence REAL NULL`.

## API (le contrat que l'UI consomme : formes exactes)
Toutes les réponses sont du JSON. Une erreur renvoie `{error:string}` avec un statut 4xx ou 5xx.
- `GET /api/summary?month=YYYY-MM` (existant, à **enrichir** sans rien casser) : on y ajoute `byPerson:[{person,total,count}]`, `byStore:[{store,total,count}]`, `byAccount:[{accountId,name,color,total}]`, `fixed:{total,paid,upcoming}` (dépenses fixes du mois), `variable:number`, `pendingReceipts:number` (statuts analyzed + error + pending + analyzing).
- `GET /api/recurring` → `{items:Recurring[]}` où `Recurring = {id,name,amount,type,categoryId,categoryName,categoryColor,subcategoryId,subcategoryName,accountId,accountName,person,store,frequency,dayOfMonth,startDate,endDate,active,notes,nextDate:string|null,monthlyEquivalent:number}`.
- `POST /api/recurring` (body : `{name,amount,type,category,subcategory?,accountId?,person?,store?,frequency,dayOfMonth?,startDate,endDate?,notes?}`, où category et subcategory sont des **noms**) → `{item}`. La création déclenche tout de suite la génération des échéances passées.
- `PATCH /api/recurring/[id]` (mêmes champs, partiels, plus `active:boolean`) → `{item}` ; `DELETE /api/recurring/[id]` → `{ok:true}` (les dépenses déjà créées restent).
- `GET /api/recurring/upcoming?month=YYYY-MM` → `{items:[{recurringId,name,amount,type,date,categoryName,categoryColor,status:'paid'|'upcoming'}], totals:{expense,income}}`.
- `PATCH /api/expenses/[id]` (date, amount, description, store, person, category, subcategory, accountId, notes) → `{expense}` ; `DELETE /api/expenses/[id]` → `{ok:true}`.
- `POST /api/receipts` (existant) : il lance maintenant **l'analyse Gemini en arrière-plan** juste après l'enregistrement (le statut passe à `analyzing`). Il accepte image/jpeg, png, heic, heif, webp et application/pdf.
- `GET /api/receipts/[id]` → `{receipt}` avec `items`, `purchaseDate,total,subtotal,taxes,origin,error,model`, et `itemsSum` (somme des articles acceptés) et `difference` (total − itemsSum, null si total inconnu).
- `POST /api/receipts/[id]/reanalyze` → relance Gemini.
- `PATCH /api/receipts/[id]` → modifie store, person, accountId, purchaseDate, total, notes.
- `DELETE /api/receipts/[id]` → supprime le reçu et ses articles (pas les dépenses déjà confirmées).
- `POST /api/receipts/[id]/items` → ajoute un article `{description,amount,category,subcategory}` ; la modification d'article existante est conservée.
- `POST /api/receipts/[id]/confirm` : la date des dépenses est `purchaseDate`, sinon aujourd'hui. Chaque article confirmé **apprend** une règle `category_rules`.
- `GET /api/settings` : **ne renvoie jamais la clé Gemini**. Il renvoie à la place `geminiConfigured:boolean, geminiKeyHint:"…abcd"`, plus `people`, `householdName`, `currency`, `inboxDir`, `inboxEnabled`, `geminiModel`.
- `POST /api/settings` `{key,value}` : les clés autorisées sont `geminiApiKey, geminiModel, people, householdName, currency, inboxDir, inboxEnabled`. Toute autre clé → 400.
- `POST /api/settings/test-gemini` (body optionnel `{key}`) → `{ok:true, model}` ou `{ok:false, error}` (message en français).
- `GET /api/inbox/status` → `{enabled, dir, exists, lastScanAt, waitingFiles, lastError, recent:[{receiptId,store,total,itemsCount,status,at}]}`. `recent` contient les 20 derniers reçus venus d'iCloud ; l'app Mac s'en sert pour ses notifications.

## Lecture Gemini (agent MOTEUR) : `src/lib/gemini.ts`
- La clé vient du réglage `geminiApiKey` (stocké en base), sinon de `process.env.GEMINI_API_KEY` (`.env.local` en développement).
- Le modèle vient du réglage `geminiModel`, sinon d'un **choix automatique** : on interroge ListModels (`GET https://generativelanguage.googleapis.com/v1beta/models?key=…`), on prend le modèle « flash » le plus récent qui gère `generateContent`, et on le met en cache.
- Appel `generateContent` avec l'image en `inline_data` (base64), `responseMimeType: application/json` et un `responseSchema`.
- Le prompt donne la **liste exacte des catégories et sous-catégories de la base** et impose de choisir dedans. Il demande :
  - de développer les abréviations des reçus québécois (`PC POIT POUL DS` → « Poitrine de poulet désossée ») tout en gardant `raw_text` ;
  - d'appliquer chaque rabais à l'article qu'il concerne (montant net) ;
  - de ne pas compter TPS/TVQ ni sous-total comme des articles, mais de les rapporter dans `taxes` et `subtotal` ;
  - de trouver le magasin, la date d'achat et le total payé.
- Sortie : `{store,purchaseDate,subtotal,taxes,total,items:[{description,rawText,quantity,amount,category,subcategory,confidence}]}`.
- Ensuite, les règles `category_rules` apprises écrasent la catégorie proposée.
- Les taxes doivent être réparties au prorata sur les articles taxables. Plus simple et accepté : on ajoute une ligne « Taxes (TPS/TVQ) » dans la catégorie du plus gros article, pour que la somme des articles égale le total payé.
- Robustesse : délai d'attente de 90 s, 3 essais avec attente progressive sur 429/500/503, et des messages d'erreur clairs en français (clé invalide, quota atteint, pas d'Internet). En cas d'erreur, le statut passe à `error` avec le message.

## Dossier iCloud (agent MOTEUR) : `src/lib/inbox.ts` + `src/instrumentation.ts`
- Dossier par défaut : `~/Library/Mobile Documents/com~apple~CloudDocs/MaVie`. Il contient `A-traiter/` (le téléphone y dépose ses fichiers) et `Traites/` (le Mac y range ce qu'il a fini). Les deux sont créés s'ils manquent.
- Le dossier est examiné toutes les 15 s, plus `fs.watch`. Les fichiers fantômes iCloud `.<nom>.icloud` sont téléchargés avec `brctl download <chemin>`. On attend que la taille du fichier soit stable 2 fois de suite.
- Un fichier compagnon facultatif `<même nom>.json` venant du téléphone peut contenir `{person, accountName, note, capturedAt}`.
- Import d'un reçu : création du reçu (origine `icloud`), puis analyse Gemini. Le fichier image et le compagnon sont déplacés dans `Traites/`. Le Mac écrit ensuite `Traites/<nom>.result.json` = `{status, receiptId, store, total, itemsCount, error, processedAt}`, que le téléphone lit pour afficher le statut.
- Le Mac écrit aussi `MaVie/config.json` = `{householdName, people:[...], accounts:[{id,name}], updatedAt}`, que le téléphone lit pour proposer les choix. Ce fichier est mis à jour au démarrage et à chaque changement de réglage ou de compte.
- `instrumentation.ts` contient `register()`, qui ne s'exécute qu'avec le runtime nodejs. Il démarre une seule fois (garde sur `globalThis`) la surveillance d'iCloud et la génération des dépenses fixes (au démarrage, puis toutes les heures).
- Le réglage `inboxEnabled` (par défaut "true") permet de couper la surveillance.

## Design (agent INTERFACE)
- Thème sombre façon TWR :
  - fonds `--bg:#0d0f13`, panneaux `#14171d` et `#1a1e26`, lignes `#252a35` ;
  - textes `#eef1f7`, gris `#8b94a8` et `#5c6578` ;
  - la **marque** est le rouge TWR `#F23645`, réservé au logo et aux boutons principaux ;
  - couleurs d'état : bien `#22c55e`, attention `#f59e0b`, dépassement `#ef4444`, toujours accompagnées d'une icône et d'un libellé.
- Couleurs des catégories (palette validée pour fond sombre, ordre fixe, la couleur suit la catégorie et jamais son rang) :

  | Catégorie | Couleur |
  |---|---|
  | Alimentation | #3987e5 |
  | Logement | #d95926 |
  | Transport | #199e70 |
  | Magasinage | #c98500 |
  | Restaurants | #d55181 |
  | Santé & Fitness | #008300 |
  | Factures & Services | #9085e9 |
  | Divertissement | #e66767 |
  | Enfants | #a3a29a |
  | Autres | #6b6a65 |
  | Revenu | #22c55e |

  Les catégories créées par l'utilisateur prennent un gris neutre. Les graphiques affichent au plus 8 catégories, le reste est regroupé dans « Autres ». Chaque catégorie a aussi son icône, pour ne pas dépendre de la couleur seule.
- Graphiques :
  - traits fins, extrémités arrondies de 4 px, 2 px d'espace entre segments ;
  - infobulle au survol sur chaque barre ou segment, réticule sur les courbes ;
  - légende dès qu'il y a 2 séries ou plus, avec des étiquettes directes choisies (pas de chiffre sur chaque point) ;
  - **jamais deux axes Y** ;
  - le texte reste en couleur de texte, jamais en couleur de série.
