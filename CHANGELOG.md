# Changelog

## [0.1.0.0] - 2026-09-24

### Added

- V5 de l'expérience mobile : bibliothèque d'exercices, historique, progression et journalisation live.
- Reprise hors ligne des brouillons de séances avec synchronisation et résolution des conflits.
- Champs de journalisation avancés : type de série, RPE, notes, équipement et supersets.
- Migrations EF Core et tests associés pour les nouvelles fonctionnalités.

### Changed

- Amélioration de l'ergonomie mobile, des zones tactiles et des états de chargement et d'erreur.
- Mise à jour du catalogue d'exercices, des filtres et des graphiques de progression.
- Renforcement du contrôle d'appartenance des données dans les mises à jour et les graphes de programmes.

### Fixed

- Correction de l'isolation multi-utilisateur lors des PUT de séances cardio, séances de musculation et programmes.
- Rejet des identifiants d'enfants appartenant à un autre programme lors des mises à jour.
- Mise à jour de Microsoft.OpenApi et SQLitePCLRaw.lib.e_sqlite3 pour supprimer les vulnérabilités connues.
