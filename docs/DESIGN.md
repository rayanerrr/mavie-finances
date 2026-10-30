# MaVie : direction de design (à respecter dans toute l'interface)

Sources : les skills installées dans `~/.claude/skills/`. À LIRE avant de coder l'interface :
- `interface-design/SKILL.md` : la méthode (hiérarchie, couches, états, finitions, animations) ;
- `taste-skill/SKILL.md` et `taste-skill/references/app-screens.md`, `colour.md`, `tells.md`, `copy.md`, `critique.md` : la règle « anti-slop » pour les écrans d'app ;
- `frontend-design/SKILL.md` : les choix délibérés et les tics de design généré à éviter ;
- `ui-ux-pro-max/SKILL.md` (+ `references/quick-reference.md`, `references/pro-rules.md`) : l'ergonomie et l'accessibilité ;
- `web-design-guidelines/SKILL.md` et `react-best-practices/SKILL.md` : la qualité, l'accessibilité et la performance React/Next ;
- Pour les graphiques : les règles de `docs/PLAN.md` (palette validée, pas de double axe, infobulles).

## Intention
- **Qui** : un parent qui gère l'argent du foyer. Le soir, sur son Mac, il vérifie les reçus que son iPhone a envoyés dans la journée et regarde si le mois tient. Ce n'est pas un comptable.
- **Ce qu'il doit faire** : *vérifier et confirmer* les reçus lus par l'IA, puis *savoir en 5 secondes* s'il est dans son budget ce mois-ci, ce qui reste et ce qui s'en vient (les dépenses fixes).
- **Ce que ça doit faire ressentir** : un carnet de comptes calme et précis, comme un registre bien tenu. Rassurant, jamais tape-à-l'œil. Dense là où l'on vérifie (reçus, transactions), aéré là où l'on comprend (accueil).

## Le monde du produit
- **Le domaine** : le reçu de caisse thermique, la caisse de l'épicerie, l'enveloppe de budget, le registre (grand livre), le relevé de carte, le calendrier des prélèvements, le chèque de paie, le panier.
- **Les couleurs de ce monde** :
  - le papier thermique, blanc cassé froid ;
  - l'encre de caisse, gris anthracite ;
  - le tampon « PAYÉ » rouge, qui est le rouge TWR ;
  - le vert d'un compte en positif ;
  - l'ambre d'un avertissement de solde ;
  - le bleu-nuit d'un relevé bancaire.
- **La signature** (unique à MaVie), utilisée à 3 endroits au moins :
  1. **La bande de reçu** (`.receipt-strip`). Dans la vérification d'un reçu, les articles lus par l'IA sont « réimprimés » sur une bande de papier thermique claire (`--paper`), avec des bords dentelés en haut et en bas (CSS `mask` en dents de scie). Les lignes sont en police à chasse fixe, comme une vraie caisse (ici, la police mono est justifiée par le domaine). Chaque ligne porte sa pastille de catégorie colorée et se modifie en place. C'est la seule grande surface claire de l'app : c'est elle qu'on remarque.
  2. **Le rail du mois** (`.month-rail`). Une ligne horizontale de jour 1 à jour 30/31, où chaque dépense fixe est un petit repère (plein si payée, vide si à venir), avec un curseur « aujourd'hui ». On le voit sur l'Accueil et sur Dépenses fixes.
  3. **Le tampon** : quand on confirme un reçu, un tampon « AJOUTÉ » rouge TWR apparaît une fois sur la bande (animation courte, scale 0.95→1 + opacity, < 250 ms, désactivée si `prefers-reduced-motion`). Le même tampon sert de badge « Payé » dans les dépenses fixes.
- **Les défauts refusés** :
  - les cartes KPI identiques en grille de 4 (icône, gros chiffre, petit label) → à la place, un **chiffre héros unique** (« Il te reste 1 240 $ ce mois-ci ») avec une phrase, puis des chiffres secondaires en ligne ;
  - la barre latérale d'une autre couleur que la page → même fond que la page, séparée par une simple ligne `--rule` ;
  - les étiquettes en MAJUSCULES espacées au-dessus de chaque titre, les « A · B · C », les flèches « → » collées aux boutons, les dégradés décoratifs → interdits.

## Tokens (CSS custom properties, dans globals.css)
```
--ledger:      #0d0f13   fond de page (le registre)
--sheet:       #14171d   panneau niveau 1
--sheet-2:     #1a1e26   panneau niveau 2 (popover, panneau latéral)
--well:        #0a0c10   champs de saisie (en creux, plus sombres)
--rule:        rgba(255,255,255,0.07)   bordures standard
--rule-strong: rgba(255,255,255,0.12)
--ink:         #eef1f7   texte principal
--ink-2:       #c4cad6   texte secondaire
--ink-3:       #8b94a8   métadonnées
--ink-4:       #5c6578   désactivé
--stamp:       #F23645   rouge TWR (marque, bouton principal, tampon) : environ 5 % de l'écran au maximum
--stamp-ink:   #ffffff
--paper:       #f4f2ec   bande de reçu (papier thermique)
--paper-ink:   #26282d   texte de la bande
--ok:          #22c55e   --warn: #f59e0b   --over: #ef4444  (toujours avec une icône et un libellé)
--focus:       0 0 0 2px var(--ledger), 0 0 0 4px #F23645aa
```
Couleurs de catégories : celles de `docs/PLAN.md`, sans en changer une seule.

## Typographie (hors ligne, polices système Apple uniquement)
- Interface : `-apple-system, "SF Pro Text", system-ui`. Échelle 1.25 à partir de 14 px : 11 / 14 / 16 / 18 / 22 / 28 / 44.
- **Chiffres héros** (montant restant, total du reçu) : `ui-serif` (New York sur macOS), 44 px, graisse 600, `tabular-nums`, interlettrage −0.02em. C'est le deuxième élément de caractère, avec la bande de reçu.
- Bande de reçu uniquement : `ui-monospace, "SF Mono"` 13 px.
- La hiérarchie se fait par la graisse et la couleur avant la taille : valeur 600/ink, libellé 500/ink-2, méta 400/ink-3.
- Tous les montants en `tabular-nums`, format `fr-CA` (`1 240,50 $`). Les dépenses ne portent pas de signe moins ; les revenus portent un « + » vert.

## Espacement et profondeur
- Base 4 px. Densité : 12-16 px dans les tableaux et la vérification, 24-32 px entre les sections de l'Accueil.
- Profondeur : **bordures + changements de surface** (le mode sombre lit mal les ombres). Une seule ombre est permise, sur les panneaux flottants : `0 0 0 1px var(--rule-strong), 0 12px 32px rgba(0,0,0,.45)`.
- Rayons : 6 px pour les contrôles, 10 px pour les panneaux et 14 px pour les dialogues. Rayons concentriques.
- Pas de `transition: all`. 150 ms au survol, courbe `cubic-bezier(0.23,1,0.32,1)`, et `scale(0.97)` à l'appui.

## Écrits
Français du Québec, tutoiement, phrases courtes à la voix active. Les boutons disent ce qu'ils font : « Confirmer 12 dépenses (84,37 $) », « Relancer la lecture ». Un état vide dit quoi faire : « Aucun reçu à vérifier. Prends-en un en photo avec ton iPhone. » Une erreur dit quoi faire : « La clé Gemini est refusée. Colle une nouvelle clé dans Paramètres. »
