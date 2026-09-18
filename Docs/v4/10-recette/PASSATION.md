# Passation lot 10 — Recette finale UI V4

Statut : recette réalisée, corrections committées ; écarts restants listés ci-dessous (aucun bloquant fonctionnel). Branche : `feat/ui-v4`. Session Claude Code Opus 5 / medium (abonnement Pro), `898a0648-8f80-481a-83e0-108c0cd975a4`, interrompue une fois par quota (reset 12:40 UTC) puis reprise exacte.

## Commits

| Commit | Contenu |
|---|---|
| `ffbf249` | Profil sous coupure API totale + retry ; objectif hebdomadaire isolé par compte |
| `f265d09` | CS7036 hérités corrigés, tests `WeeklyGoalService` + isolation `LogSet` |
| `56fd1c0` | Piège de focus / retour clavier des dialogues modaux (`wwwroot/js/v4-dialogs.js`) |
| `1cf1d34` | Corrections de recette : formulaires, conteneurs, contenus longs, `<main>` unique, focus des champs |
| `d69e1aa` | Manifeste PWA aligné V4 |

## Défauts trouvés et corrigés

- **Profil sous coupure totale puis retry (priorité)** — reproduit : la page ne restait pas bloquée dans ce scénario, mais `WeeklyGoalService` mémorisait l'échec de `manage/info` pour toute la session WASM. Après « Réessayer », Profil affichait l'objectif par défaut (4 au lieu de 6) et Préférences restait « indisponibles » jusqu'au rechargement. Correction : identité mise en cache pour le jeton courant seulement, échecs jamais mémorisés, appels concurrents partagés (un seul `manage/info`, Profil passe par le service), « Réessayer » sur Préférences indisponibles.
- **Objectif partagé entre comptes** — reproduit : après déconnexion → connexion B sans rechargement, B lisait `0 / 6` (objectif de A) et aurait écrit dans la clé de A. Corrigé par le cache lié au jeton.
- **Tests** : 3 CS7036 (constructeur `SportTrackerDbContext` + `ICurrentUserService` depuis 4d) → `FakeCurrentUserService` ; 6 tests `LogSet` obsolètes (la séance de carnet est désormais atteinte via son carnet filtré par `UserId`) → carnet du compte courant + test d'isolation. Projet de tests référence `SportTracker.App` pour tester `WeeklyGoalService` (14 cas).
- **Dialogues** : aucun piège de focus (Live saisie précise / minuteur / GIF, sélecteurs d'exercice). Script partagé sans interop : Tab/Maj+Tab confinés au dialogue au premier plan, focus initial si absent, retour du focus à l'élément d'origine, Échap sur les sélecteurs (`data-escape-close`).
- **Formulaires muscu et séance de carnet** : champs `InputText/InputDate/InputNumber` sans style V4 (CSS scoped non appliqué aux composants) ; champ durée débordant de la carte dès 390 px.
- **Profil, Préférences, Aide, Historique d'exercice** : pas de conteneur V4 (titre collé en haut, cartes collées aux bords) ; l'historique réutilisait `.app-main` du layout.
- **Contenus longs** : titre de séance du jour débordant de la carte (mot long), tuile « 52 M… » tronquée sur le détail muscu, bandeau des séries Live (> 4 séries) débordant de 25 px à 320 px avec série active hors champ.
- **Repères** : 11 pages imbriquaient un `<main>` dans celui du layout → `<div>`.
- **Focus des champs** : contour encre à 25 % d'opacité (contraste insuffisant) → encre pleine.
- **PWA** : manifeste du gabarit Blazor (`SportTracker.App`, `#03173d`, blanc) → `SportTracker`, `#082D45`, `#DDF6F4`, meta `theme-color`.

## Validations (UI réelle isolée)

API 5294 + App 5281 lancées en processus Windows natifs (`Start-Process`, `--no-launch-profile`, `ASPNETCORE_ENVIRONMENT=Development`), SQLite temporaire du scratchpad, comptes synthétiques `lot10-a@sporttracker.local` (séances muscu/cardio, carnet au nom long, séance vide) et `lot10-b@sporttracker.local` (vide). Playwright MCP isolé visible.

- Build App 0 avertissement / 0 erreur ; build API 0 erreur (6 avertissements préexistants, API non modifiée) ; **suite 54/54** (39 existants + 15 nouveaux).
- **27 états Pencil** : noms des 27 nœuds revalidés, exports PNG comparés côte à côte aux captures 390 px (planches). Conformes après corrections ; écarts ci-dessous.
- **Tailles** : 27 états + Préférences, Aide, historique à un point à 320×720, 390×844, 1280×900 : aucun défilement horizontal, aucun texte coupé hors troncature volontaire, un seul `<main>` et un seul `<h1>` partout.
- **Coupure API totale (processus arrêté)** : Profil en erreur au rechargement (≈ 5 s), au retry pendant la coupure et via navigation ; Progrès idem ; aucune exception non gérée ni bandeau d'erreur Blazor. API relancée → Réessayer : identité réelle et objectif 6 sur Profil et Préférences. Validé deux fois (avant et après toutes les corrections).
- **Identité indisponible** (`manage/info` 500) : Profil « Compte » + objectif par défaut, Préférences « indisponibles » + Réessayer → objectif réel retrouvé. **Stockage indisponible** (`SecurityError` sur les clés d'objectif) : défaut affiché, enregistrement refusé avec message, valeur stockée intacte.
- **Changement de compte sans rechargement** : A → 6, B → 4 (aucun badge), retour A → 6 ; B enregistre 2 dans sa propre clé ; clés distinctes vérifiées.
- **Dialogues** : saisie précise, minuteur, GIF, sélecteur d'exercice : 0 sortie de focus sur 20–48 Tab/Maj+Tab, focus initial dans le dialogue, fermeture Échap → focus rendu au déclencheur.
- **Clavier** : 20 routes, lien d'évitement en premier, navigation atteinte, focus visible (contour encre).
- **Historique à un point** : charge 40 kg × 10 → 1RM 53,3 kg (Epley), une entrée « Record », graphique masqué sous 2 points (choix du code, courbe sans tendance) ; exercice au poids du corps → 1RM 0 kg.
- **Mouvements réduits** : aucune animation/transition > 10 ms sous `prefers-reduced-motion: reduce` (squelette `st-shimmer 1.5s` → `none`).
- **PWA** : manifeste lié et valide, icônes 192/512 décodées aux tailles déclarées, service worker enregistré ; publication Release : `service-worker-assets.js` (136 ressources) contient `js/v4-dialogs.js`, polices, fond, icônes, manifeste.
- Erreur d'enregistrement (25) et chargement (26) : simulés par interception Playwright (abandon POST, latence) pour la capture ; la vraie coupure réseau est couverte par les tests ci-dessus et les lots 3/5/6.

## Écarts restants (non bloquants)

- Icônes PWA = logo Blazor par défaut : aucune icône d'application dans Pencil ; à dessiner (décision produit).
- Mode hors ligne du build publié non exercé de bout en bout (nécessite un serveur statique de la sortie Release) ; seul le contenu du manifeste hors ligne est vérifié.
- Accueil : « Bonjour Sportif » (nom générique) au lieu du prénom de la maquette — aucune donnée de prénom dans le modèle.
- Listes Historique / Séances : noms longs tronqués par ellipse (nom complet sur le détail).
- Stockage indisponible : le stepper reste éditable, l'échec n'apparaît qu'à l'enregistrement (message explicite, aucune écriture).
- Accents absents des titres Foruner : glyphes absents de la police, identique à Pencil.
- Historique d'exercice : pas de graphique sous 2 points (voir ci-dessus).

## Nettoyage

Serveurs API/App arrêtés (aucun port 5294/5281 à l'écoute, aucun processus `SportTracker.*`), base SQLite, jetons, sortie de publication, scripts et captures `.playwright-mcp` supprimés. `CLAUDE.md` hors commits. Aucun endpoint, modèle, migration, merge, push ni déploiement. Aucun successeur : lot 10 = dernier lot du plan.
