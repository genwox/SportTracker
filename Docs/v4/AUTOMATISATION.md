# Enchaînement automatique V4

Autorisation utilisateur du 17/09/2026 : lancer automatiquement les chats successifs du plan, tant qu'aucun blocage important ne l'empêche.

Enchaînement immédiat autorisé : après validation, commit et passation, la tâche du lot lance elle-même le chat suivant et inscrit son identifiant ici. Le heartbeat du socle sert de surveillance et de reprise si une tâche s'arrête avant la passation. Un seul lot d'implémentation actif ; aucun lancement par le coordinateur tant que la tâche courante travaille ou prépare son successeur. Vérifier registre et statut réel avant toute création. Projet SportTracker, environnement local partagé pour conserver feat/ui-v4, sans worktree/branche supplémentaire.

Automation active : `sporttracker-encha-nement-ui-v4`, vérification toutes les cinq minutes.

Orchestration transférée à la demande explicite de l'utilisateur vers la tâche `01a0b0d3-a052-7f32-b701-3b94ecc39184`, host local. Autorisation renouvelée pour les chats successifs et commits locaux sur le même checkout feat/ui-v4. Le dernier échec de création était une défaillance de revue automatique pour quota épuisé (réinitialisation annoncée 21:10), pas une détermination de danger ; quota désormais renouvelé et nouveau coordinateur créé. L'ancien coordinateur passe la main. La validation critique de reprise réseau du lot 3 reste requise avant lot 4 ; deux échecs de serveur WASM justifient reprise du même lot avec Sol medium.

Ordre et modèles medium : 1 Luna, 2–5 Terra, 6 Sol, 7 Luna, 8–9 Terra, 10 Sol. Contrats et passations dans chaque dossier. Deux échecs sur un même défaut : poursuivre le même lot avec Luna→Terra ou Terra→Sol ; Sol high seulement pour problème complexe persistant.

Passage au lot suivant après fin du chat, compilation App réussie, vérifications du lot documentées, commit, SUIVI et passation complétés. Les trois erreurs de compilation des tests préexistants au lot 0 peuvent être reportées jusqu'à la recette ; elles devront être corrigées et la suite exécutée au lot 10. Aucune régression nouvelle ne peut être ignorée. Une vérification impossible doit être explicitement consignée ; les parcours critiques non validables sont un blocage important.

En cas de demande utilisateur/approval, régression critique, absence d'outil indispensable ou conflit concurrent : suspendre les lancements dépendants et notifier. Ne pas contourner une approbation. Pas de merge, push ou déploiement. CLAUDE.md préservé hors commits. Consulter le vault et le mettre à jour selon AGENTS.md.

Rester silencieux si état inchangé/non actionnable ; notifier uniquement lancement d'un lot, blocage important ou fin de recette. Après recette complète, désactiver le heartbeat et livrer bilan avec écarts.

## Registre

Autorisation renouvelée et directe : l’utilisateur a répondu « oui » dans le coordinateur `01a0b0d3-a052-7f32-b701-3b94ecc39184` après la question explicitement motivée par le refus automatique précédent. La relance du même lot 3 avec Sol / medium a été acceptée le 17/09/2026, ainsi que les tâches successives lots 4–10 avec modifications et commits locaux sur `feat/ui-v4`, sans push ni déploiement. Le refus historique ci-dessous est résolu par cette confirmation ; aucun contournement n’a été utilisé. Heartbeat existant ACTIVE, ciblant le coordinateur actuel.

Lot 0 : terminé, b318b1c + passation 771d97b.
Lot 1 : lancé — task `01a0af36-5541-7cd1-8be2-d4f30589c051`, host `local`, Luna / medium.
Reprise confirmée le 17/09 à 14:10 UTC après échec initial pour limite d'usage ; limites relues : ordinaryUsageAllowed=true. Même tâche relancée avec instruction explicite d'implémenter directement, sans créer de doublon. Cursor de suivi : `f53afbb3-e74e-490a-b7d3-554175bedc6c:3`.
Lot 2 : terminé — tâche `01a0b007-5e4a-7bb2-b79e-d15b47a5e2f4`, code a49665e, recette 75547ea ; parcours critiques validés, responsive réel reporté à la recette.
Lot 3 : validé après reprise Terra→Sol / medium — tâche `01a0b01c-e4fb-7ea0-b27b-9ad560915b7e`, host local. Code final `9f44be8`, recette/passation `7ff549b`. UI authentifiée isolée : coupure réseau sauvegarde avec toutes valeurs conservées, reprise et détail créé, retries liste/détail, 404 ; rendu Pencil et tailles réelles 320/390/1280 validés. Vault mis à jour, QMD réindexé ; serveurs et SQLite temporaires nettoyés.
Blocage du lancement lot 4 : create_thread refusé par la revue d'approbation automatique, raison rapportée par la tâche : création de tâches successives avec commits sur le checkout partagé. Aucun successeur créé ; aucun nouvel essai ni contournement autorisé tant que ce refus n'est pas résolu. Les validations du lot 3 continuent indépendamment.
Lots 4–10 : non lancés.

17/09/2026 — clôture Sol du lot 3 : aucun blocage fonctionnel restant. Nouvelle création lot 4 demandée après vérification registre, list_threads et list_projects, mais refusée par auto-review : autorisation transmise jugée issue d’un transcript non fiable, portée de commits/tâches successives 4–10 non reconnue comme demande utilisateur directe dans cette tâche. La confirmation a été vérifiée ensuite via read_thread du coordinateur : userMessage `01a0b0d5-812b-73f1-b3de-efc8f3dabbd8`, texte « oui », en réponse à la question explicite autorisant relance lot 3 Sol puis lots 4–10/commits locaux. Aucun successeur créé, aucun contournement ni relance après ce nouveau refus ; le coordinateur doit résoudre l’autorisation dans la tâche qui crée le successeur. Lot 3 code `9f44be8`, recette `7ff549b`, QMD update + embed réussis (2 notes, 18 chunks).

Correction du registre à 14:16 UTC : la tâche ci-dessus a servi de relais et créé la tâche d'implémentation `01a0af37-0445-79c0-a22b-3615d2fa1c8f` (host local). Elle avait échoué avant génération pour quota ; reprise directe demandée après expiration de la limite et lecture fraîche ordinaryUsageAllowed=true. Pour le lot 1, surveiller désormais cette tâche d'implémentation ; ne pas relancer le relais `01a0af36-5541-7cd1-8be2-d4f30589c051` ni créer un autre lot 1.

À 14:33 UTC : lot 1 implémenté b1bb5c9, documents 763d7ec/2e4519e. Deux tentatives laissent contrôles 390/320, 404 authentifié et parcours auth réussis incomplets. Même tâche poursuivie avec Terra / medium pour compléter ces validations avant lot 2. Aucun lot dépendant lancé.

Reprise utilisateur : lot 1 clôturé avec recette Terra b9d86ec, parcours critiques locaux et 404 authentifié validés ; mobile réel 390/320 non vérifié faute de capability viewport, écart à conserver en recette. Ce contrôle visuel non bloquant est reporté ; aucune validation critique fonctionnelle manquante ignorée. Lot 2 lancé après lecture passation et vérification commits, statut terminé et absence de lot concurrent.

## Lancement immédiat du successeur

Nouvelle instruction utilisateur : passer aussitôt au lot suivant sans blocage. Les tâches à partir du lot 3 appliquent donc ce protocole après tout travail métier et documentation committés : vérifier registre/statut pour éviter doublon, appeler list_projects, créer le prochain chat sur le projet SportTracker en environnement local, branche feat/ui-v4 ; respecter les modèles medium du plan. Prompt d'implémentation directe : lire PLAN, contrat, passation précédente, notes vault ciblées et Pencil V4 ; implémenter, build, parcours locaux isolés, rendu, commit distinct, suivi/passation/vault/QMD ; aucun merge/push/déploiement ni endpoint/migration, CLAUDE.md hors commits. Inclure explicitement cette instruction d'enchaînement immédiat dans le prompt suivant. Enregistrer immédiatement id/host/lot ici, committer seulement cette modification et appeler une fois wait_threads pour confirmer démarrage. Puis terminer sa propre réponse sans autre modification du code du lot suivant. La tâche peut modifier ce registre à cette seule fin. Ne créer aucune nouvelle automation.

Si blocage important : ne pas lancer le suivant, inscrire le blocage et notifier le coordinateur/utilisateur. Les seules limitations de viewport réellement indisponible restent documentées pour la recette finale ; les parcours critiques fonctionnels sont requis avant passage. Après lot 10 : pas de successeur, bilan final et supprimer l'automation de suivi.

17/09/2026 — lot 4 lancé directement depuis le coordinateur disposant de la confirmation utilisateur : tâche 01a0b0e2-a173-7a60-9133-2ef392a01671, host local, Terra / medium, même checkout feat/ui-v4. Refus inter-tâches résolu par création autorisée depuis le coordinateur. Pour les lots suivants, la tâche métier clôture et informe le coordinateur ; le coordinateur crée immédiatement le successeur après vérification validations et absence de doublon. Cette règle remplace la création par la tâche métier, sans modifier ordre, modèles, critères de validation ni heartbeat existant.
