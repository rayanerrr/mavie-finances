# MaVie : système de design (source de vérité)

Généré avec **ui-ux-pro-max** (`search.py --design-system`, densité 8, variance 4, mouvement 3), puis **vérifié**. Seuls les éléments adaptés à un tableau de bord de finances sont retenus.

- Style : **Dark Mode (OLED)**. Contraste élevé, bleu nuit profond, fait pour les tableaux de bord.
- Mise en page : celle de l'interface « finances 3 », conservée telle quelle. Le modèle « Enterprise Gateway » proposé est écarté, car il sert aux pages marketing.

## Couleurs (jetons dans `src/app/globals.css`)

| Rôle | Valeur | Jeton |
|---|---|---|
| Fond | `#020617` | `--color-background` |
| Carte | `#0E1223` | `--color-card` |
| Surface atténuée | `#1A1E2F` | `--color-muted` |
| Bordure / bordure forte | `#1E293B` / `#334155` | `--color-border` / `--color-border-strong` |
| Texte / texte secondaire | `#F8FAFC` / `#CBD5E1` | `--color-foreground` |
| Texte discret | `#94A3B8` | `--color-muted-foreground` |
| Sélection, liens | `#3B82F6` | `--color-primary` |
| Action principale, positif | `#22C55E`, texte `#04130A` | `--color-accent` / `--color-on-accent` |
| Dépense, erreur | `#EF4444` | `--color-destructive` |
| Contour de focus | `#93C5FD` | `--color-ring` |

Contrastes calculés (WCAG) :

| Paire | Contraste |
|---|---|
| texte / carte | 17,8:1 |
| texte discret / carte | 7,3:1 |
| montant rouge / carte | 4,9:1 |
| montant vert / carte | 8,2:1 |
| texte du bouton vert | 8,4:1 (survol : 10,9:1) |
| lien bleu / carte | 5,1:1 |

## Typographie

- **IBM Plex Sans**, paire « Financial Trust » de la recherche `--domain typography` : finance, confiance, adaptée aux données. Chargée avec next/font (marche hors ligne). La Fira Code proposée est écartée : trop « code » pour des montants.
- Chiffres alignés (`tabular-nums`) partout. Interligne 1,5.

## Règles appliquées (quick-reference / pro-rules)

- `no-emoji-icons` : icônes **Lucide** (lucide-react) pour les sous-catégories, les statuts et les sources.
- `primary-action` : une seule couleur d'action principale (vert).
- `cursor-pointer`, `focus-states` (contour de 2 px), `press-feedback` (échelle 0,98).
- Transitions de 120 à 180 ms. `reduced-motion` respecté.
- `color-not-only` : chaque statut a une icône et un texte, en plus de sa couleur.
