# Diagrammes UML - LOG430 Magasin (Mise à Jour 2025)

Ce dossier contient tous les diagrammes UML du système de gestion de magasin LOG430, créés avec PlantUML et reflétant l'architecture actuelle du système avec **infrastructure de base de données centralisée** et **monitoring complet**.

## Diagrammes disponibles

### 1. Diagramme d'architecture système (`architecture-systeme.puml`)

**Description** : Vue d'ensemble de l'architecture microservices moderne avec Kong Gateway, services backend, base de données centralisée PostgreSQL, Redis pour le cache, et stack de monitoring complet.

**Composants principaux** :

- **Frontend React 19** avec Vite 6 et Material-UI v7
- **Kong API Gateway** avec rate limiting et métriques
- **3 microservices** avec infrastructure partagée :
  - User Service (Port 3001) - Authentification & gestion utilisateurs
  - Catalog Service (Port 3002) - Catalogue produits & inventaire  
  - Transaction Service (Port 3003) - Ventes & remboursements
- **Base de données PostgreSQL 15** centralisée avec connection pooling
- **Redis 7** pour cache distribué avec stratégies par service
- **Monitoring Stack complet** : Prometheus + Grafana + Exporters
- **Tests de charge k6** avec scénarios multiples

### 2. Diagramme de classes (`diagramme-classe.puml`)

**Description** : Modèle de classes détaillé montrant l'architecture centralisée avec shared infrastructure, entités du domaine, couches application et infrastructure.

**Packages principaux** :

- **Domain Models** : Store, Product, Stock, User, Sale, Refund avec relations complètes
- **Shared Infrastructure** : DatabaseManager, CrossDomainQueries, BaseRepository
- **Application Layer** : Use Cases spécialisés par domaine avec DTOs
- **Infrastructure Controllers** : REST API endpoints avec caching middleware
- **Shared Services** : Cache, HTTP Client, Metrics, Logging centralisés
- **Frontend Components** : React/Context avec Material-UI et API services
- **Repository Pattern** : Shared repositories avec frontières de domaine

### 3. Diagramme des cas d'utilisation (`diagramme-CU.puml`)

**Description** : Cas d'utilisation complets pour les acteurs Client et Gestionnaire (Admin) avec tous les scénarios implémentés.

**Acteurs** :

- **Client** : 
  - Authentification (login/register)
  - Consultation produits avec recherche
  - Gestion panier avec validation temps réel
  - Achat avec mise à jour stock automatique
  - Historique des achats et remboursements
  - Demandes de remboursement avec workflow
  
- **Gestionnaire (Admin)** : 
  - Gestion complète des produits (CRUD)
  - Gestion des magasins et localisations
  - Gestion de l'inventaire avec alertes stock faible
  - Dashboard analytics avec PDF reports
  - Surveillance des ventes et performance
  - Gestion des utilisateurs et rôles

**Cas d'utilisation système** : 
- Réservation de stock temps réel
- Cache multiniveau avec invalidation
- Métriques et monitoring automatiques
- Validation cross-domain entre services

### 4. Diagramme de déploiement (`diagramme-deploiement.puml`)

**Description** : Architecture de déploiement avec Docker Compose, montrant tous les conteneurs, leurs connexions, et l'infrastructure de monitoring.

**Conteneurs & Services** :

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Host                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ │
│  │   Frontend      │   │   Kong Gateway  │   │   Monitoring    │ │
│  │   (Local Dev)   │   │   Container     │   │   Stack         │ │
│  │  localhost:5173 │   │  localhost:8000 │   │                 │ │
│  └─────────────────┘   └─────────────────┘   │ ┌─────────────┐ │ │
│                                               │ │ Prometheus  │ │ │
│  ┌─────────────────────────────────────────┐ │ │   :9090     │ │ │
│  │           Microservices Network         │ │ └─────────────┘ │ │
│  │  ┌─────────────┐   ┌─────────────┐    │ │ ┌─────────────┐ │ │
│  │  │User Service │   │Catalog Svc  │    │ │ │  Grafana    │ │ │
│  │  │   :3001     │   │   :3002     │    │ │ │   :3004     │ │ │
│  │  └─────────────┘   └─────────────┘    │ │ └─────────────┘ │ │
│  │  ┌─────────────┐                       │ │ ┌─────────────┐ │ │
│  │  │Transaction  │                       │ │ │ Node Exp.   │ │ │
│  │  │Service :3003│                       │ │ │   :9100     │ │ │
│  │  └─────────────┘                       │ │ └─────────────┘ │ │
│  └─────────────────────────────────────────┘ └─────────────────┘ │
│  ┌─────────────────────────────────────────┐                     │
│  │           Data Layer                    │                     │
│  │  ┌─────────────┐   ┌─────────────┐    │                     │
│  │  │PostgreSQL 15│   │  Redis 7    │    │                     │
│  │  │ (Centralisé)│   │  (Cache)    │    │                     │
│  │  │   :5432     │   │   :6379     │    │                     │
│  │  └─────────────┘   └─────────────┘    │                     │
│  └─────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Modèle de Domaine Métier (`MDD.puml`)

**Description** : Modèle de domaine détaillé montrant les entités métier, leurs relations, et les règles de gestion implémentées.

**Entités Principales** :

- **User** : Utilisateurs avec rôles (admin/client)
- **Store** : Magasins physiques avec localisation
- **Product** : Catalogue produits avec prix et descriptions
- **Stock** : Inventaire par magasin (table de jonction)
- **Sale/SaleLine** : Transactions de vente avec détails
- **Refund/RefundLine** : Remboursements avec validation métier

**Relations & Contraintes** :

- Relations one-to-many et many-to-many avec foreign keys
- Contraintes d'intégrité (stock non négatif, prix positifs)
- Règles métier (un produit par magasin, remboursement <= vente originale)
- Index de performance sur les clés étrangères et dates

### 6. RDCU Vente & Remboursement (`RDCU-Vente.puml`, `RDCU-Remboursement.puml`)

**Description** : Diagrammes de Réalisation des Cas d'Utilisation montrant l'interaction entre les couches pour les processus de vente et remboursement.

**Scénarios Couverts** :

- **Processus de Vente** : Validation → Réservation Stock → Transaction → Confirmation
- **Processus de Remboursement** : Validation Vente → Règles Métier → Ajustement Stock → Transaction

## Architecture Mise à Jour (2025)

Les diagrammes reflètent l'évolution architecturale suivante :

### Évolutions Clés

1. **Infrastructure Centralisée** : Migration vers une base de données centralisée avec repositories partagés
2. **Monitoring Complet** : Implémentation des Four Golden Signals avec Prometheus/Grafana
3. **Cache Stratégique** : Redis avec stratégies spécifiques par service et invalidation automatique
4. **API Gateway Sécurisé** : Kong avec rate limiting, authentification, et métriques
5. **Tests de Performance** : Suite k6 complète avec scénarios variés

### Technologies Actuelles

- **Frontend** : React 19 + Material-UI v7 + Vite 6
- **Backend** : Node.js 18+ + TypeScript + Express.js
- **Database** : PostgreSQL 15 avec Prisma ORM v5
- **Cache** : Redis 7 avec stratégies par service
- **Monitoring** : Prometheus + Grafana + Exporters
- **Gateway** : Kong avec plugins de sécurité
- **Testing** : k6 + Jest pour tests complets
- **Container** : Docker + Docker Compose

## Génération et Mise à Jour

Les diagrammes sont créés avec **PlantUML** et peuvent être régénérés automatiquement. Pour mettre à jour :

1. Modifier les fichiers `.puml` correspondants
2. Utiliser PlantUML pour générer les images
3. Valider la cohérence avec l'implémentation actuelle
4. Mettre à jour cette documentation si nécessaire

---

*Dernière mise à jour : 16 juillet 2025*  
*Statut : À jour avec l'implémentation courante*  
*Architecture : Microservices avec Infrastructure Centralisée*

- Frontend (Nginx + React)
- Kong Gateway
- Services backend (Node.js + Express)
- Base de données PostgreSQL
- Redis Cache
- Monitoring (Prometheus + Grafana)
- Migration de DB

### 5. Modèle du domaine (`MDD.puml`)

**Description** : Modèle conceptuel des entités métier avec leurs relations et contraintes.

**Entités principales** :

- Product, Store, Stock, User, Sale, SaleLine, Refund, RefundLine

**Contraintes importantes** :

- Stock : UNIQUE(storeId, productId)
- User : UNIQUE(name)
- Relations 1:n et n:m entre entités

### 6. Diagramme de séquence - Vente (`RDCU-Vente.puml`)

**Description** : Séquence détaillée du processus de vente avec validation de stock et gestion des transactions.

**Flux principal** :

1. Client ajoute au panier et procède au checkout
2. Frontend → Kong Gateway → Transaction Service
3. Validation du stock via Catalog Service
4. Création de la vente et mise à jour du stock
5. Invalidation du cache et métriques
6. Retour du reçu au client

### 7. Diagramme de séquence - Remboursement (`RDCU-Remboursement.puml`)

**Description** : Séquence du processus de remboursement avec restoration du stock.

**Flux principal** :

1. Client consulte l'historique et demande un remboursement
2. Validation de la vente et éligibilité
3. Création du remboursement
4. Restoration du stock via Catalog Service
5. Mise à jour du statut de vente
6. Invalidation des caches

## Génération des diagrammes

Pour générer les images PNG à partir des fichiers PlantUML :

```bash
# Installer PlantUML
npm install -g plantuml

# Générer tous les diagrammes
plantuml docs/diagrams/*.puml

# Ou générer un diagramme spécifique
plantuml docs/diagrams/architecture-systeme.puml
```

## Conventions utilisées

- **Couleurs** : Cohérentes avec l'architecture (bleu pour services, vert pour succès, rouge pour erreurs)
- **Stéréotypes** : Utilisation de stéréotypes UML appropriés
- **Nommage** : Noms en français pour les diagrammes métier, anglais pour les composants techniques
- **Détail** : Niveau de détail adapté à chaque type de diagramme

## Correspondance avec le code

Tous les diagrammes reflètent fidèlement l'implémentation actuelle du système :

- Les entités correspondent au schéma Prisma (`src/prisma/schema.prisma`)
- Les services correspondent aux microservices (`src/services/`)
- Les composants frontend correspondent aux composants React (`src/web-client/src/`)
- L'architecture de déploiement correspond à `src/docker-compose.yml`

## Maintenance

Ces diagrammes doivent être mis à jour lorsque :

- De nouvelles entités ou relations sont ajoutées
- L'architecture des services change
- De nouveaux cas d'utilisation sont implémentés
- Les processus métier sont modifiés
