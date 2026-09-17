# Enchaînement automatique V4

Autorisation utilisateur du 17/09/2026 : lancer automatiquement les chats successifs du plan, tant qu'aucun blocage important ne l'empêche.

Coordination centralisée dans le chat du socle par heartbeat. Un seul lot actif ; les chats de lot ne créent ni leur successeur ni une autre automation. Vérifier le registre ci-dessous et le statut réel du chat avant tout lancement. Projet SportTracker, environnement local partagé pour conserver feat/ui-v4, sans worktree/branche supplémentaire.

Automation active : `sporttracker-encha-nement-ui-v4`, vérification toutes les cinq minutes.

Ordre et modèles medium : 1 Luna, 2–5 Terra, 6 Sol, 7 Luna, 8–9 Terra, 10 Sol. Contrats et passations dans chaque dossier. Deux échecs sur un même défaut : poursuivre le même lot avec Luna→Terra ou Terra→Sol ; Sol high seulement pour problème complexe persistant.

Passage au lot suivant après fin du chat, compilation App réussie, vérifications du lot documentées, commit, SUIVI et passation complétés. Les trois erreurs de compilation des tests préexistants au lot 0 peuvent être reportées jusqu'à la recette ; elles devront être corrigées et la suite exécutée au lot 10. Aucune régression nouvelle ne peut être ignorée. Une vérification impossible doit être explicitement consignée ; les parcours critiques non validables sont un blocage important.

En cas de demande utilisateur/approval, régression critique, absence d'outil indispensable ou conflit concurrent : suspendre les lancements dépendants et notifier. Ne pas contourner une approbation. Pas de merge, push ou déploiement. CLAUDE.md préservé hors commits. Consulter le vault et le mettre à jour selon AGENTS.md.

Rester silencieux si état inchangé/non actionnable ; notifier uniquement lancement d'un lot, blocage important ou fin de recette. Après recette complète, désactiver le heartbeat et livrer bilan avec écarts.

## Registre

Lot 0 : terminé, b318b1c + passation 771d97b.
Lot 1 : lancé — task `01a0af36-5541-7cd1-8be2-d4f30589c051`, host `local`, Luna / medium.
Reprise confirmée le 17/09 à 14:10 UTC après échec initial pour limite d'usage ; limites relues : ordinaryUsageAllowed=true. Même tâche relancée avec instruction explicite d'implémenter directement, sans créer de doublon. Cursor de suivi : `f53afbb3-e74e-490a-b7d3-554175bedc6c:3`.
Lots 2–10 : non lancés.
