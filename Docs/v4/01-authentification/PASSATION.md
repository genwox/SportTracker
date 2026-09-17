# Passation lot 1 — authentification UI V4

Statut : implémenté. Branche : `feat/ui-v4`. Commit : `b1bb5c9f86aad98e3c20c4cb647de5baab0198b1` (`feat(ui): porte les écrans auth V4`).

Modifications : portage des écrans Login/Register selon ST1 V4 (en-têtes, cartes d’introduction, champs, CTA et liens secondaires), portage de NotFound pour l’état 404 authentifié, styles responsives dans `wwwroot/css/v4.css`, et ajout des trois illustrations PNG utilisées par les écrans.

Comportements conservés : `AuthService` et endpoints Identity inchangés, validation DataAnnotations inchangée, erreurs d’API conservées, redirection post-login avec `ReturnUrl`, inscription puis connexion automatique, routes anonymes `/login` et `/register` via `EmptyLayout`.

Validations : `dotnet build SportTracker.App --no-restore` réussi avec 0 avertissement / 0 erreur (hors sandbox, hôte WASM). Rendu navigateur vérifié sur `/login` et `/register` : structure, assets, polices, CTA et liens visibles ; validation à vide observée sur login. `git diff --check` OK. Contrôle desktop visuel OK.

Limites : le navigateur de recette ne permettait pas de redimensionner le viewport à 390/320 ; les règles CSS dédiées au 360 px ont été contrôlées statiquement. `/not-found` est protégé par `MainLayout` et redirige vers `/login` sans session : son rendu 404 authentifié n’a pas pu être visualisé sans compte de test, sans saisir ni transmettre d’identifiants. Les trois CS7036 de tests DbContext restent préexistantes et reportées au lot 10.

Aucun endpoint, migration, backend, merge, push ou déploiement. `CLAUDE.md` reste modifié localement et hors commit.

Prochain lot : `02-musculation/CONTRAT.md`, sur la même branche et le même checkout.
