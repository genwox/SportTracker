# Prompts pen.dev : V6 « app native »

Prérequis : le skill `sporttracker-native` est ajouté dans pen.dev (voir `README.md`) et `design.pen` est commité (git sert d'annulation globale).
Chaque prompt commence par `/sporttracker-native`, pour que tous les agents, quel que soit leur fournisseur, lisent les mêmes règles.

---

## Phase 1 : kit de composants (1 agent, ton meilleur modèle)

> Mode : 1 agent. Rien d'autre ne tourne en même temps : les écrans dépendent de ce kit.

```
/sporttracker-native

Phase 1 : crée le kit de composants V6 « app native » de SportTracker.

1. Lis les frames « ST1 V5 · 01 » à « ST1 V5 · 27 » et « ST1 V5 · Guide palette et polices ». Relève chaque bouton, champ, onglet, liste, toggle et feuille utilisés en V5.
2. Crée un frame « V6 Kit · Composants » à x = -3451, y = 27600. Pour chaque motif natif du skill (1 à 19), crée un composant réutilisable nommé « V6 Kit · <Nom> (Ion<Composant>) » avec tous ses états (repos, appuyé, désactivé, chargement, erreur ; crans pour les feuilles ; fermé/ouvert pour les lignes glissables).
3. Crée « V6 Kit · Barre d'onglets », « V6 Kit · En-tête grand titre » (déplié + replié), « V6 Kit · Mini-barre séance en cours » et « V6 Kit · Feuille » (poignée + crans 25/50/100 %).
4. Uniquement les variables $st1-v4-* et les couleurs du guide V5 : aucune nouvelle couleur ni police.
5. Termine par un frame « V6 Kit · Correspondance » : tableau composant V5 → composant V6 → composant Ionic → notes de code.

Ne crée aucun écran dans cette phase.
```

---

## Phase 2 : les 27 écrans (5 agents, mode Split Work)

> Mode : ⚡ Parallel agents · **Split Work** · 5 agents. Colle le même prompt ; il fixe lui-même la répartition pour éviter que deux agents prennent le même écran.

```
/sporttracker-native

Phase 2 : redessine les 27 écrans V5 en V6 « app native », en instances du kit « V6 Kit · … » (déjà créé, ne le modifie pas).

Répartition stricte : chaque agent prend UN lot et ne touche à rien d'autre.
- Lot A · Accès et états : 01 Connexion, 02 Inscription, 20 Page introuvable, 24 Accueil sans séance, 25 Erreur d'enregistrement, 26 Chargement (squelettes, plus de spinner)
- Lot B · Aujourd'hui et séances : 03 Aujourd'hui, 04 Séances musculation, 06 Détail séance muscu, 07 Séances cardio, 09 Détail séance cardio
- Lot C · Séance live : 15 Exercice en direct, 22 Saisie précise, 23 Minuteur de repos, 27 Recherche d'exercice, 21 Modifier une séance, 05 Nouvelle séance muscu, 08 Nouvelle séance cardio
- Lot D · Programmes : 10 Carnets, 11 Nouveau carnet, 12 Détail du carnet, 13 Nouvelle séance du carnet, 14 Séance du carnet
- Lot E · Historique, Progrès et Profil : 16 Historique exercice, 17 Historique général, 18 Progrès, 19 Profil

Pour chaque écran :
1. Pars du frame « ST1 V5 · NN · … » : mêmes contenus, mêmes données, même identité.
2. Crée « ST1 V6 · NN · … » à y = 27600, même x que la version V5.
3. Remplace chaque élément « web » par son équivalent natif du kit : grand titre repliable, retour natif, contrôle segmenté, toggles, listes inset, glissement pour supprimer, feuilles à crans, feuilles d'actions, steppers, pavé numérique, bouton principal collant.
4. Si l'écran défile, dessine un second téléphone à côté avec l'état défilé (titre replié, barre floutée).
5. Sous le téléphone, ajoute la note : composants Ionic, gestes, transition d'entrée et de sortie.

Lot C en priorité absolue : c'est l'écran utilisé entre deux séries, souvent d'une seule main et essoufflé. Gros steppers, valider une série en un tap, minuteur en feuille à crans, mini-barre quand on sort de la séance.
```

---

## Phase 3 : explorer les écrans clés (Side by Side ou Let it cook)

> Mode : ⚡ **Side by Side** · 3 agents, idéalement 3 **fournisseurs différents** (c'est là que la diversité des modèles apporte le plus). Ou **Let it cook** · 3 variantes, orientation « Layout ».

```
/sporttracker-native

Phase 3 : propose une variante alternative de « ST1 V6 · 15 · Exercice en direct » et « ST1 V6 · 03 · Aujourd'hui ».
Place ta variante à y = 30200 (agent 1 : x = -2951, agent 2 : x = -1951, agent 3 : x = -951), nommée « ST1 V6 · Variante <ton nom de modèle> · … ».
Même identité, mêmes composants du kit ; varie la hiérarchie, la position du bouton principal, le geste de validation de série et la place du minuteur.
Sous chaque variante : 3 lignes sur le compromis choisi (une main, lisibilité en effort, nombre de taps pour valider une série).
```

---

## Phase 4 : harmonisation (1 agent, le même modèle que la phase 1)

> Mode : 1 agent. C'est l'étape qui efface les écarts de style entre fournisseurs.

```
/sporttracker-native

Phase 4 : revue de cohérence de la rangée « ST1 V6 · 01 » à « 27 ».
1. Vérifie écran par écran : couleurs hors variables, polices hors Foruner/Plus Jakarta Sans, zones tactiles < 44 pt, éléments redessinés à la main au lieu d'une instance du kit, safe areas non respectées, notes manquantes.
2. Corrige directement ce qui est local ; liste le reste.
3. Crée « ST1 V6 · Parcours et transitions » à y = 29000 : les écrans reliés par des flèches annotées (push, feuille, onglet, retour par glissement, action sheet) avec la durée et la courbe de chaque transition.
4. Crée « ST1 V6 · Rapport » : ce qui a changé par rapport à V5, écran par écran, en une ligne chacun, plus la liste des composants Ionic à coder dans SportTracker.Web/src/ui/.
```
