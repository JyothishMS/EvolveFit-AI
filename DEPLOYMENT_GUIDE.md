# 🚀 EvolveFit 4-Layer Architecture - Deployment Guide

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Redis CLI (optional, for debugging)

### 1️⃣ Install Dependencies
```bash
npm install redis bullmq ioredis

# Updated dependencies needed:
npm install --save-dev @types/bull
```

### 2️⃣ Start Development with All Layers
```bash
# Option A: Local with Redis Docker
docker run -d -p 6379:6379 redis:7-alpine
npm run dev

# Option B: Full Docker Compose (All 4 layers)
docker-compose up -d

# Option C: PM2 Cluster Mode (Multiple instances)
npm run build
pm2 start ecosystem.config.js
pm2 monit
```

### 3️⃣ Verify All Layers
```bash
# Health check
curl http://localhost:3000/api/health

# Metrics
curl http://localhost:3000/api/metrics

# Redis connection
redis-cli ping
# Response: PONG
```

---

## 📦 Package.json Updates

Add these to your `package.json`:

```json
{
  "dependencies": {
    "redis": "^4.6.0",
    "bullmq": "^4.0.0",
    "ioredis": "^5.3.0"
  },
  "devDependencies": {
    "@types/bull": "^3.15.0"
  },
  "scripts": {
    "dev": "tsx server-optimized.ts",
    "build": "vite build && tsc server-optimized.ts --outDir dist",
    "start": "node dist/server.js",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:scale": "docker-compose up -d --scale api=5",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop ecosystem.config.js",
    "pm2:monit": "pm2 monit"
  }
}
```

---

## 🐳 Docker Deployment

### Single Command (All Layers)
```bash
# Build and start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Scale to 5 instances
docker-compose up -d --scale api=5

# Stop everything
docker-compose down
```

### Manual Steps
```bash
# 1. Build image
docker build -t evolvefit:latest .

# 2. Start Redis
docker run -d --name redis-evolvefit -p 6379:6379 redis:7-alpine

# 3. Start API instances
docker run -d --name api-1 -p 3001:3000 --link redis-evolvefit:redis -e REDIS_HOST=redis evolvefit:latest
docker run -d --name api-2 -p 3002:3000 --link redis-evolvefit:redis -e REDIS_HOST=redis evolvefit:latest
docker run -d --name api-3 -p 3003:3000 --link redis-evolvefit:redis -e REDIS_HOST=redis evolvefit:latest

# 4. Start Nginx
docker run -d --name nginx -p 80:80 -v $(pwd)/docker/nginx.conf:/etc/nginx/nginx.conf:ro --link api-1:api-1 --link api-2:api-2 --link api-3:api-3 nginx:alpine
```

---

## 🌐 Production Deployment (Vercel)

### Already Configured
Your `vercel.json` includes:
- Serverless functions for each API endpoint
- Automatic scaling
- Global edge network
- CDN integration

### Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod

# View logs
vercel logs
```

---

## 🔧 PM2 Cluster Mode (Local/VPS)

### Ecosystem Config
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'evolvefit-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/error.log',
      out_file: 'logs/output.log',
      merge_logs: true,
      max_memory_restart: '500M',
    },
  ],
};
```

### Commands
```bash
# Start with all CPU cores
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Scale dynamically
pm2 scale api +2
pm2 scale api 5

# Restart all instances
pm2 restart all

# Delete and restart
pm2 restart api
```

---

## ☁️ Kubernetes (Cloud Scale)

### Deploy to Kubernetes
```bash
# Apply deployment
kubectl apply -f kubernetes.yaml

# Check status
kubectl get pods
kubectl get svc

# View logs
kubectl logs -f deployment/evolvefit-api

# Scale manually
kubectl scale deployment evolvefit-api --replicas=5

# Auto-scaling is enabled (2-10 replicas based on CPU/Memory)
```

---

## 📊 Monitoring & Troubleshooting

### Redis Connection
```bash
# Check if running
redis-cli ping
# Response: PONG

# Check memory usage
redis-cli info memory

# Clear cache
redis-cli flushall

# Monitor in real-time
redis-cli monitor
```

### Check Logs
```bash
# Docker
docker-compose logs -f api-1

# PM2
pm2 logs evolvefit-api

# Kubernetes
kubectl logs -f deployment/evolvefit-api
```

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run load test
ab -n 10000 -c 100 http://localhost/api/health

# Results show performance before/after optimization
```

---

## 📈 Performance Targets

### Metrics to Monitor
- **Response Time**: Target <200ms (was 500-2000ms)
- **Database Hits**: Target 20k/day (was 100k/day)
- **CPU Usage**: Target 30-40% (was 80-90%)
- **Concurrent Users**: Target 1000+ (was 100)
- **Uptime**: Target 99.9%

### Health Check Dashboard
```bash
# Check all layers status
curl http://localhost/api/health
# Response: { "status": "healthy", "uptime": 123.45, ... }

curl http://localhost/api/metrics
# Response: { "requestCount": 1234, "errorRate": "0.5%", ... }
```

---

## 🔐 Security Considerations

1. **Redis**: Use password in production
   ```bash
   # Set password in docker-compose.yml
   REDIS_PASSWORD=strong_password_here
   redis-cli -a password ping
   ```

2. **Database**: Enable Supabase Row Level Security
   - Implement RLS policies
   - Validate user ownership

3. **Rate Limiting**: Nginx rate limits configured
   - 50 req/s general
   - 100 req/s API
   - 10 req/s strict (metrics)

4. **CORS**: Configure as needed
   ```typescript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(','),
   }));
   ```

---

## 💰 Cost Breakdown

### Monthly Costs (1k-10k users)
- **Redis**: $5-50 (self-hosted free)
- **Cloudflare**: $0-200 (free tier → paid)
- **Server/VPS**: $50-200 (3 instances)
- **Database**: $100-500 (Supabase)
- **Storage**: $10-50 (images/videos)
- **Total**: ~$150-1000/month

### Cost Reduction
- **Before**: Expensive server infrastructure
- **After**: Distributed, efficient architecture
- **Savings**: 40-50% reduction with same capacity

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Redis connection failed | Check if Redis is running: `redis-cli ping` |
| API timeout | Increase queue timeout in queue-system.ts |
| High memory | Reduce CACHE_TTL or Redis maxmemory |
| Load balancer not working | Check nginx.conf syntax: `nginx -t` |
| Docker build fails | Clear cache: `docker system prune -a` |
| Jobs not processing | Check BullMQ workers are running |

---

## 📚 Next Steps

1. ✅ Implement all 4 layers
2. ✅ Set up monitoring dashboard
3. ✅ Perform load testing
4. ✅ Deploy to staging
5. ✅ Gradual rollout to production
6. ✅ Monitor and optimize

---

## 📞 Support

For issues or questions:
- Check [OPTIMIZATION_ARCHITECTURE.md](./OPTIMIZATION_ARCHITECTURE.md)
- Review [server-optimized.ts](./server-optimized.ts)
- Debug with: `docker-compose logs -f`

