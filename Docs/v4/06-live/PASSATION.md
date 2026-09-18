# Passation lot 6 — Exercice en direct UI V4

Statut : validé. Branche : `feat/ui-v4`. Code : `ec8a088`. Session Claude Code Opus 5 / medium (abonnement Pro).

Modifications (seuls fichiers du périmètre) : `Pages/ExerciseLive.razor` et `Pages/ExerciseLive.razor.css` réécrits en V4, styles scoped uniquement. Aucun changement partagé, endpoint, modèle ou migration.
- Écran 15 : titre Foruner, liens `‹ Séance • Historique`, segmenté des séries (✓ validées, active sombre `#102737`), tuile « Voir le mouvement » (asset `023-weight lifting.png`) ouvrant la visionneuse GIF globale, « Dernière fois, série n : … », carte de saisie avec steppers −/+ (2,5 kg / 1 rep) et valeur tapable ouvrant la saisie précise, **1RM estimé** (Epley, même formule que l'historique) sous les steppers, tuile « Repos prévu · m:ss » / « Repos en cours · m:ss » (asset `030-stopwatch.png`), CTA « Valider la série n » et « Saisie précise ».
- Écran 22 : feuille `.sheet` globale (backdrop 900 < feuille 901 ; nav 10) contrainte à 480 px, safe areas, deux champs Poids/Répétitions sélectionnables (« Champ actif »), pavé 1–9 `, 0 ⌫` (virgule désactivée pour les reps, 2 décimales max), « Poids du corps » (0 kg puis bascule sur reps), « Appliquer les valeurs », « Fermer et revenir à l'exercice ». Clavier physique : chiffres, `,`/`.`, Retour arrière, Échap. Focus placé sur le dialogue à l'ouverture.
- Écran 23 : minuteur plein écran (z 1000) ouvert automatiquement après validation d'une série si repos > 0, cadran SVG (piste `#10273720`, progression `#102737`), « sur 1 min 30 de repos », Mettre en pause / Reprendre / Relancer le repos (état « Repos terminé » à 0:00), « Revenir à l'exercice », Échap.
- États : chargement `V4Loading`, 404 `V4State` « Exercice introuvable » (carnet, séance ou exercice hors séance) avec retour séance, erreur réseau `V4State` + Réessayer. Échec de validation signalé (« Série non enregistrée… tes valeurs sont conservées »), CTA devient « Réessayer », aucune série ajoutée localement ni minuteur lancé.
- Corrections : exercices triés par `Order` ; décompte du minuteur exécuté sur le dispatcher Blazor (`InvokeAsync`) ; minuteur arrêté au rechargement et au `Dispose`.

Référence design — Pencil MCP : `jupKp` (15), `a9hfum` (22), `nP8LA` (23) relus (structure + capture) et comparés aux captures Playwright à 390 px : correspondance de structure, textes, tailles (boutons 46 px, rayons 14/20, cartes `#F8FFFFE6`, secondaires `#FFFFFF80`).

Validations : `dotnet build SportTracker.App/SportTracker.App.csproj --no-restore` → 0 avertissement, 0 erreur. Recette Playwright MCP isolée visible, API 5294 + App 5281 sur SQLite temporaire du scratchpad, compte synthétique `lot6-live@sporttracker.local`, carnet « Force & Régularité » / séance « Push A » (développé couché 3×8–12 repos 12 s, squat 4×5 repos 90 s, pompes 2×15–20 sans repos) et une séance passée du 15/09 créée via l'API :
- Steppers (+2,5 kg, −1 rep), 1RM recalculé (60×10 → 80 kg ; 70,55×12 → 98,8 kg), « Dernière fois » issu de l'historique.
- Validation série 1 → minuteur ouvert, focus dialogue, décompte réel, fin « Repos terminé »/0:00, relance, pause (valeur figée 2 s), reprise, Échap ; tuile « Repos en cours ». Segmenté ✓1 / 2 active / 3.
- Saisie précise : z-index vérifiés (nav 10, backdrop 900, feuille 901), bouton « Appliquer » au premier plan (`elementFromPoint`), saisie clavier `70,55` puis reps `12`, virgule désactivée en reps, valeurs appliquées.
- Coupure API pendant « Valider la série 2 » : erreur affichée, valeurs 70,55/12 conservées, pas de série ni de minuteur ; API relancée, « Réessayer » → série 2 enregistrée, vérifiée via `GET api/exercises/99/history` (2 séries, pas de doublon). Rechargement : séries du jour restaurées.
- Coupure API au chargement : `V4State` erreur puis Réessayer OK après redémarrage.
- 404 : exercice hors séance (481), carnet 999, séance 77. Exercice sans repos (pompes) : pas de tuile repos ni de minuteur après validation ; valeurs par défaut 20 kg / reps min.
- GIF : visionneuse (z 1100) focus + image chargée (source externe raw.githubusercontent, chargement lent), fermeture ✕ et Échap.
- 320×720, 390×844, 1280×900 : aucun débordement horizontal (document, `.app-main`, feuille, minuteur) ; feuille centrée 480 px sur desktop.
- Clavier : lien d'évitement puis liens Séance/Historique, tuile mouvement, steppers dans l'ordre visuel.
- Console : uniquement les erreurs réseau/404 volontairement provoquées.

Écarts : sous-titre de la feuille en `--st-secondary` au lieu du citron de la maquette (citron illisible sur fond clair `#E7F2F1`) ; 1RM absent de la maquette 15 mais exigé par le contrat — ligne discrète dans la carte de saisie ; les assets `023`/`030` rendent respectivement une cible et une cloche (contenu réel des fichiers, noms identiques à Pencil) ; pas d'eyebrow « Exercice i / n » (absent de la maquette). Pas de piège de focus complet dans les dialogues (focus initial + Échap seulement) — à revoir en recette lot 10. Les trois erreurs CS7036 héritées restent reportées au lot 10. `CLAUDE.md` hors commits.

Nettoyage : serveurs API/App isolés arrêtés, base SQLite temporaire, jeton, scripts et captures `.playwright-mcp` supprimés.

Prochain lot : `07-historique-exercice/CONTRAT.md`, même checkout et branche, lancé par le coordinateur (aucun lot 7 lancé par cette session).
