# ADR-001: Patron d'Architecture Microservices

## Statut

**ACCEPTÉ** - Implémentation terminée (08-01-2025)

## Contexte

Le projet LOG430 Lab 5 nécessite la construction d'un système de gestion de magasin de détail capable de gérer plusieurs domaines métier incluant la gestion des utilisateurs, le catalogue de produits, le suivi des inventaires et le traitement des transactions. Le système doit être évolutif, maintenable et démontrer les principes d'architecture logicielle moderne.

### Exigences clés

- Support pour plusieurs domaines métier avec des responsabilités distinctes
- Évolutivité pour gérer des charges variables à travers différentes zones fonctionnelles
- Déploiement et développement indépendants de différents composants
- Isolation des pannes entre les différentes fonctions métier
- Diversité technologique et autonomie d'équipe pour différents services
- Démonstration éducative des patterns de systèmes distribués modernes

### Contraintes

- Projet académique avec des ressources de développement limitées
- Besoin de surveillance et d'observabilité complètes
- Exigence de tests de charge et de validation de performance
- Environnement de développement et déploiement basé sur Docker

## Décision

J'implémenterai une **architecture microservices** avec la décomposition de services suivante :

### Limites des services

1. **Service Utilisateur** (`user-service:3001`)
   - Authentification et autorisation
   - Gestion des profils utilisateur
   - Gestion des tokens JWT
   - Contrôle d'accès basé sur les rôles (admin/client)

2. **Service Catalogue** (`catalog-service:3002`)
   - Gestion du catalogue de produits
   - Gestion des informations de magasin
   - Suivi des stocks d'inventaire
   - Agrégation d'analytiques pour le tableau de bord

3. **Service Transactions** (`transaction-service:3003`)
   - Traitement des transactions de vente
   - Gestion des remboursements
   - Historique des transactions
   - Rapports financiers

4. **Service Saga Orchestrator** (`saga-orchestrator-service:3004`)
   - Orchestration des workflows de vente distribuée
   - Gestion des états de saga avec compensation automatique
   - Coordination multi-services pour cohérence transactionnelle
   - Observabilité des transactions distribuées

### Infrastructure de support

- **Kong API Gateway** pour le routage centralisé, l'authentification et les préoccupations transversales
- **Base de données PostgreSQL partagée** pour la cohérence des données et une gestion simplifiée
- **Redis** pour la mise en cache distribuée et la gestion de session
- **Prometheus + Grafana** pour une surveillance et observabilité complètes

## Justification

### Pourquoi Microservices plutôt que Monolithe

1. **Séparation des domaines** : Chaque service représente un domaine métier distinct avec des limites claires
2. **Développement indépendant** : Les équipes peuvent travailler sur différents services sans surcharge de coordination
3. **Diversité technologique** : Les services peuvent utiliser différentes technologies et frameworks selon les besoins
4. **Évolutivité** : Différents services peuvent être mis à l'échelle indépendamment selon les patterns de charge
5. **Isolation des pannes** : L'échec d'un service ne se propage pas aux autres
6. **Valeur éducative** : Démontre les patterns et défis des systèmes distribués modernes

### Pourquoi Base de données partagée

Bien que les microservices préconisent généralement une base de données par service, j'ai choisi une approche de base de données partagée pour ce projet parce que :

1. **Gestion simplifiée des données** : Plus facile de maintenir l'intégrité référentielle entre services
2. **Complexité réduite** : Moins de pièces mobiles pour la démonstration académique
3. **Cohérence transactionnelle** : Transactions ACID à travers les domaines métier
4. **Vélocité de développement** : Développement plus rapide avec un schéma partagé
5. **Contraintes de ressources** : Une seule instance de base de données réduit la surcharge d'infrastructure

## Détails d'implémentation

### Communication entre services

- **Synchrone** : APIs HTTP/REST via Kong API Gateway
- **Pattern API Gateway** : Routage centralisé, authentification, limitation de débit et surveillance
- **Découverte de services** : Noms de services basés sur conteneurs dans le réseau Docker Compose

### Gestion des données

- **Base de données partagée** : PostgreSQL avec Prisma ORM
- **Migrations de base de données** : Gestion centralisée du schéma avec Prisma Migrate
- **Couche de cache** : Redis pour l'optimisation des performances à travers tous les services

### Préoccupations transversales

- **Authentification** : Tokens JWT validés au niveau de l'API Gateway
- **Surveillance** : Collection de métriques Prometheus depuis tous les services
- **Journalisation** : Journalisation structurée avec IDs de corrélation
- **Limitation de débit** : Implémentée au niveau de l'API Gateway
- **CORS** : Configuré à l'API Gateway pour l'intégration frontend

### Stack technologique par service

- **Stack commun** : Node.js 18+, TypeScript, Express.js
- **Bibliothèques partagées** : Utilitaires communs dans le répertoire `/shared`
- **Déploiement** : Conteneurs Docker orchestrés avec Docker Compose

## Conséquences

### Positif

- **Séparation claire des responsabilités** : Chaque service a une responsabilité unique
- **Évolutivité indépendante** : Les services peuvent être mis à l'échelle selon leurs patterns de charge individuels
- **Flexibilité technologique** : Chaque service peut évoluer indépendamment
- **Isolation des pannes** : Les échecs de service ne se propagent pas à travers le système
- **Parallélisation du développement** : Plusieurs équipes peuvent travailler sur différents services
- **Granularité de surveillance** : Observabilité fine par service
- **Tests de charge** : Peut tester des services individuels ou des scénarios de bout en bout

### Négatif

- **Complexité accrue** : Plus de pièces mobiles à gérer et surveiller
- **Latence réseau** : Surcharge de communication inter-services
- **Cohérence des données** : Défis potentiels avec la cohérence éventuelle
- **Surcharge opérationnelle** : Plus de services à déployer, surveiller et maintenir
- **Complexité de test** : Besoin de tests d'intégration et de contrat
- **Difficulté de débogage** : Traçage distribué requis pour la résolution de problèmes

### Risques et atténuations

- **Échecs de communication entre services** : Atténués avec les vérifications de santé de l'API Gateway et les disjoncteurs
- **Problèmes de cohérence des données** : Atténués avec la base de données partagée et les limites transactionnelles
- **Complexité de surveillance** : Atténuée avec la configuration complète Prometheus/Grafana
- **Surcharge de développement** : Atténuée avec les bibliothèques partagées et l'environnement de développement Docker

## Alternatives considérées

### 1. Architecture Monolithique

- **Avantages** : Déploiement plus simple, tests plus faciles, meilleures performances
- **Inconvénients** : Évolutivité limitée, verrouillage technologique, difficile à maintenir quand le système grandit
- **Rejeté** : Ne démontre pas les patterns de systèmes distribués modernes

### 2. Architecture Serverless

- **Avantages** : Auto-scaling, paiement à l'usage, pas de gestion de serveur
- **Inconvénients** : Démarrages à froid, verrouillage fournisseur, limité pour la démonstration académique
- **Rejeté** : Trop complexe pour un projet académique, valeur d'apprentissage limitée

### 3. Architecture Événementielle

- **Avantages** : Couplage lâche, meilleure tolérance aux pannes, évolutivité
- **Inconvénients** : Complexité de l'event sourcing, défis de cohérence éventuelle
- **Rejeté** : Trop complexe pour la portée du projet, nécessiterait un event store

## Surveillance et validation

### Métriques de succès

- **Indépendance des services** : Chaque service peut être déployé et mis à l'échelle indépendamment
- **Temps de réponse** : Le routage API Gateway ajoute <50ms de latence
- **Isolation des pannes** : Les échecs de service ne se propagent pas aux autres services
- **Vélocité de développement** : Les équipes peuvent développer des services en parallèle
- **Couverture de surveillance** : Tous les services ont des métriques et alertes complètes

### Approche de validation

- **Tests de charge** : Scénarios k6 testant des services individuels et des flux de bout en bout
- **Injection de pannes** : Échec intentionnel de services pour tester l'isolation
- **Surveillance de performance** : Métriques Prometheus pour la latence, le débit et les taux d'erreur
- **Vérifications de santé** : Tous les services exposent des endpoints de santé pour la surveillance

## Références

- [Microservices Architecture Patterns](https://microservices.io/)
- [Documentation Kong API Gateway](https://docs.konghq.com/)
- [Meilleures pratiques de surveillance Prometheus](https://prometheus.io/docs/practices/)
- [Domain-Driven Design et Microservices](https://martinfowler.com/articles/microservices.html)

## ADRs liés

- [ADR-002: Kong API Gateway pour le routage centralisé](./002-kong-api-gateway.md)
- [ADR-003: Stratégie de base de données partagée](./003-shared-database-strategy.md)
- [ADR-004: Stratégie de cache Redis](./004-redis-caching-strategy.md)
