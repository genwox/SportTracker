# Passation lot 4 — Carnets UI V4

Statut : validé. Branche : `feat/ui-v4`. Code : `2b59dbf`.

Modifications : les pages `/programs`, `/programs/new` et `/programs/{id}` utilisent les composants V4 et leurs styles scoped. La liste couvre chargement, vide « Premier carnet » et erreur réseau avec relance. La création conserve toutes les valeurs en cas d'erreur puis mène au détail du carnet créé. Le détail couvre chargement, 404 et erreur réseau avec relance.

Décision fonctionnelle : le détail affiche « Choisir une séance » et chaque séance est un choix explicite. Le CTA automatique « Démarrer la prochaine séance » a été retiré ; aucune règle de calcul de prochaine séance n'est ajoutée (confirmé conforme au contrat malgré sa présence dans la maquette Pencil).

Référence design — débloquée cette session : Pencil MCP authentifié et opérationnel. Nœuds `UsVXH` (10 · Carnets), `TT55x` (11 · Nouveau carnet), `i9BqS` (12 · Détail du carnet) lus et comparés par capture d'écran à l'implémentation : cartes translucides, carnet vedette avec CTA citron « Ouvrir le carnet », formulaire de création (nom, objectif, couleur, séances), détail avec statistiques et liste de séances. Correspondance structurelle et visuelle confirmée.

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` et `dotnet build SportTracker.Api/SportTracker.Api.csproj` réussis hors sandbox, 0 avertissement et 0 erreur. Recette réellement exécutée dans un navigateur Playwright MCP isolé (config `--isolated`, compte synthétique `lot4-carnets@sporttracker.local`) sur API et SQLite temporaires isolées (ports dédiés, base dans le scratchpad de session, supprimée après recette) :
- Liste vide « Premier carnet », navigation vers création.
- Création « Force & Régularité » / objectif / séance « Haut du corps » : API arrêtée pendant la sauvegarde, alerte « Création impossible » affichée, toutes les valeurs du formulaire conservées (vérifié via DOM) ; API redémarrée, « Réessayer la création » mène au détail créé avec les bonnes valeurs.
- Liste et détail : coupure API puis erreur affichée, redémarrage API puis « Réessayer » restaure le contenu correct dans les deux cas.
- 404 authentifié sur `programs/99999` vérifié.
- Largeur de document égale au viewport sans défilement horizontal à 320×720, 390×844 et 1280×900 sur liste, création et détail.
- Navigation clavier : Tab atteint d'abord le lien d'évitement puis les champs du formulaire dans l'ordre logique.
- Aucune erreur console inattendue : les seules erreurs enregistrées correspondent aux coupures réseau et au 404 volontairement provoqués.

Outils : Pencil MCP (lecture/capture uniquement, pas d'interaction formulaire) a servi à la comparaison design. Playwright MCP officiel (`@playwright/mcp@latest`) a été ajouté à la configuration locale du projet pour piloter le navigateur (clic, saisie, redimensionnement, clavier) — nécessaire pour la recette authentifiée, absent auparavant. Décision validée explicitement par l'utilisateur avant installation.

Écarts : l'API de liste ne charge pas les séances imbriquées ; les compteurs potentiellement faux ont été retirés de la liste plutôt que d'afficher une information inventée (déjà en place, confirmé toujours correct). Les trois erreurs CS7036 héritées restent reportées au lot 10. Aucun endpoint, modèle, migration, base existante ou production n'a été modifié. `CLAUDE.md` reste hors commits.

Nettoyage : processus serveurs isolés (API/App) et base SQLite temporaire du scratchpad supprimés en fin de session ; deux processus `dotnet` orphelins d'une session précédente (17/09 22:11) également arrêtés au démarrage de cette session.

Prochain lot : `05-seances-carnet/CONTRAT.md` sur le même checkout et la même branche.
