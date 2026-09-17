# Passation lot 4 — Carnets UI V4

Statut : validé. Branche : `feat/ui-v4`.

Modifications : les pages `/programs`, `/programs/new` et `/programs/{id}` utilisent les composants V4 et leurs styles scoped. La liste couvre chargement, vide « Premier carnet » et erreur réseau avec relance. La création conserve toutes les valeurs en cas d'erreur puis mène au détail du carnet créé. Le détail couvre chargement, 404 et erreur réseau avec relance.

Décision fonctionnelle : le détail affiche « Choisir une séance » et chaque séance est un choix explicite. Le CTA automatique « Démarrer la prochaine séance » a été retiré ; aucune règle de calcul de prochaine séance n'est ajoutée.

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` réussi hors sandbox, 0 avertissement et 0 erreur ; `git diff --check` OK. Recette réellement exécutée dans le navigateur sur API et SQLite temporaires isolées : liste vide, validation du nom requis, création de « Carnet recette » avec « Haut du corps », arrivée sur le détail et lien manuel de séance, 404 `programs/99999`. Les largeurs de document sont identiques au viewport à 320×720, 390×844 et 1280×900.

Référence design : les nœuds Pencil ST1 V4 prévus (`UsVXH`, `TT55x`, `i9BqS`) n'étaient pas accessibles dans la session de contrôle visuel ; l'alignement a donc été effectué avec les composants et tokens V4 déjà validés. À recontrôler visuellement contre ces trois nœuds lors de la recette finale si Pencil est disponible.

Écarts : le retry réseau de Carnets est implémenté mais sa coupure API n'a pas été rejouée ici, faute de session terminal récupérable pour arrêter le serveur temporaire. Les trois erreurs CS7036 héritées restent reportées au lot 10. Aucun endpoint, modèle, migration, base existante ou production n'a été modifié.

Prochain lot : `05-seances-carnet/CONTRAT.md` sur le même checkout et la même branche.
