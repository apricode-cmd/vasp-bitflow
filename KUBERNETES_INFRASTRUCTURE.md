# ☸️ Kubernetes Infrastructure Plan - Apricode Exchange

## 📋 Содержание
- [Анализ проекта](#анализ-проекта)
- [Архитектура K8s](#архитектура-k8s)
- [Расчет ресурсов](#расчет-ресурсов)
- [Манифесты](#манифесты)
- [Стоимость](#стоимость)
- [Deployment](#deployment)
- [Мониторинг](#мониторинг)

---

## 🔍 Анализ проекта

### Текущая архитектура
```
┌─────────────────────────────────────────────┐
│        Next.js 14 Monolith (3000)          │
│  - Client UI (React Server Components)     │
│  - Admin CRM                                │
│  - API Routes (/api/*)                      │
│  - Cron Jobs (/api/cron/*)                  │
│  - Webhooks (/api/kyc/webhook, etc)        │
│  - PDF Generation (@react-pdf/renderer)    │
└─────────────────────────────────────────────┘
              ↓              ↓
    ┌─────────────┐   ┌──────────────┐
    │ PostgreSQL  │   │    Redis     │
    │  (Primary)  │   │    Cache     │
    └─────────────┘   └──────────────┘
              ↓
    ┌─────────────────────────────────┐
    │   External Integrations         │
    │  • Sumsub (KYC)                 │
    │  • KYCAID (KYC)                 │
    │  • Resend (Email)               │
    │  • CoinGecko (Rates)            │
    │  • Kraken (Rates)               │
    │  • Vercel Blob (Storage)        │
    └─────────────────────────────────┘
```

### База данных (30+ models)
- **User**: ~10k records avg
- **Order**: ~50k records/year
- **KycSession**: ~10k records
- **Currency**: ~20 records (BTC, ETH, USDT, SOL)
- **AdminSession**: ~100 active sessions
- **NotificationQueue**: ~100k/year
- **AuditLog**: ~500k/year
- **EmailLog**: ~200k/year

**Оценка размера БД:**
- Year 1: ~5 GB
- Year 2: ~15 GB
- Year 3: ~30 GB

---

## ☸️ Архитектура K8s

### Компоненты кластера

```
┌────────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                        │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Namespace: production                  │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────┐         │ │
│  │  │  Ingress (Nginx/Traefik)                    │         │ │
│  │  │  - SSL Termination                          │         │ │
│  │  │  - Rate Limiting                            │         │ │
│  │  │  - DDoS Protection                          │         │ │
│  │  └─────────────────────────────────────────────┘         │ │
│  │               ↓                  ↓                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐             │ │
│  │  │  Next.js App     │  │  Next.js App     │             │ │
│  │  │  Deployment      │  │  Deployment      │  (3 replicas)│ │
│  │  │  (Replica 1)     │  │  (Replica 2)     │             │ │
│  │  └──────────────────┘  └──────────────────┘             │ │
│  │          ↓                       ↓                        │ │
│  │  ┌────────────────────────────────────────┐              │ │
│  │  │        Service: app-service            │              │ │
│  │  │        Type: ClusterIP                 │              │ │
│  │  │        Port: 3000                      │              │ │
│  │  └────────────────────────────────────────┘              │ │
│  │          ↓                       ↓                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐             │ │
│  │  │   PostgreSQL     │  │      Redis        │             │ │
│  │  │   StatefulSet    │  │   StatefulSet     │             │ │
│  │  │   (Primary)      │  │   (Master)        │             │ │
│  │  └──────────────────┘  └──────────────────┘             │ │
│  │          ↓                                                │ │
│  │  ┌──────────────────┐                                    │ │
│  │  │   PostgreSQL     │                                    │ │
│  │  │   StatefulSet    │                                    │ │
│  │  │   (Replica)      │                                    │ │
│  │  └──────────────────┘                                    │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────┐         │ │
│  │  │  CronJob: cleanup-sessions (hourly)         │         │ │
│  │  │  CronJob: process-notifications (5min)      │         │ │
│  │  └─────────────────────────────────────────────┘         │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────┐         │ │
│  │  │  PVC: postgres-data (100Gi SSD)             │         │ │
│  │  │  PVC: redis-data (10Gi SSD)                 │         │ │
│  │  │  PVC: uploads (50Gi SSD)                    │         │ │
│  │  └─────────────────────────────────────────────┘         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Namespace: monitoring                    │ │
│  │  - Prometheus                                             │ │
│  │  - Grafana                                                │ │
│  │  - Loki (Logs)                                            │ │
│  │  - AlertManager                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Расчет ресурсов

### 1. Next.js Application Pods

**Профиль нагрузки:**
- Memory: 512 MB (idle) → 2 GB (peak)
- CPU: 0.1 core (idle) → 2 cores (peak)
- Concurrent users: ~500 peak
- API requests: ~100 req/sec peak

**Рекомендуемые ресурсы (на 1 Pod):**
```yaml
resources:
  requests:
    cpu: "500m"        # 0.5 CPU core
    memory: "1Gi"      # 1 GB RAM
  limits:
    cpu: "2000m"       # 2 CPU cores
    memory: "3Gi"      # 3 GB RAM
```

**Количество реплик:**
- **Минимум (dev/staging):** 2 replicas
- **Production (low traffic):** 3 replicas
- **Production (high traffic):** 5-10 replicas (HPA)

**HPA (Horizontal Pod Autoscaler):**
```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

**Итого на App:**
- **Min (3 replicas):** 1.5 CPU, 3 GB RAM
- **Max (10 replicas):** 20 CPU, 30 GB RAM

---

### 2. PostgreSQL StatefulSet

**Профиль нагрузки:**
- Connections: ~50 active, ~200 max
- Database size: 5-30 GB (growth)
- Queries: ~500 qps (queries per second)
- Complex joins, indexes, JSONB columns

**Primary Pod:**
```yaml
resources:
  requests:
    cpu: "2000m"       # 2 CPU cores
    memory: "4Gi"      # 4 GB RAM
  limits:
    cpu: "4000m"       # 4 CPU cores
    memory: "8Gi"      # 8 GB RAM

storage:
  size: "100Gi"        # SSD (NVMe preferred)
  storageClass: "fast-ssd"
```

**Replica Pod (read-only):**
```yaml
resources:
  requests:
    cpu: "1000m"       # 1 CPU core
    memory: "2Gi"      # 2 GB RAM
  limits:
    cpu: "2000m"       # 2 CPU cores
    memory: "4Gi"      # 4 GB RAM

storage:
  size: "100Gi"        # SSD (replicated from primary)
```

**PostgreSQL Configuration:**
```sql
-- postgresql.conf optimizations
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # SSD
effective_io_concurrency = 200  # SSD
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_connections = 200
```

**Итого на PostgreSQL:**
- **Primary:** 2-4 CPU, 4-8 GB RAM, 100 GB SSD
- **Replica:** 1-2 CPU, 2-4 GB RAM, 100 GB SSD
- **Total:** 3-6 CPU, 6-12 GB RAM, 200 GB SSD

---

### 3. Redis StatefulSet

**Профиль нагрузки:**
- Cache size: ~500 MB (typical)
- Keys: ~10k-50k
- Operations: ~1000 ops/sec
- Use cases: session storage, rate limiting, cache

**Redis Pod:**
```yaml
resources:
  requests:
    cpu: "250m"        # 0.25 CPU core
    memory: "512Mi"    # 512 MB RAM
  limits:
    cpu: "1000m"       # 1 CPU core
    memory: "2Gi"      # 2 GB RAM

storage:
  size: "10Gi"         # SSD (persistence)
```

**Redis Configuration:**
```conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

**Итого на Redis:**
- **Single pod:** 0.25-1 CPU, 512 MB - 2 GB RAM, 10 GB SSD

---

### 4. Ingress Controller (Nginx)

```yaml
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"

replicas: 2  # High availability
```

---

### 5. Мониторинг Stack

#### Prometheus
```yaml
resources:
  requests:
    cpu: "500m"
    memory: "2Gi"
  limits:
    cpu: "2000m"
    memory: "8Gi"

storage:
  size: "50Gi"
  retention: "30d"
```

#### Grafana
```yaml
resources:
  requests:
    cpu: "200m"
    memory: "512Mi"
  limits:
    cpu: "500m"
    memory: "1Gi"
```

#### Loki (Logs)
```yaml
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "1000m"
    memory: "2Gi"

storage:
  size: "100Gi"
  retention: "15d"
```

---

## 📐 Итоговый расчет ресурсов

### Production Environment (Medium Load)

| Component | Replicas | CPU (req) | CPU (lim) | RAM (req) | RAM (lim) | Storage |
|-----------|----------|-----------|-----------|-----------|-----------|---------|
| **Next.js App** | 3 | 1.5 cores | 6 cores | 3 GB | 9 GB | - |
| **PostgreSQL Primary** | 1 | 2 cores | 4 cores | 4 GB | 8 GB | 100 GB |
| **PostgreSQL Replica** | 1 | 1 core | 2 cores | 2 GB | 4 GB | 100 GB |
| **Redis** | 1 | 0.25 cores | 1 core | 512 MB | 2 GB | 10 GB |
| **Nginx Ingress** | 2 | 0.4 cores | 2 cores | 512 MB | 2 GB | - |
| **Prometheus** | 1 | 0.5 cores | 2 cores | 2 GB | 8 GB | 50 GB |
| **Grafana** | 1 | 0.2 cores | 0.5 cores | 512 MB | 1 GB | - |
| **Loki** | 1 | 0.5 cores | 1 core | 1 GB | 2 GB | 100 GB |
| **System Overhead** | - | 1 core | - | 2 GB | - | - |
| **TOTAL** | - | **7.35 cores** | **18.5 cores** | **15.5 GB** | **36 GB** | **360 GB** |

### Рекомендуемый кластер

#### Вариант 1: Single Node (Dev/Small Production)
```yaml
Node Type: e2-standard-8 (GCP) / t3.2xlarge (AWS)
vCPUs: 8
Memory: 32 GB
Disk: 500 GB SSD
Price: ~$240/month (GCP) / ~$300/month (AWS)
```

**Плюсы:**
- ✅ Простота управления
- ✅ Низкая стоимость
- ✅ Подходит для до 1000 активных пользователей

**Минусы:**
- ❌ Single point of failure
- ❌ No high availability
- ❌ Ограниченное масштабирование

---

#### Вариант 2: Multi-Node (Production - Recommended) ⭐

**Cluster Configuration:**
```yaml
Node Pool 1: Application nodes
  - Instance type: e2-standard-4 (GCP) / t3.xlarge (AWS)
  - vCPUs: 4 per node
  - Memory: 16 GB per node
  - Count: 3 nodes (auto-scaling to 6)
  - Purpose: Next.js pods, Nginx, monitoring

Node Pool 2: Database nodes
  - Instance type: e2-highmem-2 (GCP) / r5.large (AWS)
  - vCPUs: 2 per node
  - Memory: 16 GB per node
  - Count: 2 nodes (PostgreSQL Primary + Replica)
  - Purpose: PostgreSQL, Redis
  - Disk: 500 GB SSD per node

Total resources:
  - vCPUs: 12-24 (min-max)
  - Memory: 48-96 GB (min-max)
  - Storage: 1 TB SSD
  - Nodes: 5-8
```

**Стоимость:**
- **GCP (GKE):** ~$500-800/month
- **AWS (EKS):** ~$600-900/month
- **DigitalOcean (DOKS):** ~$400-700/month
- **Hetzner Cloud:** ~$250-400/month (EU only)

**Плюсы:**
- ✅ High availability (HA)
- ✅ Auto-scaling
- ✅ Disaster recovery готовность
- ✅ Production-ready
- ✅ До 5000-10000 активных пользователей

---

#### Вариант 3: Enterprise (High Load)

**Cluster Configuration:**
```yaml
Node Pool 1: Application nodes
  - Instance type: e2-standard-8
  - vCPUs: 8 per node
  - Memory: 32 GB per node
  - Count: 3-10 nodes (HPA)

Node Pool 2: Database nodes
  - Instance type: e2-highmem-4
  - vCPUs: 4 per node
  - Memory: 32 GB per node
  - Count: 3 nodes (Primary + 2 Replicas)

Node Pool 3: Cache/Queue nodes
  - Instance type: e2-standard-4
  - vCPUs: 4 per node
  - Memory: 16 GB per node
  - Count: 2 nodes
```

**Стоимость:** ~$1500-2500/month

---

## 🚀 Kubernetes Manifests

### 1. Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: apricode-exchange
  labels:
    name: apricode-exchange
    environment: production
```

---

### 2. ConfigMap (Environment Variables)

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: apricode-exchange
data:
  # Application
  NODE_ENV: "production"
  NEXT_PUBLIC_APP_NAME: "Apricode Exchange"
  NEXT_PUBLIC_APP_URL: "https://app.bitflow.biz"
  
  # Database (connection from Secret)
  POSTGRES_HOST: "postgres-service"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "apricode"
  
  # Redis
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  
  # Feature Flags
  NEXT_TELEMETRY_DISABLED: "1"
```

---

### 3. Secret (Sensitive Data)

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: apricode-exchange
type: Opaque
stringData:
  # Database
  DATABASE_URL: "postgresql://postgres:SECURE_PASSWORD@postgres-service:5432/apricode"
  DIRECT_URL: "postgresql://postgres:SECURE_PASSWORD@postgres-service:5432/apricode"
  POSTGRES_PASSWORD: "SECURE_PASSWORD"
  
  # NextAuth
  AUTH_SECRET: "GENERATE_WITH_openssl_rand_base64_32"
  NEXTAUTH_SECRET: "GENERATE_WITH_openssl_rand_base64_32"
  
  # Redis
  REDIS_URL: "redis://redis-service:6379"
  
  # KYC
  KYCAID_API_KEY: "your_kycaid_key"
  KYCAID_WEBHOOK_SECRET: "your_webhook_secret"
  
  # Email
  RESEND_API_KEY: "re_xxxxxxxxxxxx"
  EMAIL_FROM: "noreply@bitflow.biz"
  
  # Integrations (optional)
  VERCEL_BLOB_READ_WRITE_TOKEN: "vercel_blob_token"
```

**Как создать Secret:**
```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Create secret from file
kubectl create secret generic app-secrets \
  --from-env-file=.env.production \
  --namespace=apricode-exchange
```

---

### 4. PostgreSQL StatefulSet

```yaml
# postgres-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: apricode-exchange
spec:
  ports:
    - port: 5432
      name: postgres
  clusterIP: None
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: apricode-exchange
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: POSTGRES_DB
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"
        
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
  
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"  # Replace with your storage class
      resources:
        requests:
          storage: 100Gi
```

---

### 5. Redis StatefulSet

```yaml
# redis-statefulset.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: apricode-exchange
spec:
  ports:
    - port: 6379
      name: redis
  clusterIP: None
  selector:
    app: redis
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: apricode-exchange
spec:
  serviceName: redis-service
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command:
        - redis-server
        - --appendonly
        - "yes"
        - --maxmemory
        - "1gb"
        - --maxmemory-policy
        - allkeys-lru
        
        resources:
          requests:
            cpu: "250m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "2Gi"
        
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
  
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: "fast-ssd"
      resources:
        requests:
          storage: 10Gi
```

---

### 6. Next.js Application Deployment

```yaml
# app-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  namespace: apricode-exchange
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
      protocol: TCP
  selector:
    app: apricode-app
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apricode-app
  namespace: apricode-exchange
spec:
  replicas: 3
  selector:
    matchLabels:
      app: apricode-app
  template:
    metadata:
      labels:
        app: apricode-app
    spec:
      # Init container for database migrations
      initContainers:
      - name: migrate
        image: your-registry/apricode-exchange:latest
        command: ["npx", "prisma", "migrate", "deploy"]
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
      
      containers:
      - name: app
        image: your-registry/apricode-exchange:latest
        ports:
        - containerPort: 3000
          name: http
        
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "3Gi"
        
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        volumeMounts:
        - name: uploads
          mountPath: /app/public/uploads
      
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: uploads-pvc
---
# PVC for uploads
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uploads-pvc
  namespace: apricode-exchange
spec:
  accessModes:
    - ReadWriteMany  # Multi-pod access
  storageClassName: "fast-ssd"
  resources:
    requests:
      storage: 50Gi
```

---

### 7. Horizontal Pod Autoscaler (HPA)

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: apricode-app-hpa
  namespace: apricode-exchange
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: apricode-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min cooldown
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60  # 1 min cooldown
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

---

### 8. Ingress (Nginx)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: apricode-ingress
  namespace: apricode-exchange
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"  # For file uploads
    nginx.ingress.kubernetes.io/rate-limit: "100"  # Requests per minute
    nginx.ingress.kubernetes.io/limit-rps: "10"  # Requests per second
spec:
  tls:
  - hosts:
    - app.bitflow.biz
    secretName: apricode-tls
  rules:
  - host: app.bitflow.biz
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 3000
```

---

### 9. CronJobs

```yaml
# cronjobs.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-sessions
  namespace: apricode-exchange
spec:
  schedule: "0 * * * *"  # Every hour
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: your-registry/apricode-exchange:latest
            command: ["node"]
            args: ["-e", "fetch('http://app-service:3000/api/cron/cleanup-sessions', {method: 'POST'}).then(r => r.ok ? process.exit(0) : process.exit(1))"]
            envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: process-notifications
  namespace: apricode-exchange
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: process
            image: your-registry/apricode-exchange:latest
            command: ["node"]
            args: ["-e", "fetch('http://app-service:3000/api/cron/process-notifications', {method: 'POST'}).then(r => r.ok ? process.exit(0) : process.exit(1))"]
            envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          restartPolicy: OnFailure
```

---

## 💰 Стоимость (Месячная)

### Cloud Provider Comparison

#### Google Cloud Platform (GKE)
```
Cluster (Autopilot mode):
  - 3x e2-standard-4 nodes:         $240/month
  - 2x e2-highmem-2 nodes:          $200/month
  - Load Balancer:                  $20/month
  - Persistent Disks (500GB SSD):   $85/month
  - Network egress (100GB):         $12/month
  - GKE management fee:             $73/month
  ─────────────────────────────────────────
  TOTAL:                            $630/month
```

#### AWS (EKS)
```
Cluster:
  - EKS control plane:               $73/month
  - 3x t3.xlarge nodes:              $300/month
  - 2x r5.large nodes:               $240/month
  - Application Load Balancer:       $22/month
  - EBS volumes (500GB SSD):         $50/month
  - Network egress (100GB):          $9/month
  ─────────────────────────────────────────
  TOTAL:                             $694/month
```

#### DigitalOcean (DOKS)
```
Cluster:
  - DOKS control plane:              FREE
  - 3x 4GB/2vCPU droplets:           $144/month
  - 2x 8GB/4vCPU droplets:           $168/month
  - Load Balancer:                   $12/month
  - Block Storage (500GB):           $50/month
  ─────────────────────────────────────────
  TOTAL:                             $374/month
```

#### Hetzner Cloud (EU only) 🔥 Best Price
```
Cluster:
  - 3x CPX31 (4vCPU, 8GB):           $90/month
  - 2x CPX21 (3vCPU, 4GB):           $40/month
  - Load Balancer:                   $6/month
  - Volumes (500GB SSD):             $50/month
  ─────────────────────────────────────────
  TOTAL:                             $186/month
```

**Рекомендация:**
- **Dev/Staging:** Hetzner Cloud (~$100/month)
- **Production (Low traffic):** DigitalOcean (~$400/month)
- **Production (High traffic):** GCP или AWS (~$700/month)
- **Enterprise:** GCP/AWS (~$1500-2500/month)

---

## 📈 Мониторинг и Observability

### Prometheus + Grafana Stack

```yaml
# monitoring-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
```

### Install via Helm
```bash
# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi

# Install Loki (logs)
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=100Gi
```

### Grafana Dashboards
1. **Kubernetes Cluster Monitoring**
   - Node metrics (CPU, RAM, disk)
   - Pod status
   - Resource usage

2. **Application Metrics**
   - Request rate (req/sec)
   - Response time (p50, p95, p99)
   - Error rate
   - Active connections

3. **Database Metrics**
   - Query performance
   - Connection pool
   - Slow queries
   - Replication lag

4. **Business Metrics**
   - Orders created/hour
   - KYC verifications/hour
   - Active users
   - Revenue tracking

---

## 🚀 Deployment Workflow

### 1. Build Docker Image
```bash
# Build multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag your-registry/apricode-exchange:latest \
  --tag your-registry/apricode-exchange:v1.1.0 \
  --push \
  .
```

### 2. Deploy to Kubernetes
```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets (one-time)
kubectl apply -f k8s/secret.yaml

# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy infrastructure
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-statefulset.yaml

# Wait for DBs to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n apricode-exchange --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n apricode-exchange --timeout=300s

# Deploy application
kubectl apply -f k8s/app-deployment.yaml

# Apply HPA
kubectl apply -f k8s/hpa.yaml

# Apply Ingress
kubectl apply -f k8s/ingress.yaml

# Apply CronJobs
kubectl apply -f k8s/cronjobs.yaml
```

### 3. Verify Deployment
```bash
# Check pods
kubectl get pods -n apricode-exchange

# Check services
kubectl get svc -n apricode-exchange

# Check ingress
kubectl get ingress -n apricode-exchange

# View logs
kubectl logs -f deployment/apricode-app -n apricode-exchange

# Check HPA status
kubectl get hpa -n apricode-exchange
```

### 4. Database Migrations
```bash
# Run migrations manually (if init container failed)
kubectl exec -it deployment/apricode-app -n apricode-exchange -- npx prisma migrate deploy

# Check database connection
kubectl exec -it statefulset/postgres -n apricode-exchange -- psql -U postgres -d apricode
```

---

## 🔐 Security Best Practices

### 1. Network Policies
```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
  namespace: apricode-exchange
spec:
  podSelector:
    matchLabels:
      app: apricode-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - namespaceSelector: {}  # External APIs
    ports:
    - protocol: TCP
      port: 443
```

### 2. Pod Security Standards
```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - configMap
  - emptyDir
  - projected
  - secret
  - downwardAPI
  - persistentVolumeClaim
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  readOnlyRootFilesystem: false
```

### 3. Secrets Management
```bash
# Use external secrets manager (recommended)
# - AWS Secrets Manager + External Secrets Operator
# - Google Secret Manager
# - HashiCorp Vault

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

---

## 📊 Performance Tuning

### Database Connection Pooling
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  
  // Connection pooling
  connection_limit = 50
  pool_timeout = 10
}
```

### Redis Caching Strategy
```typescript
// src/lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Cache frequently accessed data
export async function getCachedRates(pair: string) {
  const cached = await redis.get(`rates:${pair}`);
  if (cached) return JSON.parse(cached);
  
  // Fetch from API
  const rates = await fetchRates(pair);
  
  // Cache for 5 minutes
  await redis.setex(`rates:${pair}`, 300, JSON.stringify(rates));
  return rates;
}
```

---

## 🔄 Backup & Disaster Recovery

### PostgreSQL Backup
```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: apricode-exchange
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              pg_dump -h postgres-service -U postgres -d apricode | gzip > /backups/backup_${TIMESTAMP}.sql.gz
              # Upload to S3/GCS
              aws s3 cp /backups/backup_${TIMESTAMP}.sql.gz s3://your-bucket/postgres/
              # Keep only last 30 days
              find /backups -name "*.sql.gz" -mtime +30 -delete
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: POSTGRES_PASSWORD
            volumeMounts:
            - name: backups
              mountPath: /backups
          volumes:
          - name: backups
            persistentVolumeClaim:
              claimName: backups-pvc
          restartPolicy: OnFailure
```

### Restore from Backup
```bash
# Download backup from S3
aws s3 cp s3://your-bucket/postgres/backup_20250126_020000.sql.gz /tmp/

# Restore to PostgreSQL
kubectl exec -it statefulset/postgres -n apricode-exchange -- bash
gunzip < /tmp/backup_20250126_020000.sql.gz | psql -U postgres -d apricode
```

---

## 📚 Recommended Tools

### CI/CD
- **GitHub Actions** - Automated builds and deployments
- **ArgoCD** - GitOps continuous deployment
- **Flux CD** - Alternative GitOps tool

### Monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Loki** - Log aggregation
- **Jaeger** - Distributed tracing

### Security
- **cert-manager** - Automatic SSL certificates
- **Falco** - Runtime security
- **Trivy** - Container vulnerability scanning
- **OPA Gatekeeper** - Policy enforcement

### Debugging
- **k9s** - Terminal UI for Kubernetes
- **kubectl-debug** - Interactive debugging
- **stern** - Multi-pod log tailing

---

## 🎯 Migration Checklist

### Pre-deployment
- [ ] Setup Kubernetes cluster
- [ ] Configure kubectl access
- [ ] Install Helm
- [ ] Setup container registry (Docker Hub/GCR/ECR)
- [ ] Create secrets
- [ ] Configure DNS (CloudFlare/Route53)
- [ ] Setup SSL certificates

### Deployment
- [ ] Build Docker image
- [ ] Push to registry
- [ ] Apply Kubernetes manifests
- [ ] Run database migrations
- [ ] Verify all pods running
- [ ] Check ingress/load balancer
- [ ] Test application access

### Post-deployment
- [ ] Setup monitoring dashboards
- [ ] Configure alerting rules
- [ ] Setup backup cron jobs
- [ ] Test disaster recovery
- [ ] Configure autoscaling
- [ ] Performance testing
- [ ] Security audit

---

## 📞 Support & Maintenance

### Daily Tasks
- Monitor logs and metrics
- Check pod health
- Review error rates

### Weekly Tasks
- Review resource usage
- Check backup status
- Update dependencies (if needed)

### Monthly Tasks
- Security patches
- Performance optimization
- Cost analysis
- Disaster recovery drill

---

## 🚀 Next Steps

1. **Выбрать cloud provider** (Hetzner/DigitalOcean/GCP)
2. **Создать Kubernetes кластер**
3. **Настроить CI/CD pipeline** (GitHub Actions)
4. **Deploy в staging** для тестирования
5. **Запустить load testing** (k6, Apache Bench)
6. **Migrate production** с Vercel на K8s
7. **Setup monitoring** и alerts

---

**Версия документа:** 1.0  
**Дата:** 2025-01-26  
**Автор:** Apricode DevOps Team

