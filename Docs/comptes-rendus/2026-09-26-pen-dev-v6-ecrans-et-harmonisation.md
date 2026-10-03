# Conception de la V6 dans pen.dev : kit, 27 écrans, harmonisation (compte rendu reconstitué)

> **Compte rendu reconstitué le 2026-10-03**, sans témoin direct de la session. Sources : messages et `git show --stat` des commits ci-dessous, `Docs/pen-dev/README.md`, `prompts-v6-native.md`, `passation-v6-code.md`, `CLAUDE.md`, et les journaux déjà présents dans le vault (*Kit V6 app native (pen.dev phase 1)*, *Revue de cohérence V6 (pen.dev phase 4)*). Ce qui n'est pas établi par ces sources est marqué « non établi ».

- **Date(s)** : 2026-09-26
- **Session** : sessions pen.dev (Damien, commits signés `genwox`) · branche `genwox/master-2`, puis fusion dans `master`
- **Étape du projet** : 4g — conception de la V6 « app native » (avant les 5 lots de code)
- **Commits** : `ab880ec` design: kit V6 · `1035e82` design: écrans V6 · `96b0f91` design: V6 harmonisée · `84701ec` design: exports PNG V6 · `a9c91f0` merge de `master` (design V6) dans `genwox/master-2`

## Ce qui a été fait
- **Phase 1 : kit** (`ab880ec`, 12 h 57) : `V6 Kit · Composants` (19 sections, 39 composants) et `V6 Kit · Correspondance` (V5 → V6 → Ionic). Détail dans le journal du vault *Kit V6 app native (pen.dev phase 1)*.
- **Phase 2 : 27 écrans** (`1035e82`, 13 h 24) : les 27 écrans V5 redessinés en `ST1 V6 · 01` à `27` (y = 27600), en instances du kit, chacun avec sa note Ionic. Méthode prévue par `prompts-v6-native.md` : mode Split Work, 5 agents, répartition en lots A (accès et états), B (Aujourd'hui et séances), C (séance live, prioritaire), D (programmes), E (historique, progrès, profil). Même commit : le skill `sporttracker-native` reçoit la règle du rouge de suppression `$st1-v6-danger` `#FF3B30`.
- **Phase 3 : variantes** : non établi. Aucun commit ne la distingue et `prompts-v6-native.md` la dit facultative.
- **Phase 4 : harmonisation** (`96b0f91`, 17 h 51) : revue de cohérence des 27 écrans, puis deux frames, `ST1 V6 · Parcours et transitions` (y = 30000) et `ST1 V6 · Rapport`. Détail dans le journal du vault *Revue de cohérence V6 (pen.dev phase 4)*.
- **Exports** (`84701ec`, 18 h 15) : 31 fichiers PNG dans `design-exports/v6/`, références visuelles des lots de code.
- **Fusion** (`a9c91f0`) : le design V6 est ramené dans `genwox/master-2`, puis dans `master` ; la fiche `Docs/pen-dev/passation-v6-code.md` (`74528fe`) sert de point de départ au codage.

## Décisions prises
- **Rouge de suppression `#FF3B30`** : Damien a autorisé cette seule couleur ajoutée à l'identité V5, réservée aux suppressions ; les erreurs restent sans rouge. Tranché par Damien. → 02-Decisions
- **Trois onglets** (Aujourd'hui, Programmes, Historique) au lieu de cinq ; Progrès fusionné dans Historique, Profil par l'avatar. Choix de conception V6.
- **Un commit entre chaque phase** (`design: kit V6`, `design: écrans V6`…) pour pouvoir revenir en arrière avec `git checkout design.pen` si une phase dérape. Méthode de `Docs/pen-dev/README.md`.
- **Le kit d'abord, seul, puis des lots disjoints** : un seul agent fixe les composants, les autres les instancient. → 02-Decisions (*Workflow pen.dev multi-agents pour la V6*)

## Problèmes rencontrés et solutions
- Les fonctions définies dans `execute` ne survivent pas d'un appel à l'autre ; contournement : stocker le code des helpers dans une chaîne et faire `eval` à chaque appel.
- `TakeScreenshot` renvoie parfois un rendu périmé pour des nœuds récents ; une petite `Update` du parent force le re-rendu.
- `Update(id, {width: undefined})` ne retire pas une propriété : il faut `Replace` le nœud.
- Les écrans à deux états descendent jusqu'à y ≈ 29 800, d'où le frame *Parcours* placé à y = 30000 et non 29000.
- Erreur 400 « Third-party apps now draw from your extra usage » en lançant Claude depuis pen.dev ; contournée par Codex ou Claude Code (voir le compte rendu iOS natif).

## Apprentissages
- Dans pen.dev, **Split Work** donne le même modèle à tous les agents et se prête aux lots disjoints ; **Side by Side** donne un modèle par agent sur la même tâche, pour comparer. → 05-Apprentissages
- Un fichier `.pen` est du JSON versionnable ; les frames ont des identifiants stables (`bdv2i`, `mcLrO`, `QiWhE`, `l66GWz`).
- Quand le diagnostic d'un document de référence est douteux, relire la source (ici `design.pen`) plutôt que le vault : voir la passe de fidélité visuelle V5.

## Validation
- Aucune commande de test (changements de `design.pen` et de PNG uniquement). Vérification visuelle par Damien dans pen.dev et sur les PNG exportés.
- Le design a ensuite servi de référence aux 5 lots de code, qui ont comparé leurs captures aux PNG.
- Non établi : nombre d'agents réellement lancés en phase 2, modèles utilisés par lot.

## Reste à faire
- Écarts V6 assumés, listés dans `Docs/pen-dev/passation-v6-code.md` (tableau « Écarts restants »).
- Aucun frame V1 à V5 n'a été modifié.

## Notes Obsidian à mettre à jour
- `03-Features` : note *V6 app native* (nouvelle) et *Étape 4g*.
- `02-Decisions` : *Design V6 app native : décisions de Damien* ; *Workflow pen.dev multi-agents pour la V6*.
- `04-Journal` : 2026-09-26.
