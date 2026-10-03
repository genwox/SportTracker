# Correctifs iOS, plein écran natif et préparation de la V6 avec pen.dev

- **Date(s)** : 2026-09-26
- **Session** : https://claude.ai/code/session_011zAbaefRbygsaxgsun7PgY · branche `genwox/master-2`
- **Étape du projet** : 4g (migration Ionic), après la vague 5, avant les lots V6
- **Commits** : `22b3eba` + `d3b05e3` skill et prompts pen.dev · `16ef379` correctifs iOS, routes, GIF, Carnets · `33079f1` plein écran natif · `0d038a4` mise à jour PWA · `c89f18d` skill aligné · `74528fe` fiche de passation

## Ce qui a été fait
- **Méthode pen.dev pour la V6** (`Docs/pen-dev/`) : un skill partagé `sporttracker-native/SKILL.md` (identité V5 figée, 19 motifs natifs Ionic, règles de canevas), des prompts en 4 phases (kit, 27 écrans en Split Work, variantes en Side by Side, harmonisation) et un mode d'emploi. Damien a produit la V6 dans `design.pen` (kit, 27 écrans, parcours, rapport) et l'a exportée en PNG dans `design-exports/v6/`.
- **Ménage git** : `master` avancé jusqu'à la dernière version (avance rapide). 6 branches supprimées (`genwox/master`, `genwox/Hevy-copy*`, `feat/ui-v4`, `claude/zen-cori-wvv1dp`), toutes déjà contenues dans `master`. Sur le VPS, le vieux `master` (historique d'avant réécriture) a été réaligné : sauvegarde dans `sauvegarde-master-vps`, puis `checkout -B master origin/master`.
- **Correctifs iOS** (`16ef379`), après le test de Damien sur son iPhone :
  - zoom bloqué : viewport `maximum-scale=1`, champs à 16 px, `touch-action`, `gesturestart` refusé ;
  - en-tête `V5Header` collant, qui devient une barre floutée foncée au défilement ;
  - bug de routes : « Nouveau carnet », « Nouvelle séance du carnet » et « Nouvelle sortie » ouvraient la page de détail ;
  - GIF : miniatures `ExerciseThumb` et démonstration en feuille `ExerciseDemoSheet` au lieu d'un lien externe ;
  - pages Carnets 10 à 14 remises au niveau V5 ;
  - revue des autres pages : titres coupés en plein mot, avatar minuscule, couleurs de sous-titre, chevron cardio, « Page introuvable » qui débordait, lien « ‹ Séance ».
- **Plein écran natif** (`33079f1`) :
  - fond Paragon sur `html`/`body`/`ion-app`/`.ion-page` ;
  - `theme-color` et manifeste en `#1A7964` ;
  - barre d'onglets translucide ;
  - vraie icône d'app : l'icône Blazor violette était restée ;
  - écrans de lancement iOS pour 11 tailles (`scripts/pwa-assets.mjs`) ;
  - bandeau « Passe en plein écran » dans Safari sur iPhone.
- **Mise à jour PWA** (`0d038a4`) : le nouveau service worker s'applique désormais à l'ouverture ou au retour dans l'app, jamais sur `/live`.
- **Passation** (`74528fe`) : `Docs/pen-dev/passation-v6-code.md` (sources V6, acquis, 5 décisions, plan en 5 lots), puis les 5 prompts de lots.

## Décisions prises
- **Corriger les bugs iOS dans le code avant la V6** : zoom et en-tête relèvent du code, pas du design (Claude, accepté par Damien).
- **Plein écran = app installée.** Barre d'état `black-translucent` et `viewport-fit=cover` ; Safari ne permet pas le plein écran à un site, d'où le bandeau d'installation (Damien).
- **Barre de défilement foncée `#315E5ECC` avec titre blanc**, pour que l'heure blanche reste lisible. Le kit V6 dessinait une barre claire : décision reportée au lot 1 (Claude, recommandation).
- **Modèles dans pen.dev.** Claude via un abonnement dans une app tierce consomme de « l'usage supplémentaire » payant. D'où Codex **GPT-6 Sol** pour l'étape 2 en Split Work (exécution, quota), et Claude pour le kit et l'harmonisation (Damien, sur conseil de Claude).
- **5 lots de code, une session par lot** : kit, live, Today/Carnets, Historique/cardio, Profil/états (Claude).

## Problèmes rencontrés et solutions
- **Routes « new » avalées par leur route `:id`.** Cause : `IonRouterOutlet` (`@ionic/react-router` 8, `matchRoute`) retient la **dernière** route qui correspond, pas la première. Correctif : déclarer chaque chemin statique après son jumeau paramétré. Un test e2e échoue sans le correctif et passe avec.
- **L'iPhone affichait l'ancienne version, et l'installait.** Cause : `registerType: 'prompt'` sans `onNeedRefresh`, donc le nouveau service worker restait en attente pour toujours. L'ancien `index.html` précaché était servi, et Safari l'a même utilisé pour « Sur l'écran d'accueil » (sans les meta plein écran). Correctif : `updateSW(true)` à l'ouverture ou au retour, hors `/live`. Pour s'en sortir une fois : supprimer les données du site dans Safari, puis réinstaller.
- **Chevron cardio sur une ligne à part** : une règle CSS écrite plus bas imposait 3 colonnes, alors que la ligne cardio en a 4. Correctif avec `:has(> .history-distance)`.
- **Le script de génération d'icônes produisait des images vides** : le masque CSS et la police étaient refusés depuis `about:blank` (origine différente). Correctif : charger d'abord une page de même origine.
- **VPS : « divergent branches » et « no such service: web »** : son `master` local datait d'avant la réécriture de l'historique. `git cherry` a confirmé qu'il ne contenait rien d'unique, puis il a été réaligné.
- **pen.dev, erreur 400 « Third-party apps now draw from your extra usage »** : contournée en passant par Codex ou Claude Code.

## Apprentissages
- **iOS zoome sur tout champ en dessous de 16 px** et reste zoomé ; `maximum-scale=1` + `touch-action` + `gesturestart` évitent le pincement.
- **Plein écran iOS** : `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style=black-translucent` ; le contenu passe sous l'heure, qui est blanche. Ces meta ne sont lues **qu'à l'installation**.
- **Service worker en mode « prompt »** : sans appel à `updateSW`, une nouvelle version n'est jamais appliquée. iOS reprend une app au lieu de la relancer : il faut aussi vérifier au retour (`visibilitychange`).
- **IonRouterOutlet** : la dernière route qui correspond l'emporte. Les chemins statiques vont donc après les chemins paramétrés.
- **pen.dev** :
  - fichier `.pen` en JSON, versionné par git ;
  - Split Work utilise le modèle principal pour tous les agents et les lance après l'envoi ;
  - Side by Side donne un modèle par agent, sur la même tâche ;
  - skills `SKILL.md` appelés par `/nom` ;
  - fournisseurs multiples.
- **Git** :
  - `merge --ff-only` pour avancer sans risque ;
  - `git cherry` pour vérifier qu'une branche à l'historique réécrit n'a rien d'unique ;
  - `checkout -B` pour réaligner une branche locale, après sauvegarde.

## Validation
- `npm run lint`, `typecheck` et `build` OK ; `npm test` 47/47 ; Playwright **9/9 en Chromium**, dont le nouveau test de routes. WebKit n'est pas disponible dans le cloud.
- Captures 390×844 avant/après de toutes les pages, avec API simulée ; rendu iPhone simulé (user-agent iOS) pour le bandeau et la barre d'onglets.
- Validé par Damien sur iPhone : nouvelle version installée, plein écran OK.

## Reste à faire
- (Fait depuis : lots V6 1 à 5, commits `8f87719` à `52d0875`, à documenter par leurs propres comptes rendus.)
- **L10 bascule** vers `app.fmon-vps-n8n.fr` (Damien, `Docs/migration-ionic/plan-4g.md` section F).
- Reverser ce compte rendu dans Obsidian, puis réindexer (`qmd update && qmd embed`). Reconstruire graphify à la fin.

## Notes Obsidian à mettre à jour
- `03-Features` : note *Étape 4g — Migration frontend Ionic React* (correctifs iOS, plein écran, V6 conçue dans pen.dev).
- `02-Decisions` : nouvelles notes *Plein écran PWA iOS (barre d'état translucide)*, *Workflow pen.dev multi-agents pour la V6*.
- `05-Apprentissages` : *Zoom iOS et champs < 16 px*, *Mise à jour de service worker en mode prompt*, *Ordre des routes IonRouterOutlet*, *pen.dev : Split Work vs Side by Side*.
- `04-Journal` : 2026-09-26.
