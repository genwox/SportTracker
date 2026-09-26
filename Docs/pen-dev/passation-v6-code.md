# Passation : coder la V6 « app native » dans SportTracker.Web

Fiche de départ pour une nouvelle session de code. Elle résume ce qu'il faut savoir sans relire l'historique.

## Où en est le projet (26/09/2026)
- **Code** : `SportTracker.Web` (Ionic React, `mode: 'ios'`) tourne sur `https://beta.fmon-vps-n8n.fr`, validé sur iPhone (plein écran, zoom bloqué, en-tête collant, GIF, Carnets). Détail dans `CLAUDE.md`, étape 4g.
- **Design** : la V6 est finie dans `design.pen` (commit `96b0f91`). Le kit, les 27 écrans, le parcours et le rapport sont dans la rangée `ST1 V6` (y = 27600) et en dessous (y = 30000).
- **Branches** : `master` porte tout. Les sessions Claude dans le cloud **ne peuvent pas pousser sur `master`** : elles poussent sur leur branche de travail, et Damien fusionne ensuite (`git merge --ff-only`).

## Les sources de la V6, dans `design.pen`
`design.pen` est du JSON (`version`, `children`, `variables`). Chaque écran est un frame de premier niveau.

| Frame | id | Contenu |
|---|---|---|
| `V6 Kit · Composants` | `bdv2i` | Tous les composants et leurs états |
| `V6 Kit · Correspondance` | `mcLrO` | Composant V5 → V6 → Ionic → notes de code |
| `ST1 V6 · Rapport` | `QiWhE` | Les changements écran par écran, les **composants à coder dans `src/ui/`**, et les points à trancher |
| `ST1 V6 · Parcours et transitions` | `l66GWz` | Les transitions (durées, courbes) |
| `ST1 V6 · 01` à `27` | (voir `design.pen`) | Les écrans, chacun avec sa note Ionic en dessous |

Pour lire les textes d'un frame :
```bash
python3 - <<'EOF'
import json
d = json.load(open('design.pen'))
def texts(n, out):
    if n.get('type') == 'text' and n.get('content'): out.append(n['content'])
    for c in n.get('children') or []: texts(c, out)
for c in d['children']:
    if c.get('name') == 'ST1 V6 · Rapport':
        o = []; texts(c, o); print('\n'.join(o))
EOF
```
**Références visuelles** : si Damien a exporté les écrans V6 en PNG (`design-exports/v6/`), les regarder avant de coder chaque écran. Sinon, le lui demander : le JSON seul ne donne pas le rendu.

Règles de design : `Docs/pen-dev/sporttracker-native/SKILL.md`.

## Déjà en place dans le code : à garder
- **Plein écran** : barre d'état `black-translucent`, donc **heure et batterie en blanc** sur le fond. `viewport-fit=cover`. Fond Paragon sur `html`/`body`/`ion-app`/`.ion-page` (`src/app/theme.css`).
- **En-tête** : `V5Header` (`src/ui/index.tsx`) est collant. Au défilement, il devient une barre floutée **foncée** `#315E5ECC`, avec un titre blanc à 22 px (hook `useContentScrolled`).
- **Zoom bloqué** : meta viewport, `touch-action`, `gesturestart` refusé, **champs à 16 px minimum** (iOS zoome en dessous).
- **Routes** : `IonRouterOutlet` retient la **dernière** route qui correspond. Chaque chemin statique (`/new`) doit donc être déclaré **après** son jumeau `:id` (`src/app/routes.tsx`). Un test e2e le vérifie.
- **Mises à jour PWA** (`src/main.tsx`) : appliquées à l'ouverture ou au retour dans l'app, jamais sur `/live`.
- **GIF** : `ExerciseThumb` et `ExerciseDemoSheet` (`src/ui/index.tsx`).
- **Icône et écrans de lancement** : `scripts/pwa-assets.mjs` les régénère. **Bandeau d'installation** : `src/ui/InstallHint.tsx`.

## Décisions à trancher avec Damien avant de coder
**Tranchées le 26/09/2026 : Damien a retenu les cinq recommandations entre parenthèses.**
Elles viennent du rapport V6. La recommandation par défaut est entre parenthèses.
1. **Couleur de l'en-tête replié.** Le kit V6 le dessine clair (verre card). Or l'heure est blanche en plein écran : elle deviendrait illisible. (Garder la barre foncée `#315E5ECC` validée sur iPhone, avec un titre blanc.)
2. **Contenu des écrans 10 à 14 différent de V5** : noms de carnets, statuts Fait / À faire, badges de type et superset A. (Garder les données et fonctions V5 : V6 change la forme, pas le produit.)
3. **Segments qui changent d'onglet** (04 Séances / Carnets, 10 Muscu / Cardio / Carnets). (Un segment filtre dans la page et ne change jamais d'onglet. L'accès à Progrès reste le bouton « Voir mes progrès » de l'Historique.)
4. **Rouge de suppression `$st1-v6-danger` `#FF3B30`** : validé par Damien le 26/09, réservé aux suppressions.
5. **Haptique** : iOS n'expose aucune vibration aux PWA. (Ne pas coder l'haptique ; garder seulement l'animation visuelle.)

## Plan de code conseillé
Une session par lot, pour garder un contexte léger. Chaque lot est testé sur iPhone avant de passer au suivant.
1. ✅ **Kit `src/ui/`** (26/09, voir `CLAUDE.md`) : V6Header (en remplacement de V5Header, en gardant le comportement collant et foncé), V6TabBar, V6Segment, V6List/V6Item/V6InputItem, V6Sheet, V6ActionSheet, V6Toast, V6SlidingRow, V6Button, V6StickyAction, V6Skeleton, V6Chip. Transitions ramenées à 350 ms (Ionic iOS pousse en 540 ms par défaut). *Fait : kit dans `src/ui/v6.tsx`, `v6Feedback.ts`, `v6Nav.ts` ; V6Header, V6Skeleton et V6TabBar branchés partout ; les autres composants s'adoptent dans les lots suivants. Page d'essai : Profil › Aide & support › Aperçu du kit V6.*
2. ✅ **Séance live** (15, 22, 23, 27, voir `CLAUDE.md`) : V6Stepper (appui long), V6Keypad (`inputmode="none"`), V6SetRow (valider au tap), minuteur en feuille, V6WheelPicker, V6Searchbar, **V6LiveMiniBar** au-dessus des onglets. *Fait : composants dans `src/ui/v6Live.tsx` ; mini-barre dans `src/features/live/LiveMiniBar.tsx`, état `st-live-session`. La page d'aperçu du kit a une section « Séance live (lot 2) ».*
3. ✅ **Today et Carnets** (03, 10 à 14, 24, voir `CLAUDE.md`) : V6ReorderRow, V6ContextMenu (appui long), actions collantes. *Fait : composants dans `src/ui/v6Plan.tsx` (V6SessionRow, V6Badge, V6ReorderList/Row, V6ContextMenu, V6StepperItem, V6TextareaItem) et hooks dans `src/ui/v6Hooks.ts` ; données V5 dérivées dans `src/features/programs/programData.ts`. V6SessionRow et V6ContextMenu sont prêts pour les listes du lot 4 (04, 07, 17).*
4. **Historique, Progrès et cardio** (04, 06 à 09, 16 à 18) : lignes glissables, segments de filtre.
5. **Profil, connexion et états** (01, 02, 19, 20, 21, 25, 26) : listes inset, toggles, déconnexion en feuille d'actions.

## Valider chaque lot
Dans `SportTracker.Web` :
```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```
- **Playwright** : le projet vise WebKit, **absent de l'environnement cloud**. Lancer les tests avec une config temporaire qui passe en Chromium (`launchOptions.executablePath: '/opt/pw-browsers/chromium'`), sans la commiter.
- **Captures sans API** : lancer `npx vite --port 4173`, puis un script Playwright qui intercepte `http://localhost:5294/**` pour renvoyer des données de test, et `localStorage.setItem('st-auth-token', 'x')`. Comparer chaque écran au frame V6.
- **Documentation** : mettre à jour `CLAUDE.md` **et** `AGENTS.md` (même contenu). Le vault Obsidian n'est pas accessible depuis le cloud : le signaler à Damien.
