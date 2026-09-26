# pen.dev pour SportTracker : mode d'emploi

## Comment fonctionne pen.dev
- **Le fichier `.pen`** : `design.pen`, à la racine du repo, est du JSON (frames, textes, variables, composants). Il est versionné par git comme du code, donc un `git diff`/`git checkout design.pen` sert d'historique et d'annulation.
- **Le canevas** : un canevas infini (app desktop ou extension VS Code/Cursor) qui affiche ce JSON. Toi et les agents modifiez le même fichier.
- **Les agents** : un agent IA lit et écrit le canevas via MCP. On choisit le modèle dans le *model picker* ; la flèche à côté règle l'effort de raisonnement. ⚠️ Changer de fournisseur en cours de conversation **perd le contexte** : il faut redonner les consignes.
- **Les fournisseurs** (*Settings → providers*) : Anthropic (réglages Claude Code, clé API, abonnement Pro/Max…), OpenAI (réglages Codex, clé API, ChatGPT Plus/Pro), Google Gemini (clé AI Studio), Cursor, GitHub Copilot, plus xAI, OpenRouter, DeepSeek, Kimi, etc.
- **Les agents parallèles (⚡)** : de 1 à 6 agents, **chacun avec son propre modèle**.
  - **Split Work** : les agents se partagent une tâche (un lot d'écrans chacun).
  - **Side by Side** : ils font tous la même tâche, pour comparer des alternatives.
- **Let it cook** : enchaîne 2 à 6 variantes d'un design, orientées *Layout* ou *Style*.
- **Les skills** : un `SKILL.md` = des consignes injectées dans la requête, appelées avec `/nom`. On l'ajoute en sélectionnant le fichier ou son dossier ; **le nom du dossier devient le nom du skill**.
- **Les variables** : des jetons (couleur, nombre, police). Tes couleurs V5 vivent dans `$st1-v4-*` ; un agent qui les utilise reste dans la charte automatiquement.
- **Context usage** (à côté du model picker) : consommation de tokens et coût estimé par agent.

## La méthode : pourquoi 4 phases et un skill
Le risque avec plusieurs agents **et** plusieurs fournisseurs, c'est la dérive : chaque modèle a son « goût » (rayons, espacements, façon de faire un bouton), et 5 agents qui dessinent chacun leur propre bouton donnent 5 boutons.

Les parades :
1. **Un skill partagé** (`sporttracker-native/SKILL.md`) : les règles sont dans un fichier, pas dans la conversation. Tous les agents et tous les fournisseurs lisent exactement les mêmes consignes, et changer de modèle ne perd rien.
2. **Le kit d'abord, seul** (phase 1) : un seul agent fixe les composants. Les autres les *instancient* au lieu d'en inventer.
3. **Des lots disjoints** (phase 2) : chaque agent a ses écrans et ses coordonnées. Deux agents n'écrivent jamais sur le même frame.
4. **La diversité là où elle sert** (phase 3) : Side by Side avec des fournisseurs différents, sur 2 écrans clés seulement. C'est le seul endroit où on *veut* des goûts différents.
5. **Une passe d'harmonisation** (phase 4) : le modèle de la phase 1 relit tout et corrige les écarts.

| Phase | Mode | Agents | Quel modèle |
|---|---|---|---|
| 1 · Kit | 1 agent | 1 | Le plus fort que tu aies (Claude Opus / GPT haut de gamme), effort élevé |
| 2 · 27 écrans | Split Work | 5 | Fort sur le lot C (séance live) ; les autres lots acceptent un modèle moins cher |
| 3 · Variantes | Side by Side ou Let it cook | 3 | Trois fournisseurs différents |
| 4 · Harmonisation | 1 agent | 1 | Le même qu'en phase 1 |

## Pas à pas
1. `git pull` puis `git status` : `design.pen` doit être propre (commité).
2. pen.dev → Skills → ajouter le dossier `Docs/pen-dev/sporttracker-native/`. Le skill apparaît sous `/sporttracker-native`.
3. Phase 1 : colle le prompt de la phase 1 (`prompts-v6-native.md`), vérifie le kit à l'œil. **Commit** (`design: kit V6`).
4. Phase 2 : ⚡ → Split Work → 5 agents → choisis le modèle de chaque agent → colle le prompt. Vérifie, puis **commit**.
5. Phase 3 (facultative) : Side by Side, 3 fournisseurs. Garde la meilleure idée et reporte-la à la main ou par un prompt ciblé. **Commit**.
6. Phase 4 : harmonisation. **Commit**.
7. Côté code : dans Claude Code, « implémente `ST1 V6 · 15` dans `SportTracker.Web` en suivant les notes Ionic du frame ».

**Réflexe** : un commit entre chaque phase. Si une phase dérape, `git checkout design.pen` et on relance avec un prompt corrigé.

## Adapter les prompts
- **Un seul écran** : `/sporttracker-native` + « Fais uniquement ST1 V6 · 19 · Profil selon le skill. »
- **Changer une règle pour tout le monde** : modifie `SKILL.md`, pas les prompts. Les prochains agents en héritent.
- **Moins d'agents** (quota, coût) : regroupe les lots (A+E, B+D, C seul) et passe à 3 agents.
- **Un agent déborde de son lot** : rappelle « Lot X uniquement, ne touche à aucun autre frame » et relance ce seul agent.
