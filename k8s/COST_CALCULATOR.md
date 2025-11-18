# 💰 Kubernetes Cost Calculator

## 📊 Resource Requirements Summary

### Minimum Production (3 nodes)
- **Total CPU:** 7.35 cores (requests) / 18.5 cores (limits)
- **Total RAM:** 15.5 GB (requests) / 36 GB (limits)
- **Total Storage:** 360 GB SSD
- **Node Count:** 3-5 nodes

---

## ☁️ Cloud Provider Pricing

### 🔵 Google Cloud Platform (GKE)

#### Option 1: Standard Cluster (Manual)
```yaml
Node Pool: Application + Database
  - Type: e2-standard-4 (4 vCPU, 16 GB)
  - Count: 3 nodes
  - Price: $120/month per node
  
Total Compute: $360/month
Load Balancer: $20/month
Persistent Disks: $85/month (500 GB SSD @ $0.17/GB)
Network Egress: $12/month (100 GB @ $0.12/GB)
GKE Management: $73/month ($0.10/hour)
───────────────────────
TOTAL: $550/month
```

#### Option 2: Autopilot Cluster (Managed)
```yaml
GKE Autopilot automatically manages nodes
  - Pay only for pods CPU/RAM usage
  - No node management required
  - Automatic scaling
  
Estimated cost based on workload:
  - Application pods: $300/month
  - Database pods: $200/month
  - Network/LB: $30/month
  - Management: $73/month
───────────────────────
TOTAL: $603/month

✅ Recommended for beginners
```

**GCP Free Tier:**
- $300 credit for 90 days (new accounts)
- Always free: 1x e2-micro VM (not enough for production)

---

### 🟠 AWS (EKS)

#### Option 1: Standard Cluster
```yaml
EKS Control Plane: $73/month ($0.10/hour)

Node Group: Application
  - Type: t3.xlarge (4 vCPU, 16 GB)
  - Count: 3 nodes
  - Price: $100/month per node
  - Total: $300/month

Node Group: Database
  - Type: r5.large (2 vCPU, 16 GB)
  - Count: 2 nodes
  - Price: $120/month per node
  - Total: $240/month

Application Load Balancer: $22/month
EBS Volumes (500 GB SSD): $50/month (gp3 @ $0.10/GB)
Network Transfer: $9/month (100 GB @ $0.09/GB)
───────────────────────
TOTAL: $694/month
```

#### Option 2: Fargate (Serverless)
```yaml
AWS Fargate - Pay per pod resources
  - No EC2 instances to manage
  - Pay only for vCPU and memory usage
  
Estimated cost:
  - vCPU: $0.04048/hour per vCPU
  - Memory: $0.004445/hour per GB
  - Based on 10 vCPU + 20 GB average usage
  
Monthly cost: ~$500-700/month
EKS Control Plane: $73/month
ALB: $22/month
Storage: $50/month
───────────────────────
TOTAL: $645-845/month

✅ Good for unpredictable workloads
```

**AWS Free Tier:**
- 750 hours/month t2.micro or t3.micro (12 months, new accounts)
- Not enough for production EKS

---

### 🔷 DigitalOcean (DOKS)

#### Standard Cluster
```yaml
DOKS Control Plane: FREE ✅

Node Pool: Mixed workload
  - Type: 4 GB / 2 vCPU droplet
  - Count: 3 nodes
  - Price: $48/month per node
  - Total: $144/month

Node Pool: Database
  - Type: 8 GB / 4 vCPU droplet
  - Count: 2 nodes
  - Price: $84/month per node
  - Total: $168/month

Load Balancer: $12/month
Block Storage (500 GB SSD): $50/month ($0.10/GB)
Bandwidth: Included (1 TB free)
───────────────────────
TOTAL: $374/month

✅ Best price/performance ratio
✅ Simple pricing, no hidden costs
✅ Free control plane
```

**DigitalOcean Free Tier:**
- $200 credit for 60 days (new accounts)

---

### 🟢 Hetzner Cloud (EU Only)

#### Standard Cluster
```yaml
No managed Kubernetes - use Rancher/k3s

Node Pool: Application
  - Type: CPX31 (4 vCPU, 8 GB)
  - Count: 3 nodes
  - Price: $30/month per node
  - Total: $90/month

Node Pool: Database
  - Type: CPX21 (3 vCPU, 4 GB)
  - Count: 2 nodes
  - Price: $20/month per node
  - Total: $40/month

Load Balancer: $6/month
Volumes (500 GB SSD): $50/month ($0.10/GB)
Traffic: Included (20 TB free!)
───────────────────────
TOTAL: $186/month

✅ Best price for EU customers
✅ Excellent performance
❌ No managed Kubernetes (need to setup k3s/k0s)
❌ Only EU regions (Germany, Finland)
```

**Hetzner Free Tier:**
- €20 credit (new accounts)

---

### 🔴 Azure (AKS)

#### Standard Cluster
```yaml
AKS Control Plane: FREE for production ✅

Node Pool: Application
  - Type: Standard_D2s_v3 (2 vCPU, 8 GB)
  - Count: 4 nodes
  - Price: $70/month per node
  - Total: $280/month

Node Pool: Database
  - Type: Standard_E2s_v3 (2 vCPU, 16 GB)
  - Count: 2 nodes
  - Price: $120/month per node
  - Total: $240/month

Application Gateway: $25/month
Managed Disks (500 GB SSD): $75/month (Premium @ $0.15/GB)
Bandwidth: $9/month (100 GB @ $0.087/GB)
───────────────────────
TOTAL: $629/month
```

**Azure Free Tier:**
- $200 credit for 30 days (new accounts)
- 12 months free services (limited VM sizes)

---

## 📊 Cost Comparison Table

| Provider | Monthly Cost | Setup Difficulty | Support | Best For |
|----------|--------------|------------------|---------|----------|
| **Hetzner Cloud** | $186 | ⭐⭐⭐ (Manual K8s) | Community | EU customers, budget |
| **DigitalOcean** | $374 | ⭐ (Easy) | Good | Startups, simplicity |
| **GCP (Autopilot)** | $603 | ⭐ (Auto-managed) | Excellent | Beginners |
| **Azure (AKS)** | $629 | ⭐⭐ (Moderate) | Good | Microsoft ecosystem |
| **AWS (EKS)** | $694 | ⭐⭐ (Moderate) | Excellent | Enterprises, AWS users |

---

## 🎯 Recommended Configurations

### 1. Startup (< 1000 users)
**Provider:** DigitalOcean  
**Cost:** ~$400/month  
**Setup:**
- 3x 4GB droplets (app)
- 2x 8GB droplets (db)
- 1x Load Balancer
- 500 GB storage

**Why:** Simple pricing, free control plane, easy to manage

---

### 2. Growing Business (1000-5000 users)
**Provider:** GCP Autopilot  
**Cost:** ~$600/month  
**Setup:**
- Autopilot cluster (auto-scaling)
- Cloud SQL for PostgreSQL (managed)
- Cloud Memorystore for Redis (managed)
- Cloud CDN

**Why:** Auto-scaling, managed services, less DevOps overhead

---

### 3. Enterprise (5000+ users)
**Provider:** AWS EKS or GCP GKE  
**Cost:** ~$1500-2500/month  
**Setup:**
- Multi-zone cluster (HA)
- Auto-scaling (3-20 nodes)
- Managed databases (RDS/Cloud SQL)
- CDN (CloudFront/Cloud CDN)
- Monitoring stack (Datadog/New Relic)

**Why:** High availability, compliance, enterprise support

---

### 4. EU-Only, Budget-Conscious
**Provider:** Hetzner Cloud  
**Cost:** ~$200/month  
**Setup:**
- k3s (lightweight K8s)
- 3x CPX31 + 2x CPX21
- Manual setup required

**Why:** Best price, excellent EU performance, GDPR-compliant

---

## 💡 Cost Optimization Tips

### 1. Use Spot/Preemptible Instances
- **GCP:** Preemptible VMs (up to 80% discount)
- **AWS:** Spot Instances (up to 90% discount)
- **Azure:** Spot VMs (up to 90% discount)

**Savings:** 60-80% on compute costs  
**Trade-off:** Can be terminated with 30s notice

**Best for:** Non-critical workloads, batch jobs, dev/staging

---

### 2. Reserved Instances
- **Commitment:** 1 or 3 years
- **Discount:** 30-70% off on-demand pricing
- **Providers:** All major clouds

**Savings:** 30-70% on compute costs  
**Trade-off:** Long-term commitment

---

### 3. Right-Sizing
- Monitor actual resource usage
- Downsize over-provisioned pods
- Use HPA for dynamic scaling
- Remove unused PVCs

**Savings:** 20-40% on average

---

### 4. Storage Optimization
- Use standard disks for non-critical data
- Enable compression for backups
- Set up lifecycle policies (delete old backups)
- Use object storage (S3/GCS) instead of block storage

**Savings:** 30-50% on storage costs

---

### 5. Network Cost Reduction
- Use CDN for static assets
- Enable gzip/brotli compression
- Keep traffic within same region
- Use private IPs for inter-pod communication

**Savings:** 40-60% on egress costs

---

## 📈 Cost Scaling Projection

### Year 1 (MVP - 1000 users)
- **Infrastructure:** $400/month
- **Monitoring:** $50/month (Prometheus/Grafana)
- **Backups:** $20/month
- **SSL/Domain:** $10/month
- **Total:** $480/month = **$5,760/year**

### Year 2 (Growth - 5000 users)
- **Infrastructure:** $800/month
- **Monitoring:** $200/month (Datadog)
- **Backups:** $50/month
- **CDN:** $100/month
- **Total:** $1,150/month = **$13,800/year**

### Year 3 (Scale - 20,000 users)
- **Infrastructure:** $2,000/month
- **Monitoring:** $500/month
- **Backups:** $150/month
- **CDN:** $300/month
- **Support:** $500/month
- **Total:** $3,450/month = **$41,400/year**

---

## 🆓 Free Tier Opportunities

### Development/Staging
Use free tiers for non-production:

1. **Railway.app:** $5 free/month (hobby plan)
2. **Render.com:** Free for small apps
3. **Fly.io:** Free 3 VMs (256 MB each)
4. **Oracle Cloud:** Always free (2x AMD + 4x ARM VMs)

**Savings:** $200-500/month for dev/staging

---

## 🎓 Summary

**Best for MVP/Startup:**
- DigitalOcean DOKS: $374/month
- Simple, predictable pricing
- Easy to manage

**Best for Growth:**
- GCP Autopilot: $600/month
- Auto-scaling
- Managed infrastructure

**Best for EU/Budget:**
- Hetzner Cloud: $186/month
- Excellent performance
- Manual setup required

**Best for Enterprise:**
- AWS EKS: $1500-2500/month
- Full ecosystem
- Enterprise support

---

**Last Updated:** 2025-01-26  
**Currency:** USD  
**Prices are estimates and may vary by region and usage**

