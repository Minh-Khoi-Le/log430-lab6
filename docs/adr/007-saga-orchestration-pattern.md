# ADR-007: Saga Orchestration Pattern pour les Transactions Distribuées

## Statut

**ACCEPTÉ** - Implémentation terminée (04-08-2025)

## Contexte

Avec l'évolution du système vers une architecture microservices plus complexe, le processus de vente nécessite désormais des opérations coordonnées à travers plusieurs services :

1. **Vérification de stock** (Catalog Service)
2. **Réservation de stock** (Catalog Service)
3. **Traitement de paiement** (Transaction Service)
4. **Confirmation de commande** (Transaction Service)

### Défis Identifiés

- **Cohérence transactionnelle** : Les transactions ACID locales ne suffisent plus pour garantir la cohérence globale
- **Gestion des échecs partiels** : Besoin de compensation en cas d'échec d'une étape
- **Observabilité** : Traçabilité complète des workflows distribués
- **Performance** : Éviter les blocages et timeouts dans les workflows longs
- **Complexité** : Gestion des états intermédiaires et transitions

### Contraintes

- Maintenir la performance des ventes (< 500ms pour 95% des requêtes)
- Assurer l'observabilité complète via Prometheus/Grafana
- Intégration avec l'infrastructure existante (Redis, PostgreSQL)
- Compatibilité avec l'architecture microservices actuelle

## Décision

Implémentation du **pattern Saga Orchestration** avec un service dédié `saga-orchestrator-service` qui coordonne les workflows de vente distribuée.

### Architecture Choisie

#### 1. Service Saga Orchestrator (Port 3004)

**Responsabilités principales :**

- Orchestration des workflows de vente multi-services
- Gestion des états de saga avec transitions validées
- Exécution des compensations en cas d'échec
- Monitoring et métriques des workflows distribués

**Composants clés :**

```typescript
// Entité Saga avec gestion d'état
class Saga {
  id: number;
  correlationId: string;
  state: SagaState;
  currentStep: string;
  context: SagaContext;
  // ... métadonnées temporelles et d'erreur
}

// Machine à états avec transitions validées
enum SagaState {
  INITIATED,
  STOCK_VERIFYING,
  STOCK_VERIFIED,
  STOCK_RESERVING,
  STOCK_RESERVED,
  PAYMENT_PROCESSING,
  PAYMENT_PROCESSED,
  ORDER_CONFIRMING,
  SALE_CONFIRMED,
  // États de compensation
  COMPENSATING_STOCK,
  COMPENSATING_PAYMENT,
  COMPENSATED,
  FAILED
}
```

#### 2. Workflow de Vente Orchestrée

**Étapes du workflow :**

1. **Stock Verification Step**
   - Vérification de disponibilité via Catalog Service
   - Validation des quantités demandées
   - Gestion des produits indisponibles

2. **Stock Reservation Step**
   - Réservation temporaire du stock
   - Gestion des timeouts de réservation
   - Préparation de compensation automatique

3. **Payment Processing Step**
   - Traitement du paiement via Transaction Service
   - Validation des montants et informations client
   - Gestion des échecs de paiement

4. **Order Confirmation Step**
   - Création de la vente finale
   - Confirmation du stock définitif
   - Notification client

#### 3. Stratégie de Compensation

**Compensation automatique en cas d'échec :**

```typescript
// Handlers de compensation par étape
class CompensationHandler {
  async compensateStockReservation(context: SagaContext): Promise<void>
  async compensatePayment(context: SagaContext): Promise<void>
  async compensateOrderCreation(context: SagaContext): Promise<void>
}
```

**Règles de compensation :**

- **Stock reservé** → Libération automatique des quantités
- **Paiement traité** → Remboursement automatique ou crédit
- **Commande créée** → Annulation et notification client

#### 4. Intégration avec l'Infrastructure Existante

**Base de données (extension Prisma) :**

```prisma
model Saga {
  id              Int             @id @default(autoincrement())
  correlationId   String          @unique
  state           String
  currentStep     String?
  context         Json
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  completedAt     DateTime?
  errorMessage    String?
  compensationData Json?
  stepLogs        SagaStepLog[]
}

model SagaStepLog {
  id            Int       @id @default(autoincrement())
  sagaId        Int
  stepName      String
  state         String
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  duration      Int?      // millisecondes
  success       Boolean?
  errorMessage  String?
  stepData      Json?
}
```

**Cache Redis :**

- État temporaire des sagas en cours
- Cache des réservations de stock
- Métriques de performance par étape

## Rationale

### Avantages

1. **Cohérence Transactionnelle**
   - Garantie de cohérence finale (eventual consistency)
   - Compensation automatique des échecs partiels
   - Traçabilité complète des états intermédiaires

2. **Performance**
   - Workflow asynchrone non-bloquant
   - Parallélisation possible des étapes indépendantes
   - Cache Redis pour états temporaires

3. **Observabilité**
   - Logs détaillés par étape avec SagaStepLog
   - Métriques Prometheus intégrées
   - Dashboards Grafana pour monitoring des workflows

4. **Maintenabilité**
   - Séparation claire des responsabilités
   - Pattern extensible pour nouveaux workflows
   - Tests unitaires et d'intégration dédiés

5. **Résilience**
   - Gestion gracieuse des pannes partielles
   - Retry automatique configuré par étape
   - Timeouts et circuit breakers intégrés

### Inconvénients Acceptés

1. **Complexité Accrue**
   - Nouveau service à maintenir
   - Machine à états plus complexe
   - Courbe d'apprentissage pour l'équipe

2. **Latence Supplémentaire**
   - Orchestration ajoute ~50-100ms par workflow
   - Acceptable pour maintenir la cohérence

3. **Eventual Consistency**
   - États intermédiaires temporaires
   - Nécessite adaptation de l'interface utilisateur

## Alternatives Considérées

### 1. Choreography Pattern (Rejetée)

- **Avantages** : Décentralisé, moins de couplage
- **Inconvénients** : Difficile à tracer, logique métier éparpillée
- **Raison du rejet** : Complexité de debugging et manque d'observabilité centralisée

### 2. Two-Phase Commit (2PC) (Rejetée)

- **Avantages** : Cohérence forte immédiate
- **Inconvénients** : Blocage possible, point de défaillance unique
- **Raison du rejet** : Non adapté aux microservices et performances

### 3. Transactions Distribuées XA (Rejetée)

- **Avantages** : Standard industriel
- **Inconvénients** : Complexité d'implémentation, performance dégradée
- **Raison du rejet** : Overkill pour le contexte du projet

## Implémentation

### Phase 1 : Infrastructure de Base

- [x] Service saga-orchestrator-service (Port 3004)
- [x] Modèles Saga et SagaStepLog en base
- [x] Machine à états avec transitions validées
- [x] Interface ICrossDomainQueries étendue

### Phase 2 : Workflow de Vente

- [x] StockVerificationStep avec Catalog Service
- [x] StockReservationStep avec timeout
- [x] PaymentProcessingStep avec Transaction Service
- [x] OrderConfirmationStep avec création vente

### Phase 3 : Compensation et Monitoring

- [x] CompensationHandler pour chaque étape
- [x] Métriques Prometheus dédiées aux sagas
- [x] Logs structurés avec corrélation ID
- [x] Tests d'intégration complets

### Phase 4 : Optimisations

- [x] Cache Redis pour performances
- [x] Retry policies configurées
- [x] Circuit breakers par service externe
- [x] Dashboards Grafana pour workflows

## Métriques de Succès

### Métriques Fonctionnelles

- **Taux de succès** : >95% des ventes complétées avec succès
- **Taux de compensation** : <  3% des workflows nécessitant compensation
- **Durée moyenne** : <500ms pour 95% des workflows de vente

### Métriques Techniques

- **Observabilité** : 100% des étapes tracées avec corrélation ID
- **Performance** : Latence P95 < 500ms, P99 < 1000ms
- **Fiabilité** : 99.9% de disponibilité du service orchestrateur

### Métriques Monitoring (Prometheus)

```prometheus
# Métriques dédiées sagas
saga_workflow_total{workflow_type, status}
saga_workflow_duration_seconds{workflow_type, step}
saga_compensation_total{workflow_type, reason}
saga_step_errors_total{step_name, error_type}
```

## Notes d'Implémentation

### Configuration Service Discovery

```typescript
// Factory pour clients de services avec retry et circuit breaker
const serviceClientFactory = createServiceClientFactoryFromEnv({
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL,
  transactionServiceUrl: process.env.TRANSACTION_SERVICE_URL,
  retryAttempts: 3,
  circuitBreakerThreshold: 5
});
```

### Gestion des Timeouts

- **Stock Reservation** : 30 secondes (réservation temporaire)
- **Payment Processing** : 60 secondes (timeout paiement)
- **Overall Workflow** : 180 secondes (timeout total)

### Stratégie de Retry

- **Network Errors** : 3 tentatives avec backoff exponentiel
- **Service Unavailable** : 2 tentatives avec délai fixe
- **Business Logic Errors** : Pas de retry, compensation immédiate

## Impact sur l'Architecture

### Services Modifiés

1. **Catalog Service** : Nouveaux endpoints pour réservation/libération stock
2. **Transaction Service** : Endpoints adaptés pour orchestration
3. **API Gateway Kong** : Nouvelles routes vers saga-orchestrator-service

### Nouvelles Dépendances

- **Inter-Service Communication** : HTTP avec retry et circuit breaker
- **Event Sourcing Léger** : SagaStepLog pour audit et debugging
- **Cache Distribué** : Redis pour états temporaires et performance

## Conclusion

L'implémentation du pattern Saga Orchestration apporte une solution robuste et observable pour la gestion des transactions distribuées dans notre architecture microservices. Cette décision garantit la cohérence des données tout en maintenant la performance et l'observabilité requises pour un système de production.

La complexité supplémentaire est justifiée par les gains en termes de fiabilité, traçabilité et maintenabilité du système global.
