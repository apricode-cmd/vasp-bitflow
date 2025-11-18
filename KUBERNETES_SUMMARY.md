# ☸️ Kubernetes Infrastructure - Quick Summary

## 📦 Что создано

### 1. Детальная документация
- **`KUBERNETES_INFRASTRUCTURE.md`** - Полный план инфраструктуры (75 KB)
  - Анализ проекта
  - Архитектура K8s
  - Расчет ресурсов
  - Манифесты с объяснениями
  - Мониторинг и безопасность
  - Backup и восстановление

### 2. Готовые манифесты (`k8s/base/`)
```
k8s/base/
├── namespace.yaml          # Namespace для изоляции
├── configmap.yaml          # Настройки приложения
├── secret.yaml.template    # Template для секретов (НЕ КОММИТИТЬ!)
├── postgres.yaml           # PostgreSQL StatefulSet + конфигурация
├── redis.yaml              # Redis StatefulSet + конфигурация
├── app-deployment.yaml     # Next.js приложение + PVC
├── hpa.yaml                # Автомасштабирование (3-10 реплик)
├── ingress.yaml            # Nginx Ingress + SSL (Let's Encrypt)
└── cronjobs.yaml           # Cron задачи + backup
```

### 3. Вспомогательные файлы
- **`k8s/README.md`** - Инструкции по развертыванию
- **`k8s/deploy.sh`** - Автоматический скрипт деплоя
- **`k8s/.gitignore`** - Защита от коммита секретов
- **`COST_CALCULATOR.md`** - Детальный расчет стоимости

---

## 💰 Стоимость (ежемесячно)

| Провайдер | Стоимость | Сложность | Рекомендация |
|-----------|-----------|-----------|--------------|
| **Hetzner Cloud** 🔥 | **$186/month** | ⭐⭐⭐ Manual | EU only, лучшая цена |
| **DigitalOcean** ✅ | **$374/month** | ⭐ Easy | Для стартапов |
| **GCP Autopilot** | **$603/month** | ⭐ Auto | Для новичков |
| **Azure AKS** | **$629/month** | ⭐⭐ Medium | Microsoft stack |
| **AWS EKS** | **$694/month** | ⭐⭐ Medium | Enterprise |

### 💡 Рекомендация для вас:

#### Вариант 1: Production (Простота) - **DigitalOcean**
- **Стоимость:** $374/month
- **Плюсы:**
  - ✅ Бесплатный control plane
  - ✅ Простая настройка (1-click DOKS)
  - ✅ Фиксированная цена
  - ✅ Хорошая документация
  - ✅ Подходит для до 5000 пользователей
- **Минусы:**
  - ⚠️ Меньше функций чем AWS/GCP
  - ⚠️ Ограниченные регионы

#### Вариант 2: Production (Экономия) - **Hetzner Cloud**
- **Стоимость:** $186/month (50% дешевле!)
- **Плюсы:**
  - ✅ Лучшая цена/производительность
  - ✅ Отличное железо (AMD EPYC + NVMe)
  - ✅ Безлимитный трафик (20 TB free)
  - ✅ GDPR-compliant (EU)
- **Минусы:**
  - ⚠️ Нет managed Kubernetes (нужно ставить k3s/k0s)
  - ⚠️ Только EU регионы (Germany, Finland)
  - ⚠️ Требует DevOps знаний

---

## 📊 Расчет ресурсов

### Production Environment (Medium Load)

| Component | Replicas | CPU | RAM | Storage |
|-----------|----------|-----|-----|---------|
| Next.js App | 3-10 (HPA) | 1.5-20 cores | 3-30 GB | - |
| PostgreSQL Primary | 1 | 2-4 cores | 4-8 GB | 100 GB |
| PostgreSQL Replica | 1 | 1-2 cores | 2-4 GB | 100 GB |
| Redis | 1 | 0.25-1 core | 512 MB-2 GB | 10 GB |
| Nginx Ingress | 2 | 0.4-2 cores | 512 MB-2 GB | - |
| Monitoring | 3 | 1.2-3.5 cores | 4-11 GB | 150 GB |
| **TOTAL** | - | **7-19 cores** | **16-36 GB** | **360 GB** |

### Для вашей текущей нагрузки (оценка):
- **Users:** ~500-1000 активных
- **Orders:** ~100-200/день
- **KYC:** ~50-100/день
- **Recommended:** 3x Application nodes + 2x Database nodes = **5 nodes**

---

## 🚀 Быстрый старт

### 1. Выбрать провайдера и создать кластер

#### DigitalOcean (рекомендуется)
```bash
# 1. Зарегистрироваться на DigitalOcean
# 2. Получить $200 кредит (новый аккаунт)
# 3. Создать Kubernetes cluster:
#    - Region: Frankfurt (EU) или NYC (USA)
#    - Version: Latest stable
#    - Node pool 1: 3x 4GB/2vCPU ($48/node)
#    - Node pool 2: 2x 8GB/4vCPU ($84/node)
#    - Total: $374/month

# 4. Скачать kubeconfig
doctl kubernetes cluster kubeconfig save <cluster-name>

# 5. Проверить подключение
kubectl get nodes
```

#### GCP GKE Autopilot (автоматизированный)
```bash
# 1. Установить gcloud CLI
# 2. Создать проект в GCP
# 3. Включить GKE API

gcloud container clusters create-auto apricode-exchange \
  --region=europe-west1 \
  --project=your-project-id

# 4. Получить credentials
gcloud container clusters get-credentials apricode-exchange \
  --region=europe-west1
```

---

### 2. Подготовить Docker image

```bash
cd "/Users/bogdankononenko/Работа/Development/Project/crm vasp"

# Создать Docker Hub репозиторий (или GCR/ECR)
# docker login

# Build and push image
docker build -t your-dockerhub-username/apricode-exchange:v1.1.0 .
docker push your-dockerhub-username/apricode-exchange:v1.1.0

# Также push latest tag
docker tag your-dockerhub-username/apricode-exchange:v1.1.0 \
           your-dockerhub-username/apricode-exchange:latest
docker push your-dockerhub-username/apricode-exchange:latest
```

**Важно:** Обновить `image:` в `k8s/base/app-deployment.yaml`
```yaml
# Заменить:
image: your-registry/apricode-exchange:latest
# На:
image: your-dockerhub-username/apricode-exchange:latest
```

---

### 3. Настроить secrets

```bash
cd k8s/base

# 1. Создать secret.yaml из template
cp secret.yaml.template secret.yaml

# 2. Сгенерировать AUTH_SECRET
openssl rand -base64 32

# 3. Отредактировать secret.yaml
nano secret.yaml  # или code secret.yaml

# Заменить все CHANGE_ME на реальные значения:
# - POSTGRES_PASSWORD (придумать сложный)
# - AUTH_SECRET (из openssl выше)
# - KYCAID_API_KEY (из https://kycaid.com)
# - RESEND_API_KEY (из https://resend.com)
```

**Пример готового secret.yaml:**
```yaml
stringData:
  DATABASE_URL: "postgresql://postgres:MySecureP@ssw0rd!@postgres-service:5432/apricode"
  POSTGRES_PASSWORD: "MySecureP@ssw0rd!"
  AUTH_SECRET: "Xy7z8/ABcdefgh123456789ABCDEFGHIJKLMNOPqrstuv=="
  KYCAID_API_KEY: "kycaid_live_abc123..."
  RESEND_API_KEY: "re_abc123def456..."
  EMAIL_FROM: "noreply@bitflow.biz"
```

---

### 4. Обновить настройки

```bash
# Отредактировать configmap.yaml
nano k8s/base/configmap.yaml

# Изменить:
data:
  NEXT_PUBLIC_APP_URL: "https://your-domain.com"  # Ваш домен
  NEXT_PUBLIC_APP_NAME: "Your Exchange Name"      # Ваше название
```

```bash
# Отредактировать ingress.yaml
nano k8s/base/ingress.yaml

# Изменить:
spec:
  tls:
  - hosts:
    - your-domain.com  # Ваш домен
  rules:
  - host: your-domain.com  # Ваш домен
```

---

### 5. Deploy! 🚀

```bash
cd k8s

# Опция A: Автоматический деплой (рекомендуется)
./deploy.sh

# Опция B: Ручной деплой
kubectl apply -f base/namespace.yaml
kubectl apply -f base/configmap.yaml
kubectl apply -f base/secret.yaml
kubectl apply -f base/postgres.yaml
kubectl apply -f base/redis.yaml

# Подождать готовности БД
kubectl wait --for=condition=ready pod -l app=postgres -n apricode-exchange --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n apricode-exchange --timeout=300s

# Deploy приложения
kubectl apply -f base/app-deployment.yaml
kubectl apply -f base/hpa.yaml
kubectl apply -f base/ingress.yaml
kubectl apply -f base/cronjobs.yaml
```

---

### 6. Проверить статус

```bash
# Pods
kubectl get pods -n apricode-exchange

# Services
kubectl get svc -n apricode-exchange

# Ingress (получить IP)
kubectl get ingress -n apricode-exchange

# Logs
kubectl logs -f deployment/apricode-app -n apricode-exchange

# HPA (autoscaling)
kubectl get hpa -n apricode-exchange
```

**Ожидаемый вывод:**
```
NAME                      READY   STATUS    RESTARTS   AGE
apricode-app-xxx-yyy      1/1     Running   0          2m
apricode-app-xxx-zzz      1/1     Running   0          2m
apricode-app-xxx-aaa      1/1     Running   0          2m
postgres-0                1/1     Running   0          5m
redis-0                   1/1     Running   0          5m
```

---

### 7. Настроить DNS

```bash
# Получить IP адрес Load Balancer
kubectl get ingress -n apricode-exchange

# Output:
# NAME               CLASS   HOSTS              ADDRESS          PORTS     AGE
# apricode-ingress   nginx   app.bitflow.biz    123.45.67.89     80, 443   5m
```

**В CloudFlare/Route53/другом DNS:**
```
Type: A
Name: app (или @)
Value: 123.45.67.89 (IP из kubectl выше)
TTL: Auto
Proxy: Off (важно для Let's Encrypt)
```

**Проверка DNS:**
```bash
nslookup app.bitflow.biz
# Должен вернуть IP 123.45.67.89
```

---

### 8. Ждать SSL сертификат

```bash
# cert-manager автоматически получит SSL от Let's Encrypt
# Это занимает 2-5 минут

# Проверить статус
kubectl get certificate -n apricode-exchange

# Проверить logs cert-manager (если проблемы)
kubectl logs -n cert-manager deploy/cert-manager
```

**Когда готово:**
```bash
# Certificate будет в статусе Ready
kubectl describe certificate apricode-tls -n apricode-exchange

# Проверить доступность
curl -I https://app.bitflow.biz
# Должен вернуть 200 OK
```

---

## 🔍 Мониторинг

### Установить мониторинг stack (опционально)

```bash
# Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Получить Grafana password
kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Port-forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Открыть http://localhost:3000
# Login: admin / <password из команды выше>
```

### Полезные команды мониторинга

```bash
# CPU/Memory usage всех pods
kubectl top pods -n apricode-exchange

# CPU/Memory usage nodes
kubectl top nodes

# Следить за logs в реальном времени
kubectl logs -f deployment/apricode-app -n apricode-exchange

# Logs с нескольких pods одновременно (stern)
brew install stern  # MacOS
stern apricode-app -n apricode-exchange

# Зайти внутрь pod (debugging)
kubectl exec -it deployment/apricode-app -n apricode-exchange -- sh

# Port-forward приложения локально (для debug)
kubectl port-forward svc/app-service 3000:3000 -n apricode-exchange
# Открыть http://localhost:3000
```

---

## 🔐 Безопасность

### После деплоя обязательно:

1. **Проверить secrets не в git:**
   ```bash
   git status
   # Не должно быть k8s/base/secret.yaml
   ```

2. **Обновить пароли production:**
   ```bash
   # Generate secure password
   openssl rand -base64 32
   
   # Update secret
   kubectl edit secret app-secrets -n apricode-exchange
   ```

3. **Настроить backup:**
   ```bash
   # Backup cronjob уже создан, проверить
   kubectl get cronjob -n apricode-exchange
   
   # Первый backup вручную
   kubectl create job --from=cronjob/postgres-backup manual-backup-1 -n apricode-exchange
   ```

4. **Ограничить доступ к кластеру:**
   ```bash
   # Создать separate kubeconfig для каждого админа
   # Настроить RBAC (Role-Based Access Control)
   ```

5. **Включить audit logging:**
   ```bash
   # В GCP/AWS/Azure включить audit logs через консоль
   ```

---

## 📈 Масштабирование

### Увеличить ресурсы приложения

```bash
# Отредактировать deployment
kubectl edit deployment apricode-app -n apricode-exchange

# Изменить:
resources:
  requests:
    cpu: "1000m"     # было 500m
    memory: "2Gi"    # было 1Gi
  limits:
    cpu: "4000m"     # было 2000m
    memory: "6Gi"    # было 3Gi
```

### Увеличить replicas вручную

```bash
kubectl scale deployment apricode-app --replicas=5 -n apricode-exchange
```

### Настроить агрессивный HPA

```bash
kubectl edit hpa apricode-app-hpa -n apricode-exchange

# Изменить:
minReplicas: 5   # было 3
maxReplicas: 20  # было 10
```

---

## 🆘 Troubleshooting

### Pods не запускаются
```bash
# Проверить events
kubectl get events -n apricode-exchange --sort-by='.lastTimestamp'

# Детали pod
kubectl describe pod <pod-name> -n apricode-exchange

# Логи
kubectl logs <pod-name> -n apricode-exchange

# Логи init container (migrations)
kubectl logs <pod-name> -c migrate -n apricode-exchange
```

### Database connection error
```bash
# Проверить PostgreSQL
kubectl exec -it statefulset/postgres -n apricode-exchange -- psql -U postgres -d apricode

# Если не подключается, проверить secret
kubectl get secret app-secrets -n apricode-exchange -o yaml

# Проверить service
kubectl get svc postgres-service -n apricode-exchange
```

### Ingress не работает (SSL error)
```bash
# Проверить cert-manager
kubectl get certificate -n apricode-exchange
kubectl describe certificate apricode-tls -n apricode-exchange

# Проверить challenge (Let's Encrypt validation)
kubectl get challenge -n apricode-exchange

# Logs cert-manager
kubectl logs -n cert-manager deployment/cert-manager

# Удалить и пересоздать certificate (если stuck)
kubectl delete certificate apricode-tls -n apricode-exchange
kubectl delete secret apricode-tls -n apricode-exchange
kubectl delete ingress apricode-ingress -n apricode-exchange
kubectl apply -f base/ingress.yaml
```

### Out of memory (OOMKilled)
```bash
# Проверить usage
kubectl top pods -n apricode-exchange

# Увеличить memory limits
kubectl edit deployment apricode-app -n apricode-exchange
# memory: "4Gi" -> "6Gi"
```

---

## 📚 Полезные ресурсы

### Документация
- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [DigitalOcean Kubernetes](https://docs.digitalocean.com/products/kubernetes/)
- [GCP GKE](https://cloud.google.com/kubernetes-engine/docs)

### Tools
- **k9s** - Terminal UI для K8s: `brew install k9s`
- **stern** - Multi-pod logs: `brew install stern`
- **kubectx** - Switch contexts: `brew install kubectx`
- **lens** - GUI для K8s: https://k8slens.dev

### Мониторинг
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Datadog K8s](https://www.datadoghq.com/product/container-monitoring/)

---

## ✅ Checklist развертывания

- [ ] Выбран cloud provider
- [ ] Создан Kubernetes кластер
- [ ] Установлен kubectl
- [ ] Настроен kubeconfig
- [ ] Docker image собран и залит в registry
- [ ] Обновлен image в app-deployment.yaml
- [ ] Создан secret.yaml из template
- [ ] Все CHANGE_ME заменены на реальные значения
- [ ] Обновлен домен в configmap.yaml
- [ ] Обновлен домен в ingress.yaml
- [ ] Запущен ./deploy.sh (или manual deploy)
- [ ] Все pods в статусе Running
- [ ] Получен IP Load Balancer
- [ ] Настроен DNS A-record
- [ ] SSL сертификат получен (cert-manager)
- [ ] Приложение доступно по HTTPS
- [ ] Мониторинг настроен (опционально)
- [ ] Backup настроен и протестирован
- [ ] Документация обновлена для команды

---

## 🎯 Следующие шаги

### После успешного деплоя:

1. **Настроить CI/CD:**
   - GitHub Actions для auto-deploy
   - ArgoCD для GitOps
   - Или Flux CD

2. **Улучшить мониторинг:**
   - Datadog или New Relic
   - Custom metrics для business logic
   - Alerts в Slack/Telegram

3. **Disaster Recovery:**
   - Automated backups каждый день
   - Test restore procedure
   - Multi-region setup (если нужна HA)

4. **Оптимизация стоимости:**
   - Spot instances для non-critical workloads
   - Right-sizing pods (downsize если overprovisioned)
   - Storage lifecycle policies

5. **Security hardening:**
   - Network policies
   - Pod security policies
   - Secrets management (HashiCorp Vault)
   - Regular security scans (Trivy, Falco)

---

**Готово! 🎉**

Если возникнут вопросы - пиши в Telegram/Slack. Удачи с деплоем! 🚀

**Создано:** 2025-01-26  
**Версия:** 1.0

