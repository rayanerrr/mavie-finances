<div align="center">

<img src="public/logo.svg" width="96" alt="Logo TWR" />

# MaVie

**Les finances du foyer, sur ton Mac et ton iPhone.**
Prends un reçu en photo, l'IA lit chaque article et le range dans la bonne catégorie.

![macOS](https://img.shields.io/badge/macOS-12%2B-0f172a) ![iOS](https://img.shields.io/badge/iOS-17%2B-2563eb) ![Next.js](https://img.shields.io/badge/Next.js-16-0f172a) ![Electron](https://img.shields.io/badge/Electron-43-2563eb)

</div>

<p align="center"><img src="docs/screenshots/mac-accueil.png" alt="Accueil de MaVie sur Mac" width="900" /></p>

## Ce que fait MaVie

- **Reçus lus par l'IA** : chaque article est classé (Viande, Légumes, Essence…), puis tu vérifies et confirmes.
- **iPhone → Mac via iCloud** : tu prends la photo sur le téléphone, le Mac la lit tout seul.
- **Dépenses sans reçu** : « 20 $ d'essence » en deux touches.
- **Dépenses fixes** : loyer, salaire et abonnements s'ajoutent tout seuls à leur date.
- **Résumé du mois** : ce qu'il te reste, ton rythme de dépense, les prochaines échéances.
- **Catégories, sous-catégories, budgets, objectifs, analyses, rapports CSV.**
- **Mode clair, sombre ou automatique**, sur Mac comme sur iPhone.
- **Tes données restent sur ton Mac.**

## Sur Mac

| Clair | Sombre |
|---|---|
| <img src="docs/screenshots/mac-accueil.png" alt="Accueil en mode clair" /> | <img src="docs/screenshots/mac-accueil-sombre.png" alt="Accueil en mode sombre" /> |
| <img src="docs/screenshots/mac-categories.png" alt="Gestion des catégories" /> | <img src="docs/screenshots/mac-depenses-fixes.png" alt="Ajout d'une dépense fixe" /> |

## Sur iPhone

<p align="center">
  <img src="docs/screenshots/iphone-clair.png" alt="App iPhone en mode clair" width="280" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/iphone-sombre.png" alt="App iPhone en mode sombre" width="280" />
</p>

Trois onglets : **Mon mois** (le suivi), **Ajouter** (photo ou saisie rapide) et **Envois** (ce que le Mac a lu).

## Comment ça marche

```
iPhone ──photo──▶ iCloud Drive/MaVie ──▶ Mac (MaVie) ──▶ IA (gpt-reserve, Gemini en secours)
   ▲                                          │
   └──────── résumé du mois ◀─────────────────┘
```

## Installer

**Mac** : ouvre `MaVie-1.0.0-arm64.dmg` et glisse MaVie dans Applications. Au premier lancement, fais clic droit puis Ouvrir (l'app n'est pas notariée).

**iPhone** : ouvre `ios/` dans Xcode, choisis ton Apple ID, puis Run. Avec un compte gratuit, l'app est à réinstaller tous les 7 jours (détails dans `ios/README.md`).

## Développement

```bash
npm install
npm run dev                                    # http://localhost:3000
bash scripts/build-mac.sh                      # construit le .dmg
cd ios && bash build-ipa.sh                    # construit le .ipa
```

Stack : Next.js 16, React 19, SQLite (Drizzle), Electron, SwiftUI.
Système de design : `design-system/mavie/MASTER.md`.
