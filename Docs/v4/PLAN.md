# Refonte UI V4

Branche dédiée : feat/ui-v4, créée depuis master (c003a39). Conserver master ; retour par checkout ou revert, jamais suppression du travail. CLAUDE.md local exclu des commits. Aucun merge/push/déploiement avant recette et instruction dédiée.

Un lot par chat : validation, commit distinct, passation avant suivant. Voir SUIVI.md et dossier du lot. Terra medium principal ; Sol pour 0/6/10, Luna pour 1/7. Le modèle de la session est réglé par le chat, pas par ces fichiers.

Enchaînement automatique autorisé : consulter AUTOMATISATION.md. Le coordinateur lance un seul chat de lot à la fois après validation et passation ; ne pas lancer soi-même le successeur depuis un chat de lot.

Source : design.pen, uniquement via Pencil, ST1 V4 prime sur Stitch. Guide RN6L1, navigation HL6hb. Lire les nœuds du lot, jamais tout le document. Mobile 390 px, contrôles 320 et desktop. Pas de barre de statut fictive.

Tokens : Paragon (8).jpg, Foruner titres, Plus Jakarta Sans contrôles/texte ; cartes #F8FFFFE6, surface #DDF6F4D9, encre #082D45, secondaire #315A70, citron #D4F53C. Assets copiés uniquement si décodables ; ASSETS.md.

API, modèles et routes conservés. Seules nouvelles routes : /profile/preferences et /help protégées (lot 9). Objectif local par compte via email manage/info : défaut 4, entier positif, stockage versionné, défaut et impossibilité sauvegarde si identité/stockage absent. Profil et progrès partagent ce service.

Composants disponibles dans Shared : V4Header(Title, Subtitle, BackHref), V4Button(Href, Type, Disabled, Secondary, OnClick), V4Card(ChildContent), V4ActivityTabs, V4Loading, V4State(Title, Message, IsError, OnRetry, ChildContent). Classes communes css/v4.css. Ne pas imposer de transform/backdrop sur un ancêtre d'élément fixed ; nav 10, backdrop 900, sheet 901.

Fonctions : choix manuel de séance, lancement premier exercice ordonné/inactif si vide, recherche confirmable/annulable, vrais groupes musculaires, retry sans perte, vraie identité et Première séance. Notifications/apps/confidentialité explicitement indisponibles, pas de liens #.

Reportés : push, intégrations, synchronisation préférences, séance persistante début/fin, swipe, pas/calories/zones cardiaques.

Chaque lot : build App + parcours + comparaison V4 avant commit. Recette complète lot 10 : 27 écrans/états, tailles, clavier, focus, superpositions, mouvements réduits, données vides/404/réseau, compte/objectif, suite tests et PWA.

Vault local : vault/. QMD CLI disponible, collection sporttracker (obsidian absente) ; recherche ciblée puis qmd update et qmd embed après notes. Ne pas afficher de secrets pendant validation auth.
