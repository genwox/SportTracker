# Orchestration Claude Code / OpenAI

**EXÉCUTION AUTORISÉE le 18/09/2026 par nouvelle instruction directe de lancement.** Coordination transférée à la tâche 01a0b374-ec7a-7dd0-b9fb-b512441babc7. Reprendre le lot 4 avant le lot 5 ; priorité Claude abonnement Pro, contrôles login/modèle/usage avant appel métier. Les mentions de suspension ci-dessous sont historiques.

Demande utilisateur du 18/09/2026, clarification directe : OpenAI orchestre Claude Code. Claude exécute les lots au premier plan dans des sessions distinctes ; OpenAI reprend l'implémentation en fallback lorsque Claude est limité. La répartition OpenAI reste inchangée.

## Correspondance de travail proposée

| Travail | OpenAI conservé | Claude proposé |
|---|---|---|
| Petits lots 1/7 | Luna medium | Haiku, si inclus/disponible |
| Lots courants 2–5/8–9 | Terra medium | Sonnet medium |
| Lots complexes 0/6/10 | Sol medium | Opus medium si inclus/disponible, sinon fallback Sol |
| Orchestration courte | Coordinateur OpenAI | Pas de coordinateur Claude supplémentaire |

Cette correspondance repose sur les types de tâches, pas sur une équivalence de performance. Vérifier `/model` sur le compte : accès effectif et modèles nécessitant crédits distincts. Ne pas sélectionner Fable, modèle long contexte ou option payante sans accès inclus confirmé. Ne pas activer extra usage ni acheter de crédits.

## Vérifications locales

Claude Code 2.1.201 installé. Connexion claude.ai Pro confirmée après retrait de `ANTHROPIC_API_KEY` du processus de vérification uniquement. La variable globale reste intacte. Chaque processus Claude piloté doit retirer cette variable héritée pour utiliser l'abonnement. Pencil MCP connecté dans ce processus ; accès brut à design.pen interdit.

Lot4 OpenAI idle/interrompu. Corrections non committées dans cinq fichiers Pages/Programs*, NewProgram.razor.css et ProgramDetail* à préserver. Références Pencil lues avant interruption ; comparaison finale/build/passation restent à terminer. Ne pas lancer lot5 avant clôture.

## Protocole

Un seul lot métier actif sur checkout existant feat/ui-v4. Une session Claude neuve par lot, identifiant et modèle effectif dans AUTOMATISATION.md ; reprendre la session exacte pour défaut ponctuel, nouvelle session ciblée avec passation si contexte trop long. Lire uniquement contrat, passation précédente, notes vault ciblées et Pencil ciblé. Compilation, UI réelle isolée, rendu, commits ciblés, SUIVI/passation/vault/QMD avant successeur. CLAUDE.md et design.pen préexistants hors commits. Aucun endpoint/migration/merge/push/déploiement.

À quota Claude épuisé : fin de processus/tâche vérifiée, état des modifications et passation conservés, puis reprise OpenAI avec modèle du plan existant. Inversement, priorité Claude quand OpenAI limité et Claude disponible. Si les deux fournisseurs sont limités, attendre le reset annoncé sans achat automatique ni boucle de requêtes. `--fallback-model` Claude ne réalise pas le passage vers OpenAI : celui-ci revient au coordinateur.

Claude seul ne dispose pas automatiquement des outils Codex create_thread/wait_threads. Des sessions CLI indépendantes remplacent les chats Claude ; le coordinateur Codex conserve le contrôle du fallback OpenAI et du heartbeat existant.

## Fallback automatique après lancement autorisé

1. Lire état réel du registre, changements locaux, passation et statut des agents. Reprendre le lot4 incomplet avant lot5 ; ne jamais refaire automatiquement un lot validé.
2. Choisir Claude en priorité avec le modèle du tableau, disponible dans l'abonnement et adapté au lot. Sonnet medium pour terminer le lot4 ; Opus seulement si disponibilité incluse vérifiée et complexité justifiée. Les modèles OpenAI restent strictement ceux du plan.
3. En cas de limite d'usage explicite, modèle non disponible dans l'abonnement ou panne fournisseur confirmée, interrompre/attendre la fin de l'agent, vérifier qu'aucune écriture n'est encore active et sauvegarder une passation courte : lot, fournisseur/session/modèle, fichiers modifiés, commit éventuel, validations faites/restantes, erreur et reset annoncé. Ne jamais committer un lot non validé simplement pour changer de fournisseur.
4. Claude limité → session/tâche OpenAI neuve du même lot avec le modèle OpenAI prévu, après vérification fraîche des limites OpenAI. OpenAI limité → session Claude neuve du même lot, après vérification officielle de l'accès et des limites Claude (`/usage` ou message de limite). Le coordinateur n'utilise pas Claude pour créer des tâches Codex : il pilote lui-même les sessions.
5. Après fallback, continuer les changements existants et validations restantes. Pas de duplication des implémentations, pas de transmission de tout l'historique. Une session distincte pour chaque nouveau lot ; conserver l'identifiant exact pour reprise ponctuelle.
6. Garder le fournisseur de fallback jusqu'à clôture du lot afin d'éviter les allers-retours. Au lot suivant, revenir à la priorité Claude si une vérification indique qu'il est disponible. Si les deux fournisseurs sont limités, enregistrer les heures de reset et attendre ; pas de boucle de requêtes ni achat automatique.
7. Une erreur de code ne déclenche pas un fallback de quota : deux échecs identiques justifient une escalade ciblée (Haiku→Sonnet→Opus inclus, ou Luna→Terra→Sol selon règle existante). Un refus d'approbation, une authentification interactive, un outil indispensable absent ou un conflit concurrent suspend les lancements et requiert résolution ; aucun changement de fournisseur pour contourner une protection.

Ces règles constituent le plan piloté par OpenAI ; aucun service de fallback autonome ni script d'exécution n'est lancé ou installé par cette préparation. Si le coordinateur OpenAI lui-même ne peut plus répondre, Claude ne prend pas magiquement sa place : conserver le registre et reprendre la coordination à disponibilité d'OpenAI ou sur instruction utilisateur.

## Checklist et instruction de reprise

### Navigateur depuis Claude Code Terminal

Claude Code Terminal peut piloter un navigateur : intégration officielle Claude in Chrome (`claude --chrome`, extension et connexion abonnement Pro) ou Playwright CLI/MCP. Les outils navigateur Codex ne sont pas transmis automatiquement à Claude. Vérification actuelle : Node/npx présents, Playwright CLI non trouvé et aucun serveur Playwright dans `claude mcp list` ; Pencil MCP a fonctionné hors sandbox mais son dernier contrôle sandbox échoue. Cela ne démontre pas une impossibilité de naviguer, ni une recette navigateur déjà opérationnelle.

À la reprise autorisée, préparer le navigateur avant de lancer un lot :

1. Vérifier les outils depuis l'environnement local normal avec abonnement Pro connecté. Pencil MCP sert à lire/comparer les maquettes ; son outil navigateur offre lecture DOM/captures, mais ne suffit pas à garantir les interactions formulaire, clavier et tailles. Ne pas confondre ces capacités.
2. Pour la recette locale répétable avec compte synthétique et contexte navigateur isolé, privilégier Playwright CLI officiel, plus économe en contexte selon sa documentation. Installer/configurer à la reprise seulement, avec version vérifiée et commandes de la documentation officielle ; ouvrir une fenêtre visible et vérifier navigation, saisie, clic, DOM, capture, redimensionnement et clavier. Ne pas charger les outils navigateur dans les sessions qui n'en ont pas besoin.
3. Si le workflow CLI ne permet pas les actions nécessaires, configurer le serveur officiel Playwright MCP dans la session/projet Claude ; commande officielle de base : `claude mcp add playwright npx @playwright/mcp@latest`. Adapter/pinner la version après vérification des options actuelles, utiliser un contexte isolé et un navigateur visible, conserver Node/npx disponibles. Ne rien installer maintenant.
4. Alternative si déjà configurée : Claude in Chrome avec `--chrome`, extension connectée, `/chrome` vérifié et permissions limitées au localhost de recette. Pas d'utilisation de profils personnels pour créer des comptes de test ; Playwright isolé reste préférable pour les comptes synthétiques. Windows natif pris en charge, WSL ne prend pas en charge cette intégration. La version locale2.1.201 peut nécessiter une mise à jour pour certaines fonctions comme captures sauvegardées ; vérifier la version avant recette.
5. Test préalable minimal à la reprise : page locale de diagnostic → saisir une valeur → cliquer → vérifier DOM → capture → tailles320/390/1280 → navigation clavier. Ensuite seulement démarrer l'API/SQLite temporaire isolée et valider la connexion/formulaire SportTracker. Conserver PID/sessions des serveurs pour coupures réseau et nettoyage ciblé.
6. Si aucun navigateur utilisable depuis Claude, suspendre sa validation : le coordinateur peut réaliser la recette via ses outils navigateur disponibles après arrêt de toute écriture concurrente, avec preuves référencées dans la passation. Sinon blocage important explicite et aucun lot suivant. Une compilation/API seule ne remplace jamais la recette UI.

Aucune installation, extension, session navigateur ou lot n'est lancé par cette préparation. La surveillance reste PAUSED.

À votre retour, demander : « Reprends le plan UI V4 : OpenAI orchestre Claude Code en priorité, applique les fallbacks bidirectionnels documentés, commence par terminer le lot4 et réactive le heartbeat existant. »

Avant le premier appel métier : terminer la connexion interactive Claude à l'abonnement Pro ; vérifier `/model` et `/usage`, identité de l'abonnement et absence de facturation API. Retirer la clé API du processus Claude seulement, conserver l'environnement global. Vérifier Pencil MCP et outil navigateur de recette. Vérifier branche feat/ui-v4, agent précédent arrêté et modifications lot4 préservées. Réactiver uniquement le heartbeat existant après instruction de reprise.

La transmission à Anthropic du code et des documents nécessaires a été autorisée directement par l'utilisateur le 18/09/2026. Le refus initial est résolu ; le lancement interactif accepté a toutefois affiché Not logged in / API Usage Billing et la connexion navigateur n'a pas été achevée. Session exec35806 arrêtée à la demande utilisateur, reprise possible via `claude --resume "SportTracker V4 lot 4"` après contrôle de l'authentification. Aucun travail métier Claude n'a été exécuté. L'arrêt volontaire actuel exige une nouvelle instruction de lancement, même si la connexion est ensuite terminée.

Sources officielles consultées :
- https://code.claude.com/docs/en/model-config
- https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code
- https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan
- https://code.claude.com/docs/en/chrome
- https://playwright.dev/docs/getting-started-cli
- https://playwright.dev/mcp/clients/claude-code
