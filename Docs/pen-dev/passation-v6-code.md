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
4. ✅ **Historique, Progrès et cardio** (04, 06 à 09, 16 à 18, voir `CLAUDE.md`) : lignes glissables, segments de filtre. *Fait : `V6SlidingSessionRow` dans `src/ui/v6Plan.tsx`, graphiques / tuiles / bandeau record dans `src/ui/v6History.tsx`, `useV6BackHref` dans `src/ui/v6Hooks.ts` ; données V5 dérivées dans `src/features/history/historyData.ts`. Reste hors lots : l’écran 05 (Nouvelle séance muscu) est encore en V5, et « Modifier la séance » (06) attend l’écran 21 du lot 5.*
5. ✅ **Profil, connexion et états** (01, 02, 05, 19, 20, 21, 25, 26, voir `CLAUDE.md`) : listes inset, toggles, déconnexion en feuille d'actions. *Fait : `src/ui/AuthPages.tsx` (01, 02, 20), `src/features/profile/pages.tsx` (19), éditeur commun 05 / 21 dans `src/features/history/workoutForm.tsx`, état d'échec 25 dans `src/features/history/shared.tsx`, composants d'état dans `src/ui/v6States.tsx`. Correctif API : `PUT api/workoutsessions/{id}` supprime les exercices et séries absents de la liste envoyée (redéployer l'API avec le front). Page d'aperçu du kit retirée.*

**La V6 est terminée (26/09/2026).** Reste la bascule L10, après la checklist iPhone ci-dessous.

## Valider chaque lot
Dans `SportTracker.Web` :
```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```
- **Playwright** : le projet vise WebKit, **absent de l'environnement cloud**. Lancer les tests avec une config temporaire qui passe en Chromium (`launchOptions.executablePath: '/opt/pw-browsers/chromium'`), sans la commiter.
- **Captures sans API** : lancer `npx vite --port 4173`, puis un script Playwright qui intercepte `http://localhost:5294/**` pour renvoyer des données de test, et `localStorage.setItem('st-auth-token', 'x')`. Comparer chaque écran au frame V6.
- **Documentation** : mettre à jour `CLAUDE.md` **et** `AGENTS.md` (même contenu). Le vault Obsidian n'est pas accessible depuis le cloud : le signaler à Damien.

## Revue finale de la V6 (26/09/2026)
Captures Chromium 390 × 844 de chaque écran, comparées aux PNG `design-exports/v6/` (script local non commité : mocks d'API des tests e2e, `deviceScaleFactor: 2`).

**Corrigé pendant la revue** : libellé de retour tronqué au repos (« Carn… », « Histori… », « Séan… ») sur toutes les pages empilées ; débordement horizontal des pages en grille (éditeur 21) ; croix d'effacement visible hors saisie (elle n'apparaît plus que pendant l'édition, comme sur iOS) ; « SPORTTRACKER » et « Adresse e-mail » qui débordaient sur 01 / 02.

**Écarts restants, assumés ou à trancher** :
| Écran | Écart | Pourquoi |
|---|---|---|
| 01 | Pas de « Mot de passe oublié ? » ni de « Dernière synchro il y a 2 min » | L'API n'envoie aucun e-mail (Identity sans `IEmailSender`) ; aucune synchro avant la connexion. À ajouter avec un envoi d'e-mail. |
| 04, 10 | Pas de segment Séances / Carnets ni Muscu / Cardio / Carnets | Décision 3 : un segment ne change jamais d'onglet. |
| 05 | Pas de cercle de validation des séries ; superset créé par le menu de l'exercice (appui long ou tap), pas par un bouton « Créer un superset » | Saisie après coup, pas en direct ; un bouton de plus pour une action rare. |
| 05, 08, 21… | La barre d'onglets reste visible sous les pages empilées | Comportement d'`IonTabs`, identique aux lots 3 et 4. |
| 07 | Pas de pastille « Tout est synchronisé » ; activités de l'API (Course, Vélo, Natation, Marche) au lieu de « Rameur » | Données V5. |
| 08, 09 | Pas de calories, RPE, note, allure par km ni record « meilleur 5 km » | L'API ne les stocke pas (écarts du lot 4). |
| 10 à 14 | Noms et contenus des carnets V5 | Décision 2 : données V5, forme V6. |
| 19 | Pas de « Unité de poids » ni de « Type de série par défaut » ; ajout de « Objectif hebdomadaire », « Rester connecté », « Aide & support » | L'app ne gère que le kg et le type se choisit série par série : pas de réglage factice. |
| 21 | Date en champ date natif (pas une ligne à chevron) ; retour libellé « Séance » (maquette : « Détail ») | Sélecteur de date iOS natif ; libellés de retour cohérents avec les autres pages. |
| 25 | L'écran garde son titre (« Modifier la séance ») ; le toast recouvre un instant le haut de l'état en ligne | L'erreur est un état de la page, pas une page ; le toast se ferme en le glissant. |
| Tous | Pas d'haptique | Décision 5 : iOS n'en expose pas aux PWA. |
| Tous | Captures plus hautes que les maquettes | Pas de zone de sécurité en Chromium (barre d'état à 0) ; à juger sur iPhone. |

## Checklist iPhone avant la bascule (L10)
À dérouler sur `https://beta.fmon-vps-n8n.fr`, app **installée sur l'écran d'accueil**, après avoir redéployé **l'API et le front** (le correctif de `PUT api/workoutsessions/{id}` est côté API). Chaque ligne se coche si le comportement est celui décrit.

**Installation et plein écran**
- [ ] L'app se met à jour à l'ouverture (fermer puis rouvrir) ; jamais pendant une séance live.
- [ ] Bord à bord : heure et batterie blanches sur le fond turquoise, aucun blanc sous la barre d'état, ni pendant une transition, ni au rebond.
- [ ] Aucun zoom : double-tap, pincement, focus d'un champ (e-mail, nom, note, distance).
- [ ] Icône, écran de lancement, retour d'arrière-plan sans écran blanc.

**Connexion / Inscription (01, 02)**
- [ ] Le segment bascule Connexion ↔ Créer un compte sans animation parasite.
- [ ] Le trousseau iOS propose l'e-mail et le mot de passe ; « Aller » du clavier valide.
- [ ] Mauvais mot de passe : message à l'encre, pas de rouge.
- [ ] « Rester connecté » coupé : fermer l'app (balayage) puis rouvrir → écran de connexion. Allumé : toujours connecté.
- [ ] Inscription : l'objectif choisi (2 à 5) apparaît sur Aujourd'hui et dans le Profil.

**Navigation et en-têtes (tous les écrans)**
- [ ] Grand titre qui se replie en barre foncée floutée, petit titre blanc lisible sous l'heure.
- [ ] Libellé de retour complet au repos (« Historique », « Carnets », « Séance »).
- [ ] Transitions de 350 ms ; le retour ramène à la page qui a poussé (Historique, Séances, Aujourd'hui).
- [ ] Onglets : pastille citron sur l'onglet actif ; mini-barre « séance en cours » au-dessus pendant une séance live.
- [ ] Tirer pour rafraîchir sur Aujourd'hui, Carnets, Historique, Séances, Cardio, Profil.

**Séance live (15, 22, 23, 27)**
- [ ] Steppers : un tap = un pas, appui long = répétition, un défilement qui démarre sur la touche ne change rien.
- [ ] Pavé (22) : jamais le clavier système ; virgule, effacement, bascule poids / reps.
- [ ] Cercle de série → ligne citron + minuteur (23) aux crans 25 % puis 50 % (toucher la poignée) ; le minuteur reste juste après verrouillage de l'écran.
- [ ] Glisser une série validée à gauche → Supprimer.
- [ ] Bibliothèque (27) : recherche + « Annuler », puces, sélection multiple, création d'exercice.
- [ ] Profil › « Afficher le RPE » coupé → la rangée RPE disparaît de l'écran live.
- [ ] Mode avion pendant la séance : les séries restent, « sync en attente », puis envoi au retour du réseau (une seule fois).

**Aujourd'hui et Carnets (03, 10 à 14, 24, 26)**
- [ ] Chargement (26) : squelettes à la place du contenu, jamais de roue pleine page ; les onglets répondent pendant le chargement.
- [ ] Appui long sur un carnet et sur une séance → menu flouté ; Supprimer en rouge système.
- [ ] Réordonnancement à la poignée ≡ (13, 14), retrait par glissement confirmé en feuille d'actions.
- [ ] Molette du repos (13) fluide, aimantée.

**Historique, Progrès, cardio (04, 06 à 09, 16 à 18)**
- [ ] Glisser une séance à gauche = Supprimer (confirmation), à droite = Dupliquer ; appui long = menu.
- [ ] Filtres (segment, puces) sans changement d'onglet ; « Voir mes progrès » ouvre Progrès.
- [ ] Nouvelle sortie / Modifier la sortie : durée à la molette, distance avec virgule.

**Nouvelle séance et Modifier la séance (05, 21)**
- [ ] Détail d'une séance (06) → « Modifier la séance » collant → éditeur (21).
- [ ] Poignée ≡ d'un exercice : la carte se soulève et se déplace ; l'ordre est gardé après « Enregistrer » et un rafraîchissement.
- [ ] Glisser une série à gauche → Supprimer ; après « Enregistrer », elle a disparu aussi sur le serveur (rafraîchir le détail).
- [ ] Tap sur une série → feuille avec type, RPE et pavé ; « Ajouter une série » recopie la précédente.
- [ ] Appui long sur un exercice → Superset avec le précédent / Sortir du superset / Retirer.
- [ ] Saisir puis quitter l'app (balayage) → rouvrir « Nouvelle séance » : « Brouillon repris », tout est là.
- [ ] « Supprimer la séance » → feuille d'actions rouge système → retour à la liste.

**Erreur d'enregistrement (25)**
- [ ] Mode avion puis « Enregistrer » (séance ou sortie cardio) : toast avec « Réessayer », état « Le serveur n'a pas répondu » **sans rouge**, liste « En attente de synchronisation », boutons « Garder en local » / « Réessayer ».
- [ ] Couper le mode avion : l'enregistrement repart tout seul.
- [ ] « Garder en local » puis rouvrir l'écran : brouillon repris.

**Profil et page introuvable (19, 20)**
- [ ] Avatar → Profil avec retour « Aujourd'hui » ; toggles fluides (couleur citron).
- [ ] « Se déconnecter » → feuille d'actions → écran de connexion ; les brouillons non envoyés repartent à la reconnexion.
- [ ] Adresse inconnue (ex. `/tabs/xyz`) : page introuvable avec la barre d'onglets, « Revenir à l'accueil », « Reprendre ».

**Avant de basculer (L10)**
- [ ] Aucun brouillon en attente (Profil › Synchronisation : « Automatique dès le retour en ligne », pas de séance en attente).
- [ ] Les brouillons Blazor `sporttracker-live-v1` sont synchronisés depuis l'ancienne app.
- [ ] Le jeton `st-auth-token` de l'ancienne app est repris (pas de reconnexion demandée).
