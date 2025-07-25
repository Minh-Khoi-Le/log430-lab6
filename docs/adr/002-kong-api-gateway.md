# ADR-002: Kong API Gateway pour le routage centralisé et les préoccupations transversales

## Statut

**ACCEPTÉ** - Implémentation terminée (08-01-2025)

## Contexte

Dans notre architecture microservices, j'ai besoin d'une solution centralisée pour gérer les préoccupations transversales telles que :

- **Routage des requêtes** : Diriger les requêtes client vers les microservices appropriés
- **Authentification et autorisation** : Sécurité centralisée sans dupliquer la logique à travers les services
- **Limitation de débit** : Protéger les services contre les abus et assurer une utilisation équitable des ressources
- **Surveillance** : Collecter les métriques et logs de tous les appels API
- **CORS** : Gérer les requêtes cross-origin pour le frontend React
- **Documentation API** : Fournir une interface API unifiée

### Exigences

- Router les requêtes vers trois microservices (user, catalog, transaction)
- Implémenter l'authentification basée sur des clés API
- Supporter les endpoints publics et authentifiés
- Intégrer avec la stack de surveillance (Prometheus)
- Gérer CORS pour le frontend React fonctionnant sur un port différent
- Fournir une limitation de débit pour prévenir les abus
- Support pour la transformation de requête/réponse si nécessaire

### Contraintes

- Doit s'intégrer avec l'environnement de développement Docker Compose
- Devrait être configurable via une configuration déclarative
- Doit supporter les vérifications de santé pour la découverte de services
- Devrait fournir des métriques complètes pour la surveillance
- Doit gérer les pannes de service avec élégance

## Décision

J'utiliserai **Kong Gateway** comme solution d'API Gateway avec la configuration suivante :

### Configuration de routage des services

```yaml
# Définitions des services Kong Gateway
services:
  - name: user-service
    url: http://user-service:3000
    routes:
      - paths: ["/api/users", "/api/auth"]
        
  - name: catalog-service
    url: http://catalog-service:3000
    routes:
      - paths: ["/api/products", "/api/stock"]
        
  - name: catalog-service-public
    url: http://catalog-service:3000
    routes:
      - paths: ["/api/stores"]
        # Aucune authentification requise
        
  - name: transaction-service
    url: http://transaction-service:3000
    routes:
      - paths: ["/api/sales", "/api/refunds"]
```

### Configuration des plugins

1. **Authentification** : Plugin Key-Auth pour la validation des clés API
2. **Limitation de débit** : Limitation de débit basée sur Redis (300/min, 1000/heure)
3. **CORS** : Support cross-origin pour le frontend React
4. **Prometheus** : Collection de métriques pour la surveillance
5. **Limitation de taille de requête** : Prévenir les attaques de large payload

### Gestion des clés API

- **Consumer Frontend** : `frontend-app` avec clé `frontend-app-key-12345`
- **Consumer Mobile** : `mobile-app` avec clé `mobile-app-key-67890`
- Clés passées via l'en-tête `X-API-Key`

## Justification

### Pourquoi Kong Gateway

1. **Solution mature** : Prêt pour la production avec un écosystème de plugins extensif
2. **Configuration déclarative** : Configuration basée YAML s'adapte à notre approche GitOps
3. **Haute performance** : Construit sur OpenResty/Nginx pour une performance optimale
4. **Riche écosystème de plugins** : Plugins intégrés pour les exigences communes
5. **Intégration de surveillance** : Support natif des métriques Prometheus
6. **Support Docker** : Images Docker officielles et support de conteneur

### Pourquoi le pattern API Gateway

1. **Préoccupations transversales centralisées** : Éviter de dupliquer l'authentification, la journalisation, etc.
2. **Point d'entrée unique** : Intégration client simplifiée
3. **Abstraction de service** : Cacher la topologie interne des services aux clients
4. **Équilibrage de charge** : Distribuer les requêtes entre les instances de service
5. **Tolérance aux pannes** : Patterns de disjoncteur et logique de retry
6. **Sécurité** : Application centralisée des politiques de sécurité

### Pourquoi configuration déclarative

1. **Contrôle de version** : Configuration en tant que code dans Git
2. **Reproductibilité** : Environnements cohérents entre développement/production
3. **Automatisation** : Facile à intégrer avec les pipelines CI/CD
4. **Documentation** : La configuration sert de documentation
5. **Validation** : Validation de schéma prévient les erreurs de configuration

## Détails d'implémentation

### Structure de configuration Kong

```yaml
_format_version: "3.0"
_transform: true

services:
  # Définitions des services avec URLs upstream
  
plugins:
  # Plugins globaux appliqués à tous les services
  
consumers:
  # Consommateurs de clés API pour l'authentification
```

### Découverte de services

- **Basé sur les conteneurs** : Services découverts via les noms de service Docker Compose
- **Vérifications de santé** : Kong surveille automatiquement la santé des services
- **Équilibrage de charge** : Distribution en round-robin entre les instances de service

### Implémentation de sécurité

- **Authentification par clé API** : Requise pour tous les endpoints protégés
- **Validation des requêtes** : Limites de taille et validation du type de contenu
- **Limitation de débit** : Limites de débit par consommateur et globales
- **Politique CORS** : Validation stricte d'origine pour le frontend

### Intégration de surveillance

- **Métriques Prometheus** : Latence des requêtes, débit, taux d'erreur
- **Métriques personnalisées** : Métriques spécifiques au métier de chaque service
- **Endpoints de santé** : Surveillance de la santé des services via Kong
- **Alertes** : Intégration avec Grafana pour la gestion des alertes

## Conséquences

### Résultats positifs

1. **Intégration client simplifiée** : Point d'entrée unique pour tous les appels API
2. **Sécurité centralisée** : Pas besoin d'implémenter l'authentification dans chaque service
3. **Surveillance complète** : Collecte de métriques unifiée à travers tous les services
4. **Performance améliorée** : Capacités de mise en cache et d'équilibrage de charge
5. **Meilleure gestion des erreurs** : Réponses d'erreur centralisées et logique de retry
6. **Simplicité opérationnelle** : Point unique de configuration pour les règles de routage

### Résultats négatifs

1. **Point de défaillance unique** : La panne de la passerelle affecte tous les services
2. **Latence supplémentaire** : Saut réseau supplémentaire pour toutes les requêtes
3. **Complexité opérationnelle** : Composant supplémentaire à surveiller et maintenir
4. **Complexité de configuration** : Courbe d'apprentissage pour la configuration Kong
5. **Dépendance fournisseur** : Lié au format de configuration et aux fonctionnalités de Kong

### Atténuation des risques

- **Haute disponibilité** : Kong peut être déployé en mode cluster pour la production
- **Vérifications de santé** : Surveillance complète de la santé de la passerelle
- **Stratégies de fallback** : Accès direct aux services possible en cas d'urgence
- **Validation de configuration** : Tests automatisés de la configuration Kong
- **Documentation** : Documentation complète des règles de routage

## Caractéristiques de performance

### Impact de latence attendu

- **Latence supplémentaire** : ~10-50ms par requête pour le routage et traitement des plugins
- **Bénéfices de mise en cache** : La mise en cache des réponses peut réduire la charge backend
- **Pooling de connexions** : Réutilisation efficace des connexions vers les services backend

### Considérations de débit

- **Limitation de débit** : 300 requêtes/minute par consommateur
- **Limites de connexion** : Pooling de connexions configurable
- **Utilisation mémoire** : Traitement efficace basé sur Lua

### Scalabilité

- **Mise à l'échelle horizontale** : Kong peut être mis à l'échelle indépendamment
- **Mise à l'échelle des services** : Les services backend peuvent être mis à l'échelle sans changements de passerelle
- **Mise à l'échelle de base de données** : Kong utilise Redis pour l'état de limitation de débit

## Alternatives considérées

### 1. Nginx avec configuration personnalisée

**Avantages :**

- Latence plus faible
- Plus de contrôle sur la configuration
- Pas de dépendance fournisseur

**Inconvénients :**

- Implémentation manuelle de tous les plugins
- Pas de surveillance intégrée
- Implémentation complexe de limitation de débit

**Rejeté :** Trop de développement personnalisé requis

### 2. Envoy Proxy

**Avantages :**

- Haute performance
- Ensemble de fonctionnalités riche
- Conception cloud-native

**Inconvénients :**

- Configuration complexe
- Courbe d'apprentissage plus raide
- Écosystème de plugins moins développé

**Rejeté :** Trop complexe pour un projet académique

### 3. AWS API Gateway

**Avantages :**

- Service géré
- Intégré avec l'écosystème AWS
- Mise à l'échelle automatique

**Inconvénients :**

- Dépendance fournisseur
- Considérations de coût
- Pas adapté pour le développement local

**Rejeté :** Le projet académique nécessite un développement local

### 4. Pas d'API Gateway (Accès direct aux services)

**Avantages :**

- Architecture la plus simple
- Pas de latence supplémentaire
- Communication directe entre services

**Inconvénients :**

- Problèmes CORS avec le frontend
- Logique d'authentification dupliquée
- Pas de surveillance centralisée
- Complexité côté client

**Rejeté :** Ne démontre pas les patterns d'API modernes

## Surveillance et validation

### Métriques de succès

- **Routage des requêtes** : Tous les appels API correctement routés vers les services appropriés
- **Authentification** : Seules les clés API valides peuvent accéder aux endpoints protégés
- **Limitation de débit** : Prévient les abus tout en permettant le trafic légitime
- **Surveillance** : Collecte de métriques complète de tous les endpoints
- **Gestion des erreurs** : Gestion élégante des pannes de service

### Approche de validation

- **Tests d'intégration** : Tests automatisés pour toutes les règles de routage
- **Tests de charge** : Scénarios k6 testant les performances de la passerelle
- **Tests de sécurité** : Validation de l'authentification et de l'autorisation
- **Validation de surveillance** : Confirmer que les métriques sont collectées correctement

### Indicateurs clés de performance

- **Latence de la passerelle** : <50ms de latence supplémentaire
- **Débit** : Gérer la charge attendue sans dégradation
- **Taux d'erreur** : <1% taux d'erreur dans des conditions normales
- **Disponibilité** : 99.9% de temps de fonctionnement pour le service de passerelle

## Gestion de configuration

### Environnement de développement

```yaml
# docker-compose.yml
kong:
  image: kong:latest
  ports:
    - "8000:8000"  # API publique
    - "8001:8001"  # API d'administration
  volumes:
    - ./api-gateway/kong/kong.yml:/etc/kong/kong.yml
  environment:
    KONG_DATABASE: "off"
    KONG_DECLARATIVE_CONFIG: "/etc/kong/kong.yml"
```

### Considérations de production

- **Mode base de données** : Considérer un backend PostgreSQL pour la production
- **Clustering** : Instances Kong multiples pour haute disponibilité
- **Terminaison SSL** : Configuration HTTPS pour la production
- **Gestion des secrets** : Stockage sécurisé des clés API et certificats

## ADRs liés

- [ADR-001: Architecture microservices](./001-microservices-architecture.md)
- [ADR-003: Stratégie de base de données partagée](./003-shared-database-strategy.md)
- [ADR-004: Stratégie de mise en cache Redis](./004-redis-caching-strategy.md)

## Références

- [Documentation Kong Gateway](https://docs.konghq.com/)
- [Configuration déclarative Kong](https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/)
- [Pattern API Gateway](https://microservices.io/patterns/apigateway.html)
- [Hub de plugins Kong](https://docs.konghq.com/hub/)
