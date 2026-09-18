# EcoBlissBath

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.3.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

Readme provisoire :
Eco Bliss Bath

Eco Bliss Bath est une application e-commerce de produits cosmétiques écoresponsables. Ce dépôt contient l’application, l’API et une campagne de tests automatisés avec Cypress.

La campagne couvre les API principales, la connexion, le panier, les smoke tests et deux contrôles ciblés de sécurité.

État de la campagne

Dernière exécution complète : 18 septembre 2026.

Indicateur

Résultat

Fichiers de spécification

9

Tests exécutés

23

Tests réussis

18

Tests en échec

5

Taux de réussite

78,3 %

Durée

1 min 00 s

La décision recommandée est NO GO provisoire. Une anomalie critique expose des données sensibles dans GET /reviews. Quatre anomalies majeures concernent le stock et les quantités du panier.

Le bilan détaillé se trouve dans docs/bilan_campagne_tests_eco_bliss_bath.pdf.

Technologies

Angular 13.3 pour le front-end ;

Symfony 6.2 pour l’API ;

MariaDB avec Docker Compose ;

Cypress 13.17 pour les tests automatisés ;

Node.js 16.20.2 et npm 9.9.4 pour l’environnement de référence.

Prérequis

Installez les outils suivants :

Git ;

Docker Desktop ;

Node.js 16.20.2 ;

npm ;

Google Chrome pour reproduire la campagne de référence.

Les ports suivants doivent être disponibles :

4200 pour le front-end ;

8081 pour l’API.

Installation

Clonez le dépôt public puis placez-vous à sa racine :

git clone https://github.com/Test-techP/projet-10_Eco-Bliss-Bath-V2.git
cd Eco-Bliss-Bath-V2

Démarrez l’API et la base de données :

docker compose up -d

Installez les dépendances du front-end :

cd frontend
npm ci

Si le dépôt ne contient pas de fichier package-lock.json, utilisez npm install à la place de npm ci.

Lancement de l’application

Depuis frontend :

npm start

Ouvrez ensuite http://localhost:4200.

Données de test

Les tests utilisent frontend/cypress/fixtures/test-data.json. Les comptes présents dans cette fixture doivent être réservés à l’environnement local de test. N’y placez jamais d’identifiants de production.

Avant une campagne complète, réinitialisez la base de test depuis frontend :

npm run db:reset:test

Cette commande exécute scripts/reset-test-database.ps1. Elle :

arrête les services Docker Compose ;

déplace le dossier mysql actuel vers .test-db-backups avec un horodatage ;

redémarre les services ;

recrée les données initiales de test.

Utilisez cette commande uniquement sur l’environnement local de test. Elle remplace l’état courant de la base. Les dossiers mysql et .test-db-backups sont exclus de Git.

Exécution des tests Cypress

L’application et l’API doivent être démarrées avant Cypress.

Mode interactif

npm run cy:open

Ce mode laisse l’interface Cypress ouverte. Avec Cypress 13, lancez les spécifications une par une depuis la liste.

Campagne complète avec navigateur visible

npm run cy:run -- --headed --browser chrome

Le navigateur se ferme automatiquement à la fin de cypress run, même avec l’option --headed. C’est le comportement normal.

Campagne complète en mode headless

npm run cy:run

Une seule spécification

npm run cy:run -- --headed --browser chrome --spec "cypress/e2e/api/orders.cy.js"

Génération des résultats de campagne

Cypress affiche le bilan dans le terminal et crée automatiquement une capture dans frontend/cypress/screenshots pour chaque test en échec.

Sous PowerShell, utilisez une transcription pour conserver le résultat complet dans un fichier horodaté :

Set-Location .\frontend

New-Item -ItemType Directory -Force .\cypress\results | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = ".\cypress\results\campaign-$timestamp.txt"

Start-Transcript -Path $reportPath
npm run cy:run -- --headed --browser chrome
Stop-Transcript

Les preuves à conserver après l’exécution sont :

le fichier frontend/cypress/results/campaign-<horodatage>.txt ;

les captures de frontend/cypress/screenshots ;

le bilan de campagne mis à jour dans docs.

Le dossier cypress/results peut être ajouté à .gitignore si les résultats bruts ne doivent pas être versionnés.

Particularité Windows avec NVM

Sur certaines configurations Windows, une stratégie de contrôle d’application peut bloquer le lanceur npm.exe créé par NVM. Le fichier npm.cmd de la version Node reste alors utilisable :

$npmCmd16 = "$env:LOCALAPPDATA\Author Software\nvm\installs\v16.20.2\npm.cmd"

& $npmCmd16 start
& $npmCmd16 run db:reset:test
& $npmCmd16 run cy:run -- --headed --browser chrome

Exécutez ces commandes depuis frontend.

Couverture automatisée

Fichier

Couverture principale

api/authentication.cy.js

Connexion API valide et invalide

api/orders.cy.js

Lecture du panier, ajout, stock et validation de commande

api/products.cy.js

Liste et détail des produits

api/reviews.cy.js

Création d’un avis

functional/cart.cy.js

Ajout visible, rupture et quantités invalides

functional/login.cy.js

Erreur de connexion et redirection après connexion

smoke/smoke.cy.js

Contrôles essentiels de connexion et d’ajout

security/sensitive-data.cy.js

Absence de données sensibles dans les avis

security/xss.cy.js

Neutralisation d’une charge JavaScript dans un commentaire

Structure utile

Eco-Bliss-Bath-V2/
├── backend/
├── data/
├── docs/
│   └── bilan_campagne_tests_eco_bliss_bath.pdf
├── frontend/
│   ├── cypress/
│   │   ├── e2e/
│   │   │   ├── api/
│   │   │   ├── functional/
│   │   │   ├── security/
│   │   │   └── smoke/
│   │   ├── fixtures/
│   │   └── support/
│   ├── cypress.config.js
│   └── package.json
├── scripts/
│   └── reset-test-database.ps1
├── .gitignore
├── docker-compose.yml
└── README.md

Anomalies connues

ID

Criticité

Résumé

ANO-001

Majeure

L’API accepte un produit en rupture de stock.

ANO-002

Majeure

Le bouton d’ajout reste disponible en cas de rupture.

ANO-003

Majeure

La fiche produit envoie une quantité supérieure à 20.

ANO-004

Majeure

Le panier enregistre une quantité de 21.

ANO-005

Critique

GET /reviews expose des données sensibles et internes.

Consultez le bilan de campagne pour les étapes de reproduction, les résultats attendus et observés, les captures et les corrections recommandées.

Autrice des tests

Pauline Puga