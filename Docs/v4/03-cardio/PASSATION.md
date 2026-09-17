# Passation lot 3 — cardio UI V4

Statut : implémenté. Branche : `feat/ui-v4`. Commit : `e6981f8559930334be30efc6bd5d8387cf20d66c` (`feat(ui): porte le cardio V4`).

Modifications : les routes `/cardiosessions`, `/cardiosessions/new` et `/cardiosessions/{id}` utilisent désormais les composants V4, les cartes translucides, les actions citron et les marges de safe area. La liste couvre chargement, vide « Première sortie » et erreur réseau avec relance. Le formulaire garde ses valeurs après une erreur de sauvegarde, permet une nouvelle tentative et mène au détail créé. Le détail couvre chargement, 404 et erreur réseau avec relance.

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` réussi hors sandbox : 0 avertissement, 0 erreur. `git diff --check` OK. Une API locale sur SQLite temporaire isolée et un compte synthétique ont validé : liste vide, création (Run test, 5,2 km / 31 min), détail et 404 authentifié. Les erreurs réseau sont capturées par les trois pages et le formulaire conserve son modèle ; ce comportement a été contrôlé par le chemin d’exception, sans endpoint modifié.

Écarts / limites : les frames Pencil ciblées et les viewports réels 390×844, 320×720 et desktop ne sont pas accessibles dans la capability actuelle ; ils restent à vérifier en recette. Aucune base existante ou production n’a été touchée. Les trois CS7036 hérités des tests DbContext restent reportés au lot 10.

Prochain lot : `04-carnets/CONTRAT.md` sur le même checkout et la même branche.
