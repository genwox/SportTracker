# Comptes rendus de session

Chaque session Claude (cloud ou locale) qui modifie le projet laisse ici un compte rendu. Une session locale les reverse ensuite dans le vault Obsidian, puis réindexe avec QMD.

- **Nom du fichier** : `AAAA-MM-JJ-<sujet-court>.md`, à la date du travail (ex. `2026-09-26-v6-lot-2-seance-live.md`).
- **Où** : dans ce dossier, commité et poussé sur la branche de la session. La session de synthèse lit ce dossier sur **toutes** les branches distantes : il n'est pas nécessaire de fusionner pour que le compte rendu soit pris en compte.
- **Une fois reversé dans Obsidian**, le fichier est ajouté au tableau « Déjà reversés » en bas de cette page. Il n'est jamais supprimé.

## Modèle à suivre

```markdown
# <Titre court de la session>

- **Date(s)** : AAAA-MM-JJ
- **Session** : <lien claude.ai/code/… si connu> · branche `<branche>`
- **Étape du projet** : <ex. 4g — V6 lot 2>
- **Commits** : `<hash>` <titre>, …

## Ce qui a été fait
<Puces factuelles : quoi, où (fichiers), pourquoi.>

## Décisions prises
<Pour chacune : la décision, les options écartées, la raison, qui a tranché (Damien / Claude). → 02-Decisions>

## Problèmes rencontrés et solutions
<Bug, cause racine, correctif. Préciser ce qui a été vérifié et comment.>

## Apprentissages
<Concepts ou pièges réutilisables, rédigés pour être compris sans le contexte. → 05-Apprentissages>

## Validation
<Commandes lancées et résultats chiffrés ; ce qui n'a PAS pu être vérifié.>

## Reste à faire
<Points ouverts, à qui, priorité.>

## Notes Obsidian à mettre à jour
<Notes existantes concernées (ex. « Étape 4g — Migration frontend Ionic React ») et notes à créer.>
```

## Déjà reversés dans Obsidian

| Fichier | Reversé le |
|---|---|
| | |
