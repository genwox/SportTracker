# Poids, pas et son de repos — 5 octobre 2026

## Demande de Damien

Ajouter un podomètre, de préférence via Apple Fitness / Santé ou Nike Run Club, un son à la fin du minuteur de repos, et le suivi du poids corporel pour voir son évolution.

## Livraison dans la PWA Ionic React

- Profil › Mon poids : pesée datée en kg (virgule acceptée), dernière pesée, écart signé depuis la première, courbe chronologique et historique. Correction d'une mesure en touchant sa ligne, suppression confirmée. Une valeur par date.
- Profil › Mes pas : total daté, historique et graphique des 14 derniers relevés. Podomètre **expérimental**, fondé sur `devicemotion`, à activer pendant une marche. Autorisation iOS demandée exclusivement au clic, gestion du refus / absence de données. Arrêt à la sortie de page ou en arrière-plan, reprise du nombre estimé sur le même appareil. Report explicite dans le formulaire puis enregistrement du total quotidien.
- Profil › Minuteur : son de fin de repos activé par défaut, interrupteur et test sonore. Web Audio débloqué par un geste utilisateur ; trois tonalités courtes. Un seul moniteur global, commun aux onglets et au live, termine et persiste le minuteur avant de jouer le son. Aucun son sur pause, repos passé ou ancien minuteur repris après une longue suspension (> 10 s de retard).
- Formulaires de mesures conservés localement par compte en cas de fermeture / erreur réseau ; nouvel envoi manuel. Pas de file d'envoi automatique des mesures.
- Pages Ionic conservées en cache : formulaire et compteur réinitialisés au changement de compte, sans effacer le brouillon du compte précédent.

## Données et API

`DailyHealthMetric` (Core) : `UserId`, `Date` (`DateOnly`), `WeightKg` (`decimal?`), `Steps` (`int?`). Table `HealthMetrics`, clé composite compte/date, filtre global par compte et estampillage via `IUserOwned`. Repository dédié derrière `IHealthMetricRepository`. Migration `20261005080954_AddDailyHealthMetrics` ; application au démarrage selon le mécanisme existant.

- `GET api/healthmetrics` : mesures du compte, ordre chronologique.
- `PUT api/healthmetrics/weight/{yyyy-MM-dd}` : `{ "value": 75.5 }` ; 1–500 kg, arrondi à deux décimales.
- `PUT api/healthmetrics/steps/{yyyy-MM-dd}` : `{ "value": 6500 }` ; entier 0–200 000.
- `DELETE api/healthmetrics/{weight|steps}/{yyyy-MM-dd}` : efface uniquement le type demandé ; ligne retirée quand les deux valeurs sont nulles.

Tous les endpoints exigent une authentification. Enregistrer le poids ne remplace jamais les pas et inversement ; répétition du même PUT remplace la même mesure sans duplication. Conflit de création simultanée d'une journée : relecture de la ligne et reprise du champ demandé. Types OpenAPI régénérés.

SQLite stocke `decimal` en TEXT : les contraintes du poids utilisent explicitement `CAST(WeightKg AS REAL)` pour éviter des comparaisons lexicales. Les tests appliquent réellement toute la chaîne de migrations.

## Connexions vérifiées et limites

- [HealthKit (Apple)](https://developer.apple.com/documentation/healthkit) : accès aux données Santé depuis une application native avec capacité HealthKit et consentement explicite, pas d'API navigateur permettant à Safari/PWA de lire les pas de Santé.
- [Mouvements (Apple)](https://developer.apple.com/documentation/webkitjs/devicemotionevent) : capteurs accessibles au contenu web, selon disponibilité et permissions.
- [Suspension des capteurs iOS (WebKit)](https://bugs.webkit.org/show_bug.cgi?id=151840) : données de mouvement suspendues quand la page est masquée. Le compteur PWA ne remplace donc pas le relevé système quotidien ; mouvements parasites possibles et précision physique non mesurée.
- [NRC → Apple Santé (Nike)](https://www.nike.com/help/a/connect-nrc-health-app/app) : NRC peut partager des courses/activités vers Santé. Cette connexion ne donne pas accès à Santé à SportTracker.
- [Partenaires NRC (Nike)](https://www.nike.com/help/a/connect-nrc-partner-apps-devices) : intégrations partenaires officielles. Aucune API publique directe SportTracker/NRC trouvée pendant la recherche ; aucun bouton de connexion fictif ajouté.
- Sur iPhone, l'audio web n'est pas garanti écran verrouillé / app suspendue. Aucun push ni promesse d'alarme système dans ce lot.

## Suite possible

Pour une lecture quotidienne automatique du total iPhone / Apple Watch : version iOS avec Ionic + Capacitor, pont HealthKit, entitlement et autorisations de lecture `stepCount` (et éventuellement `bodyMass`). Les pas devront être agrégés par Santé (sources téléphone/montre), jamais additionnés naïvement. Nécessite macOS/Xcode, signature et vérification sur appareil ; aucune application native ni connexion Santé n'est livrée ici.

## Validation

- Lint et typecheck frontend : verts.
- Vitest : 114/114 (8 nouveaux cas : pesées, dates locales, courbe, capteurs stationnaires/pulsations/suspension, fin de repos).
- xUnit : 81/81 (3 nouveaux tests SQLite : migrations, périmètre compte, remplacement idempotent, conservation de l'autre mesure, suppression, bornes et arrondi).
- Build Vite/PWA : vert (avertissements Ionic CSS et taille de bundle déjà présents).
- Nouveaux parcours Playwright WebKit : 6/6 (5 parcours puis un cas de changement de compte), capteurs et audio simulés ; validation réelle du bruit et du nombre de pas sur iPhone encore nécessaire.
- Suite WebKit globale : 32/41. Les 9 échecs existants sont reproduits en isolation (1 worker), puis avec les fichiers frontend de HEAD d'origine (4 workers), sans les ajouts de cette session. Ils concernent les glissements/réordonnancements, la molette, une attente Today dépendante des fixtures et un sélecteur ambigu pendant la transition Connexion/Inscription. Comparaison terminée, tous les fichiers de cette session restaurés ; aucun test existant modifié.

## Vérifications iPhone avant déploiement

1. Autoriser les mouvements, marcher 100 pas avec téléphone en poche puis en main et comparer le compteur. La détection est une estimation.
2. Passer dans une autre app / verrouiller l'écran : compteur arrêté, pas déjà détectés conservés.
3. Reporter une marche, enregistrer, recharger ; aucun double report, poids du même jour préservé.
4. Tester le son dans Profil, lancer un repos, aller dans un onglet : une seule alerte lorsque l'app reste au premier plan. Tester le mode silencieux et le volume réel.
5. Ajouter deux pesées, vérifier la courbe, corriger/supprimer, puis changer de compte : aucune donnée du premier compte affichée.

Aucun déploiement effectué pendant cette session. Frontend Blazor gelé inchangé.
