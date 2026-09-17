# Lot 9 — profil

Branche : `feat/ui-v4`. Modèle prévu : Terra, raisonnement medium.
Mission : porter profil suivant ST1 V4, sans modifier les contrats API.
Références Pencil vérifiées le 17/09/2026 : 19 : ITixI. Revalider les noms avant lecture ciblée.
Lire PLAN.md, ce contrat, ../08-accueil-bilans/PASSATION.md, puis uniquement notes pertinentes du vault et code utile.

Fichiers autorisés (préfixe SportTracker.App sauf indication) : Pages/Profile.razor*, Pages/ProfilePreferences.razor*, Pages/Help.razor*, Services/WeeklyGoalService.cs, Program.cs.
Dépendances : lot précédent validé ; V4Header, V4Card, V4Button, V4ActivityTabs, V4Loading, V4State et css/v4.css.
Ajouts autorisés : CSS scoped, composants spécifiques au lot et tests de nouvelles règles ; changement partagé à documenter. Aucun endpoint, migration, Tailwind.

Réception : Ajouter /profile/preferences et /help protégées. WeeklyGoalService : défaut 4, entier positif ; clé versionnée par email manage/info, jamais Sportif. Stockage/identité indisponibles : défaut et sauvegarde impossible. Même objectif profil/progrès ; badge calculé avec cette valeur. Rubriques indisponibles explicites, aucun lien # ; Première séance issue de historique.
Compilation App obligatoire ; parcours concernés et comparaison Pencil à 390 px, contrôle 320 et desktop. Ne pas committer avant validation ; consigner explicitement les contrôles impossibles.
Après deux tentatives infructueuses : passation ciblée Luna→Terra ou Terra→Sol ; Sol high seulement pour défaut complexe persistant.
Passation obligatoire : branche, commit, modifications, validations, écarts, problèmes restants et prochain lot.
