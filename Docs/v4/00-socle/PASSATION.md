# Passation lot 0

Branche : `feat/ui-v4`. Départ conservé : `master`, `c003a39`.
Commit implémentation : `b318b1c1455cbf962ae67f2a3276e2c91d14ea8c` — feat(ui): initialise le socle V4 et les contrats des lots.
Modèle prévu par contrat : Sol / medium ; les réglages de modèle du chat ne sont pas pilotés par le dépôt.

Modifications : assets Paragon/Foruner et cinq icônes intègres copiés avec contrôle SHA-256, Plus Jakarta Sans 400–800 téléchargée depuis Google Fonts puis auto-hébergée ; tokens, css/v4.css, shell 100dvh/safe areas, navigation 5 entrées, onglets Muscu/Cardio/Carnets dans les trois listes. Composants V4Header, V4Card, V4Button, V4ActivityTabs, V4Loading et V4State. Cache PWA élargi TTF/WOFF2. PLAN/SUIVI et dossiers autonomes lots 0–10.

Validations : dotnet build SportTracker.App --no-restore OK, 0 avertissement/erreur (hôte MSBuild WASM requiert exécution hors sandbox). Guide RN6L1 et navigation HL6hb lus via Pencil ; IDs des 27 frames ST1 V4 vérifiés et répartis dans les contrats. Page temporaire de contrôle des composants à 390×844, 320×720 et 1280×900 : aucun débordement horizontal, polices locales chargées ; page supprimée avant commit, App recompilée. git diff --check OK. Contrôle PWA statique des filtres de cache ; véritable parcours offline à faire au lot 10.

Suite existante : dotnet test SportTracker.Tests -v minimal échoue à la compilation (CS7036). ExerciseControllerTests.cs:25, MuscleGroupValueConverterTests.cs:25 et WorkoutProgramRepositoryTests.cs:26 omettent le paramètre ICurrentUserService du DbContext. Défaut préexistant, aucun fichier backend/test modifié. La restauration signale aussi NU1903 sur Microsoft.OpenApi 2.0.0 et SQLitePCLRaw.lib.e_sqlite3 2.1.11.

Écarts et limites : contrôles de composants sans compte connecté ; navigation authentifiée, créations et rendu des pages métier ne sont pas validés. Ces pages gardent leur CSS scoped antérieur jusqu'à leur lot. Le composant Pencil HL6hb affiche des icônes manquantes dans sa capture ; les PNG locaux demandés sont décodables et affichés côté Blazor, une comparaison stricte des pictogrammes reste à faire en recette. Les sous-libellés citron sont réservés aux zones sur le fond dans les composants V4.

Vault : deux notes mises à jour via la jonction vers C:/Users/pyrog/PROG/Obsidian/SportTracker. QMD MCP absent ; CLI collection sporttracker, obsidian absente. qmd update OK (2 notes), qmd embed OK (11 chunks). Ne pas ajouter vault au commit car c'est une jonction externe.

État local : CLAUDE.md modifié préservé/exclu ; aucun push, merge ou déploiement. La page temporaire /v4-review n'existe plus dans le code final. Le serveur de contrôle est arrêté en fin de session.

Prochain lot : `01-authentification/CONTRAT.md`, Luna / medium, écrans 01 CA1IZ, 02 OuSuY, 20 VOZ4K. Lire PLAN, ce contrat, cette passation, notes auth/Blazor pertinentes et seulement Login/Register/NotFound + Auth si nécessaire. Préserver comportements Identity et redirections. Build, contrôles de parcours et comparaison V4 avant commit. Ne pas démarrer les autres lots dans le même chat.
