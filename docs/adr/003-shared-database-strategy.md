# ADR-003: Stratégie de base de données partagée avec PostgreSQL et Prisma ORM

## Statut

**ACCEPTÉ** - Implémentation terminée (08-01-2025)

## Contexte

Dans notre architecture microservices, Je dois décider de la stratégie de persistance des données. Le système doit gérer plusieurs domaines de données :

- **Domaine utilisateur** : Authentification des utilisateurs, profils et gestion des rôles
- **Domaine catalogue** : Produits, magasins et gestion d'inventaire
- **Domaine transaction** : Ventes, remboursements et enregistrements financiers

### Considérations clés

Les données dans notre système de vente au détail sont fortement interconnectées :

- Les transactions de vente référencent les utilisateurs, produits et magasins
- Les niveaux d'inventaire sont partagés entre plusieurs services
- Les rapports financiers nécessitent des données de tous les domaines
- Les permissions utilisateur affectent l'accès aux données de catalogue et de transaction

### Exigences

- **Cohérence des données** : Cohérence forte pour les transactions financières
- **Intégrité référentielle** : Maintenir les relations entre entités
- **Performance** : Support pour les requêtes complexes et les rapports
- **Vélocité de développement** : Prototypage rapide et évolution du schéma
- **Simplicité opérationnelle** : Minimiser la complexité d'infrastructure
- **Efficacité des coûts** : Optimiser pour les contraintes de projet académique

### Contraintes

- Projet académique avec surcharge opérationnelle limitée
- Équipe de développement familière avec les bases de données relationnelles
- Besoin de rapports complets et d'analytiques
- Environnement de développement basé sur Docker
- Les contraintes de ressources favorisent moins de composants d'infrastructure

## Décision

J'implémenterai une architecture de **base de données partagée** utilisant :

- **PostgreSQL 15** comme base de données primaire
- **Prisma ORM** pour l'accès type-safe à la base de données
- **Instance de base de données unique** partagée entre tous les microservices
- **Gestion de schéma centralisée** avec Prisma Migrate
- **Patterns d'accès à la base de données spécifiques aux services**

### Conception du schéma de base de données

```prisma
// Core Entities
model User {
  id       Int     @id @default(autoincrement())
  name     String  @unique
  role     String  @default("client")
  password String
  sales    Sale[]
  refunds  Refund[]
}

model Store {
  id      Int     @id @default(autoincrement())
  name    String
  address String?
  stocks  Stock[]
  sales   Sale[]
  refunds Refund[]
}

model Product {
  id          Int          @id @default(autoincrement())
  name        String
  price       Float
  description String?
  stocks      Stock[]
  saleLines   SaleLine[]
  refundLines RefundLine[]
}

// Junction Tables
model Stock {
  id        Int     @id @default(autoincrement())
  quantity  Int     @default(0)
  store     Store   @relation(fields: [storeId], references: [id])
  storeId   Int
  product   Product @relation(fields: [productId], references: [id])
  productId Int
  
  @@unique([storeId, productId])
}

// Transaction Tables
model Sale {
  id      Int        @id @default(autoincrement())
  date    DateTime   @default(now())
  total   Float
  status  String     @default("active")
  store   Store      @relation(fields: [storeId], references: [id])
  storeId Int
  user    User       @relation(fields: [userId], references: [id])
  userId  Int
  lines   SaleLine[]
  refunds Refund[]
}
```

### Patterns d'accès à la base de données des services

- **Service utilisateur** : Accès direct à la table User, accès en lecture seule aux entités liées
- **Service catalogue** : Accès complet aux tables Product, Store, Stock
- **Service transaction** : Accès complet aux tables Sale, Refund et tables de lignes associées
- **Accès partagé** : Tous les services peuvent lire de toutes les tables pour les rapports

## Justification

### Pourquoi une base de données partagée

1. **Cohérence des données** : Les transactions ACID assurent une cohérence forte à travers les opérations business
2. **Intégrité référentielle** : Les contraintes de clé étrangère maintiennent la qualité des données
3. **Flexibilité des requêtes** : Requêtes complexes cross-domaine pour les rapports et l'analytique
4. **Vitesse de développement** : Processus unique d'évolution et migration du schéma
5. **Simplicité opérationnelle** : Une base de données à sauvegarder, surveiller et maintenir
6. **Efficacité des coûts** : Instance unique de base de données réduit les coûts d'infrastructure

### Pourquoi PostgreSQL

1. **Technologie mature** : Fiabilité et performance prouvées
2. **Ensemble de fonctionnalités riche** : Fonctionnalités SQL avancées, support JSON, recherche full-text
3. **Cohérence forte** : Transactions ACID avec niveaux d'isolation appropriés
4. **Excellent outillage** : Écosystème complet d'outils et extensions
5. **Support Docker** : Images Docker officielles et optimisation de conteneur
6. **Support communauté** : Large communauté et documentation extensive

### Pourquoi Prisma ORM

1. **Sécurité de type** : Types TypeScript générés préviennent les erreurs runtime
2. **Query Builder** : API intuitive pour les requêtes complexes
3. **Système de migration** : Versioning et évolution du schéma
4. **Expérience développeur** : Excellent outillage et support de débogage
5. **Performance** : Génération de requêtes efficace et pooling de connexions
6. **Fonctionnalités modernes** : Support pour les patterns JavaScript/TypeScript modernes

### Rejet de base de données par service

Bien que la base de données par service soit une meilleure pratique microservices, Je l'ai rejetée pour ce projet parce que :

1. **Complexité** : Bases de données multiples augmentent la surcharge opérationnelle
2. **Cohérence des données** : La cohérence éventuelle est inappropriée pour les transactions financières
3. **Requêtes cross-service** : Les rapports nécessitent des données de domaines multiples
4. **Surcharge de développement** : Migrations de schéma multiples et synchronisation de données
5. **Focus éducatif** : Base de données partagée démontre des compromis architecturaux différents

## Détails d'implémentation

### Configuration de base de données

```yaml
# docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: log430_store
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Configuration Prisma

```prisma
// prisma/schema.prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Intégration des services

Chaque service inclut le client Prisma :

```typescript
// Initialisation du service
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// Patterns de repository spécifiques aux services
class UserRepository {
  async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: { sales: true, refunds: true }
    });
  }
}
```

### Stratégie de migration

- **Migrations centralisées** : Tous les changements de schéma dans `/prisma/migrations`
- **Contrôle de version** : Fichiers de migration suivis dans Git
- **Pipeline de déploiement** : Exécution automatisée des migrations via Docker
- **Workflow de développement** : `prisma migrate dev` pour le développement local

## Conséquences

### Résultats positifs

1. **Cohérence forte** : Les transactions ACID assurent l'intégrité des données
2. **Vélocité de développement** : Schéma unique simplifie le développement
3. **Performance des requêtes** : Stratégies de jointures et d'indexation optimisées
4. **Simplicité opérationnelle** : Une base de données à surveiller et maintenir
5. **Efficacité des coûts** : Exigences d'infrastructure réduites
6. **Débogage** : Plus facile de tracer le flux de données et déboguer les problèmes

### Résultats négatifs

1. **Couplage des services** : Services couplés via le schéma partagé
2. **Limitations de scalabilité** : Base de données unique devient goulot d'étranglement
3. **Coordination de schéma** : Les changements nécessitent coordination entre services
4. **Dépendance technologique** : Tous les services doivent utiliser un ORM compatible
5. **Rayon d'impact** : Les problèmes de base de données affectent tous les services
6. **Complexité de migration** : Les changements de schéma impactent plusieurs services

### Stratégies d'atténuation des risques

- **Surveillance de base de données** : Métriques et alertes complètes PostgreSQL
- **Pooling de connexions** : Gestion efficace des connexions entre services
- **Répliques en lecture** : Considérer les répliques en lecture pour les requêtes de rapport
- **Stratégie de sauvegarde** : Sauvegardes régulières et récupération point-dans-le-temps
- **Surveillance de performance** : Suivi et optimisation des performances de requête
- **Révisions de schéma** : Processus de révision attentif pour les changements de schéma

## Caractéristiques de performance

### Performance attendue

- **Temps de réponse des requêtes** : <100ms pour les opérations CRUD typiques
- **Débit de transactions** : 100+ transactions par seconde
- **Gestion des connexions** : 100+ connexions simultanées
- **Croissance du stockage** : Croissance gérable avec archivage approprié

### Stratégies d'optimisation

1. **Indexation** : Index stratégiques sur les colonnes fréquemment interrogées
2. **Pooling de connexions** : Configuration du pooling de connexions Prisma
3. **Optimisation des requêtes** : Patterns de requêtes Prisma efficaces
4. **Couche de cache** : Cache Redis pour les données fréquemment accédées
5. **Surveillance** : Surveillance des performances PostgreSQL

### Considérations de scalabilité

- **Mise à l'échelle verticale** : Augmenter les ressources du serveur de base de données
- **Optimisation des connexions** : Pooling de connexions efficace
- **Optimisation des requêtes** : Analyse régulière des performances de requête
- **Stratégie d'archivage** : Archiver les anciennes données de transaction
- **Répliques en lecture** : Considérer pour les charges de travail de rapport

## Alternatives considérées

### 1. Base de données par service

**Avantages :**

- Indépendance des services
- Diversité technologique
- Isolation des pannes
- Mise à l'échelle indépendante

**Inconvénients :**

- Défis de cohérence des données
- Requêtes cross-service complexes
- Surcharge opérationnelle
- Complexité de développement

**Rejeté :** La complexité dépasse les bénéfices pour ce projet

### 2. Event Sourcing

**Avantages :**

- Piste d'audit complète
- Requêtes temporelles
- Capacité de rejeu d'événements
- Scalabilité

**Inconvénients :**

- Complexité élevée
- Cohérence éventuelle
- Surcharge de stockage
- Courbe d'apprentissage

**Rejeté :** Trop complexe pour un projet académique

### 3. Base de données NoSQL (MongoDB)

**Avantages :**

- Schéma flexible
- Mise à l'échelle horizontale
- Stockage basé sur les documents
- Développement rapide

**Inconvénients :**

- Cohérence faible
- Support de transactions limité
- Relations complexes
- Limitations de requête

**Rejeté :** Modèle de données relationnel mieux adapté pour le domaine retail

### 4. Base de données en mémoire (Redis)

**Avantages :**

- Extrêmement rapide
- Structures de données simples
- Cache intégré
- Capacités pub/sub

**Inconvénients :**

- Capacités de requête limitées
- Contraintes de mémoire
- Préoccupations de durabilité
- Relations complexes

**Rejeté :** Pas adapté comme base de données primaire

## Surveillance et validation

### Métriques de succès

- **Cohérence des données** : Zéro violation d'intégrité des données
- **Performance des requêtes** : Temps de requête moyen <100ms
- **Efficacité des connexions** : Utilisation du pool de connexions <80%
- **Succès des migrations** : Déploiements de schéma sans temps d'arrêt
- **Fiabilité des sauvegardes** : Validation régulière des sauvegardes

### Approche de validation

- **Tests d'intégration** : Tests automatisés pour toutes les opérations de base de données
- **Tests de performance** : Tests de charge pour la performance de base de données
- **Tests d'intégrité des données** : Validation de l'intégrité référentielle
- **Tests de migration** : Tester les changements de schéma en environnement de staging

### Outils de surveillance

- **PostgreSQL Exporter** : Métriques Prometheus pour la performance de base de données
- **Métriques Prisma** : Performance des requêtes et métriques du pool de connexions
- **Vérifications de santé** : Validation de connectivité de base de données
- **Alertes** : Alertes proactives pour la dégradation de performance

## Considérations opérationnelles

### Environnement de développement

```bash
# Configuration de développement local
docker-compose up -d postgres
cd prisma
npx prisma migrate dev
npx prisma generate
npx prisma studio  # GUI pour l'exploration de base de données
```

### Préparation pour la production

- **Sécurité des connexions** : Chiffrement SSL/TLS pour les connexions de base de données
- **Contrôle d'accès** : Contrôle d'accès basé sur les rôles pour les utilisateurs de base de données
- **Stratégie de sauvegarde** : Sauvegardes automatisées avec politiques de rétention
- **Surveillance** : Surveillance et alertes complètes de base de données
- **Récupération de désastre** : Capacités de récupération point-dans-le-temps

## ADRs liés

- [ADR-001: Architecture microservices](./001-microservices-architecture.md)
- [ADR-002: Kong API Gateway](./002-kong-api-gateway.md)
- [ADR-004: Stratégie de mise en cache Redis](./004-redis-caching-strategy.md)

## Références

- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Documentation Prisma ORM](https://www.prisma.io/docs/)
- [Patterns de conception de base de données](https://www.martinfowler.com/articles/microservices.html#DecentralizedDataManagement)
- [Patterns de données microservices](https://microservices.io/patterns/data/database-per-service.html)
