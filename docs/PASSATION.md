# Passation : MaVie v1.1

## État au 30 oct. 2026, 7 h 20 : LIVRÉ
- **main** contient tout. 59 commits, aucune attribution IA. Branches : feat/moteur-gemini, feat/interface, feat/app-mac, feat/app-iphone, feat/moteur-saisie-telephone, feat/iphone-suivi, fix/integration.
- **App Mac** :
  - installée dans `/Applications/MaVie.app` ;
  - le .dmg est dans `~/Documents/Telechargements/MaVie-1.0.0-arm64.dmg` ;
  - les données sont dans `~/Library/Application Support/finances/` (le nom vient du champ name de package.json) ;
  - la clé Gemini est déjà enregistrée dans la base de l'app (test : OK, modèle gemini-3.8-flash).
- **App iPhone** : `~/Documents/Telechargements/MaVie.ipa`. Compilée avec Xcode 27.2 sans signature. À installer avec Xcode et un Apple ID gratuit, ou avec Sideloadly : voir ios/README.md.
- **Dossier iCloud** : `~/Library/Mobile Documents/com~apple~CloudDocs/MaVie` (A-traiter/, Traites/, config.json, resume.json).
- **Testé de bout en bout** :
  - photo → Gemini → 8 articles bien classés ;
  - dépense écrite sur le téléphone → ajoutée ;
  - resume.json conforme ;
  - les 8 pages de l'app emballée répondent 200 sans erreur ;
  - la signature reste valide après un lancement.
- **Pièges réglés** :
  - fichiers marqués par AirDrop (node_modules réinstallés) ;
  - cache `.next` périmé ;
  - `allowedDevOrigins` pour 127.0.0.1 ;
  - node_modules embarqués via desktop/after-pack.cjs ;
  - runtimes Next manquants (outputFileTracingIncludes) ;
  - `force-dynamic`, sinon Next écrit son cache dans l'app ;
  - pour Xcode : `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.
- **Reste à faire** :
  - pousser sur GitHub. C'est l'utilisateur qui lance `gh repo create rayanerrr/mavie-finances --private --source ~/Downloads/finances --push`, puis `git push origin --all` ;
  - éventuellement : bouton « Ajouter sans reçu » plus visible côté Mac (la saisie manuelle existe dans /ajouter), et un test de l'app iPhone sur un vrai téléphone.

---
# Passation : MaVie v1 (si Claude n'est plus disponible, continuer avec Codex)

## Où on en est (30 oct. 2026)
- Dépôt git local : `~/Downloads/finances`, branche `main`. Elle contient l'état d'origine, `docs/PLAN.md` (le contrat technique), `docs/DESIGN.md` (la direction de design) et le logo TWR (`public/logo.svg`, `assets/icon.icns`, `assets/icon-1024.png`).
- Quatre branches, chacune dans son propre dossier (git worktree), sous `~/Downloads/finances-branches/` :

| Branche | Dossier | Contenu |
|---|---|---|
| `feat/moteur-gemini` | `moteur-gemini/` | Base de données, API, lecture Gemini, dépenses fixes, dossier iCloud |
| `feat/interface` | `interface/` | Toute l'interface (design de `docs/DESIGN.md`) |
| `feat/app-mac` | `app-mac/` | Electron, `scripts/build-mac.sh`, le .dmg |
| `feat/app-iphone` | `app-iphone/` | Projet SwiftUI dans `ios/` et le .ipa |

- Un agent Codex (modèle `gpt-6-astra` ; le modèle par défaut `gpt-6-sol` est refusé avec le compte ChatGPT) travaille dans chaque dossier et y fait ses commits.
- La clé Gemini se trouve dans `~/Downloads/finances/.env.local` (`GEMINI_API_KEY=…`, ignoré par git). Elle est copiée dans `moteur-gemini/.env.local`. **Ne jamais l'afficher ni la commiter.**
- Les skills de design sont installées dans `~/.claude/skills/` : frontend-design, interface-design, taste-skill, ui-ux-pro-max, web-design-guidelines, react-best-practices, shadcn.

## Ce qu'il reste à faire, dans l'ordre
1. **Vérifier chaque branche** :
   ```bash
   cd <dossier> && git log --oneline main..HEAD
   npx tsc --noEmit -p .
   ```
   Côté moteur, en plus : `npx tsx scripts/test-engine.ts`.
2. **Fusionner dans main**, dans cet ordre :
   ```bash
   cd ~/Downloads/finances
   git merge --no-ff feat/moteur-gemini
   git merge --no-ff feat/interface
   git merge --no-ff feat/app-mac
   git merge --no-ff feat/app-iphone
   ```
   Conflits attendus :
   - `README.md` : garder les deux sections ;
   - `src/lib/classify.ts` : c'est la version de l'interface qui fait foi ;
   - `package.json` : c'est la version app-mac qui fait foi, en gardant les scripts `db:*`.
3. **Contrôler le résultat sur main** :
   ```bash
   npm install
   npx tsc --noEmit -p .
   npx eslint src
   npx next build
   ```
   Puis lancer `npm run dev`, ouvrir http://localhost:3000, et vérifier chaque page ainsi que le flux complet d'un reçu : dépôt d'une image → lecture Gemini → `/recus/<id>` → Confirmer.
4. **Construire l'app Mac** :
   ```bash
   bash scripts/build-mac.sh --copy-to ~/Documents/Telechargements
   ```
   Le build se fait hors iCloud, dans `/tmp/mavie-build`, parce que la signature échoue dans `~/Documents`. Ensuite :
   ```bash
   node scripts/smoke-mac.cjs /tmp/mavie-build/dist/mac-arm64/MaVie.app /tmp/mavie-shots
   ```
   Installer avec `ditto` vers `/Applications/MaVie.app`. Au premier lancement : clic droit → Ouvrir (l'app n'est pas notariée). Coller la clé Gemini dans **Paramètres › Lecture des reçus par l'IA**.
5. **Fabriquer l'app iPhone** : il faut d'abord **installer Xcode** (gratuit, App Store), puis :
   ```bash
   cd ios && bash build-ipa.sh --copy-to ~/Documents/Telechargements
   ```
   Pour l'installer, suivre `ios/README.md` (Xcode avec Apple ID gratuit, ou Sideloadly). Avec un compte gratuit, l'app doit être réinstallée tous les 7 jours.
6. **GitHub** : la création du dépôt a été bloquée côté Claude. L'utilisateur la lance lui-même :
   ```bash
   cd ~/Downloads/finances
   gh repo create rayanerrr/mavie-finances --private --source . --remote origin --push
   git push origin --all
   ```

## Préférences de l'utilisateur
- Tout en français. Il veut beaucoup de petits commits clairs et une branche par chantier.
- **Commits sans aucune attribution IA** : pas de `Co-Authored-By`, pas de « Generated with ».
- Les livrables (.dmg, .ipa) vont dans `~/Documents/Telechargements`, pas dans `~/Downloads`.
- Ne jamais supprimer `data/` (sa base de démonstration). Ne rien supprimer sans son accord.

## Prompt prêt à coller dans Codex (agent intégrateur)
> Tu es l'intégrateur du projet MaVie dans `~/Downloads/finances`.
>
> Lis `docs/PASSATION.md`, `docs/PLAN.md` et `docs/DESIGN.md`. Exécute les étapes 1 à 5 de « Ce qu'il reste à faire » :
> 1. Vérifie chaque branche.
> 2. Fusionne-les dans main dans l'ordre indiqué, en résolvant les conflits comme décrit.
> 3. Corrige tout ce qui empêche `npx tsc --noEmit`, `npx eslint src` et `npx next build` de passer.
> 4. Teste le flux d'un reçu avec la vraie clé de `.env.local`, sans jamais l'afficher.
> 5. Construis le .dmg avec `scripts/build-mac.sh --copy-to ~/Documents/Telechargements` et lance le smoke test.
>
> Fais un commit après chaque étape, en français, sans attribution IA. Ne supprime jamais `data/`. Termine par un rapport : ce qui marche, ce qui ne marche pas, et les chemins des livrables.
