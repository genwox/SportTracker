# Passation lot 2 — musculation UI V4

Statut : implémenté. Branche : `feat/ui-v4`. Commit : `a49665e82dbcffc64acfb462d1e3b538f9f3f0c9` (`feat(ui): porte la musculation V4`).

Modifications : les routes `/workoutsessions`, `/workoutsessions/new` et `/workoutsessions/{id}` sont portées depuis les frames Pencil ST1 V4 `XWc5M`, `RhUlZ` et `O63J6l`. Elles utilisent les composants partagés V4 et leurs styles scoped. La liste affiche ses cartes compactes, le formulaire conserve la recherche d'exercices et les séries dynamiques, et le détail présente le bilan (durée, volume, exercices) et les séries.

Résilience : états de chargement, vide « Première séance », 404 et réseau avec relance ajoutés. Après une erreur de création, le formulaire et toutes les valeurs saisies restent en mémoire pour permettre une nouvelle tentative.

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` réussi hors sandbox : 0 avertissement, 0 erreur. `git diff --check` OK. Les frames de référence ont été lues via Pencil exclusivement et comparées structurellement (typo Foruner, cartes translucides, fond texturé, actions citron, espacements mobile et safe area). Recette réellement exécutée avec API locale et SQLite temporaire isolée : connexion d’un compte synthétique, liste vide, création d’une séance avec un exercice et deux séries (60×10, 65×8), détail et volume 1,1 t, 404, erreur réseau de sauvegarde (valeurs préservées), puis nouvelle tentative réussie. L’API, l’app et les fichiers SQLite temporaires ont été arrêtés/supprimés.

Écarts / limites : le navigateur intégré n’expose pas de capability viewport utilisable ici ; les validations réelles 390×844, 320×720 et desktop restent à effectuer en recette. Aucun endpoint, migration, backend, merge, push ou déploiement.

Problèmes connus : les trois CS7036 préexistants des tests DbContext restent reportés au lot 10. `CLAUDE.md` est une modification locale préexistante, non incluse.

Prochain lot : `03-cardio/CONTRAT.md` sur la même branche et le même checkout.
