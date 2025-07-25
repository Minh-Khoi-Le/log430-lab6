# ADR-004: Stratégie de surveillance Prometheus et Grafana

## Statut

**ACCEPTÉ** - Implémentation terminée (08-01-2025)

## Contexte

Notre architecture microservices nécessite une surveillance et observabilité complètes pour :

- **Détecter les problèmes** : Identifier rapidement les problèmes de performance et les pannes
- **Comprendre le comportement du système** : Obtenir des insights sur les performances et patterns d'utilisation
- **Assurer les objectifs de niveau de service** : Surveiller les indicateurs clés de performance
- **Supporter le débogage** : Fournir des métriques détaillées pour le dépannage
- **Démontrer l'observabilité** : Montrer les pratiques de surveillance modernes à des fins académiques

### Quatre signaux dorés

Je dois surveiller les quatre signaux dorés de surveillance :

1. **Latence** : Temps nécessaire pour traiter une requête
2. **Trafic** : Quantité de demande placée sur le système
3. **Erreurs** : Taux de requêtes qui échouent
4. **Saturation** : Niveau de "charge" du service (CPU, mémoire, disque, réseau)

### Exigences

- Surveiller tous les microservices (user, catalog, transaction)
- Collecter les métriques système (CPU, mémoire, disque, réseau)
- Surveiller les composants d'infrastructure (PostgreSQL, Redis, Kong)
- Fournir des tableaux de bord visuels pour différents intervenants
- Supporter l'alerte pour les problèmes critiques
- Permettre l'analyse de performance et la planification de capacité
- Intégrer avec les tests de charge pour la validation de performance

### Contraintes

- Doit s'intégrer avec l'environnement de développement Docker Compose
- Doit fournir des capacités de surveillance en temps réel
- Doit être rentable pour un projet académique
- Doit supporter la rétention de métriques pour l'analyse historique
- Doit fournir des insights actionnables pour l'optimisation système

## Décision

J'implémenterai une solution de surveillance complète utilisant :

### Stack de surveillance de base

- **Prometheus** : Collection, stockage et alertes de métriques
- **Grafana** : Visualisation, tableaux de bord et interface d'alertes
- **Node Exporter** : Collection de métriques au niveau système
- **PostgreSQL Exporter** : Métriques de performance de base de données
- **Redis Exporter** : Métriques de performance du cache

### Intégration des services

Tous les microservices vont :

- Exposer un endpoint `/metrics` pour le scraping Prometheus
- Utiliser la librairie `prom-client` pour les métriques personnalisées
- Implémenter des endpoints de vérification de santé
- Fournir une journalisation structurée avec des IDs de corrélation

### Stratégie de tableau de bord

1. **Tableau de bord des signaux dorés** : Vue d'ensemble de la santé système
2. **Tableaux de bord spécifiques aux services** : Métriques détaillées par service
3. **Tableau de bord d'infrastructure** : Métriques système et de base de données
4. **Tableau de bord des métriques business** : Métriques de transaction et d'utilisateur

## Justification

### Pourquoi Prometheus

1. **Modèle pull** : Les services exposent les métriques, Prometheus les scrape
2. **Base de données de séries temporelles** : Stockage et requête efficaces des métriques
3. **Langage de requête puissant** : PromQL pour l'analyse de métriques complexes
4. **Découverte de services** : Découverte automatique des services à surveiller
5. **Alertes** : Règles d'alerte intégrées et système de notification
6. **Écosystème** : Large écosystème d'exporters et intégrations

### Pourquoi Grafana

1. **Visualisation riche** : Capacités complètes de graphiques et diagrammes
2. **Gestion de tableaux de bord** : Création et partage faciles de tableaux de bord
3. **Intégration de sources de données** : Intégration Prometheus native
4. **Alertes** : Configuration et gestion visuelles des alertes
5. **Gestion d'utilisateurs** : Contrôle d'accès basé sur les rôles
6. **Extensibilité** : Écosystème de plugins pour fonctionnalités supplémentaires

### Pourquoi les quatre signaux dorés

1. **Standard de l'industrie** : Framework prouvé des pratiques Google SRE
2. **Couverture complète** : Couvre tous les aspects critiques de la santé système
3. **Insights actionnables** : Fournit des indicateurs clairs pour quand investiguer
4. **Standardisation** : Vocabulaire commun pour discuter de la santé système
5. **Scalabilité** : Applicable aux systèmes de toute taille et complexité

## Détails d'implémentation

### Configuration Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'catalog-service'
    static_configs:
      - targets: ['catalog-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'transaction-service'
    static_configs:
      - targets: ['transaction-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'kong'
    static_configs:
      - targets: ['kong:8000']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Implémentation des métriques de service

```typescript
// Implémentation des métriques dans les services
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Métriques de requêtes HTTP
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Métriques business
const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users'
});

const salesTotal = new Counter({
  name: 'sales_total',
  help: 'Total number of sales transactions',
  labelNames: ['store_id']
});

// Middleware pour la collecte automatique de métriques
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.path,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });
  
  next();
};
```

### Alert Rules

```yaml
# alert_rules.yml
groups:
  - name: service_alerts
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }} seconds"

      - alert: DatabaseConnections
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "PostgreSQL has {{ $value }} active connections"
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Four Golden Signals",
    "panels": [
      {
        "title": "Request Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "{{ service }} errors"
          }
        ]
      },
      {
        "title": "System Saturation",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ]
      }
    ]
  }
}
```

## Conséquences

### Résultats positifs

1. **Détection proactive des problèmes** : Les alertes notifient des problèmes avant que les utilisateurs soient affectés
2. **Insights de performance** : Métriques détaillées permettent l'optimisation des performances
3. **Planification de capacité** : Données historiques supportent les décisions de mise à l'échelle
4. **Support de débogage** : Contexte riche de métriques pour le dépannage
5. **Surveillance de niveau de service** : Visibilité claire sur la santé des services
6. **Valeur éducative** : Démontre les pratiques d'observabilité modernes

### Résultats négatifs

1. **Surcharge de ressources** : L'infrastructure de surveillance consomme des ressources système
2. **Exigences de stockage** : Les données de métriques nécessitent un stockage persistant
3. **Complexité** : Composants supplémentaires à configurer et maintenir
4. **Fatigue d'alerte** : Alertes mal configurées peuvent créer du bruit
5. **Courbe d'apprentissage** : L'équipe doit apprendre Prometheus et Grafana
6. **Surcharge opérationnelle** : La stack de surveillance nécessite sa propre surveillance

### Atténuation des risques

- **Limites de ressources** : Configurer des limites de ressources appropriées pour les composants de surveillance
- **Politiques de rétention** : Implémenter des politiques de rétention de données pour gérer le stockage
- **Ajustement d'alertes** : Ajuster soigneusement les seuils d'alerte pour minimiser les faux positifs
- **Haute disponibilité** : Déployer la surveillance en configuration clusterisée pour la production
- **Documentation** : Documentation complète pour la configuration et l'utilisation de la surveillance

## Performance Characteristics

### Expected Impact

- **CPU Overhead**: <5% additional CPU usage per service
- **Memory Usage**: ~100MB for Prometheus, ~50MB for Grafana
- **Network Traffic**: ~1KB per scrape interval per service
- **Storage**: ~1GB per month for metrics retention

### Scalability Considerations

- **Metrics Cardinality**: Careful management of label cardinality
- **Scrape Frequency**: Balance between accuracy and overhead
- **Retention Period**: Configure appropriate retention for storage capacity
- **Federation**: Consider Prometheus federation for larger deployments

## Monitoring Integration

### Load Testing Integration

```javascript
// k6 load test with custom metrics
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const errorRate = new Counter('errors');
const responseTime = new Trend('response_time');

export default function () {
  const response = http.get('http://localhost:8000/api/products');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  responseTime.add(response.timings.duration);
}
```

### Health Check Integration

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };
  
  res.json(health);
});
```

## Alternatives considérées

### 1. Stack ELK (Elasticsearch, Logstash, Kibana)

**Avantages :**

- Excellent pour l'analyse de logs
- Capacités de recherche puissantes
- Options de visualisation riches

**Inconvénients :**

- Intensif en ressources
- Configuration complexe
- Principalement axé sur les logs, pas les métriques

**Rejeté :** Trop complexe pour la surveillance de métriques

### 2. DataDog/New Relic (Solutions SaaS)

**Avantages :**

- Service entièrement géré
- Fonctionnalités avancées
- Pas de surcharge opérationnelle

**Inconvénients :**

- Coût prohibitif pour projet académique
- Dépendance fournisseur
- Personnalisation limitée

**Rejeté :** Pas adapté pour projet académique

### 3. Journalisation simple (Winston + Fichier)

**Avantages :**

- Surcharge minimale
- Facile à implémenter
- Pas d'infrastructure supplémentaire

**Inconvénients :**

- Pas de surveillance en temps réel
- Visualisation limitée
- Analyse manuelle des logs

**Rejeté :** Insuffisant pour les besoins d'observabilité modernes

### 4. Outils de surveillance de performance d'application (APM)

**Avantages :**

- Insights détaillés d'application
- Instrumentation automatique
- Visibilité au niveau du code

**Inconvénients :**

- Configuration complexe
- Surcharge de performance
- Surveillance d'infrastructure limitée

**Rejeté :** Trop complexe pour la portée du projet

## Validation and Success Metrics

### Success Criteria

- **Metric Collection**: All services expose metrics successfully
- **Dashboard Functionality**: All dashboards display relevant data
- **Alert Effectiveness**: Alerts fire appropriately for actual issues
- **Performance Impact**: Monitoring overhead within acceptable limits
- **Operational Readiness**: Team can use monitoring for troubleshooting

### Validation Approach

- **Synthetic Testing**: Automated tests to verify metric collection
- **Load Testing**: Validate monitoring under load conditions
- **Failure Testing**: Verify alerts fire during simulated failures
- **Performance Testing**: Measure monitoring overhead impact
- **User Acceptance**: Team validation of dashboard usability

### Key Performance Indicators

- **Metric Availability**: 99.9% uptime for monitoring stack
- **Alert Accuracy**: <5% false positive rate for alerts
- **Query Performance**: PromQL queries execute in <1 second
- **Dashboard Load Time**: Grafana dashboards load in <3 seconds
- **Storage Efficiency**: Metrics storage growth within projected limits

## Operational Procedures

### Daily Operations

- Monitor key dashboards for system health
- Review alert notifications and take action
- Validate metric collection from all services
- Check monitoring stack health and performance

### Weekly Operations

- Review alert effectiveness and tune thresholds
- Analyze performance trends and capacity planning
- Update dashboards based on operational needs
- Backup monitoring configuration and data

### Monthly Operations

- Review metrics retention policies
- Analyze long-term performance trends
- Update alert rules based on operational experience
- Validate disaster recovery procedures

## ADRs liés

- [ADR-001: Architecture microservices](./001-microservices-architecture.md)
- [ADR-002: Kong API Gateway](./002-kong-api-gateway.md)
- [ADR-003: Stratégie de base de données partagée](./003-shared-database-strategy.md)

## Références

- [Documentation Prometheus](https://prometheus.io/docs/)
- [Documentation Grafana](https://grafana.com/docs/)
- [Quatre signaux dorés](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Site Reliability Engineering](https://sre.google/sre-book/)
- [Meilleures pratiques Prometheus](https://prometheus.io/docs/practices/)
