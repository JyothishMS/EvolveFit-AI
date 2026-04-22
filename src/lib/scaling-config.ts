/**
 * Horizontal Scaling Configuration
 * Load balancing across multiple server instances
 * Supports: Docker, Kubernetes, PM2, and Vercel
 */

export interface ScalingConfig {
  instances: number;
  maxInstances: number;
  cpuThreshold: number;
  memoryThreshold: number;
  loadBalancer: 'nginx' | 'haproxy' | 'vercel' | 'kubernetes';
}

/**
 * PM2 Configuration for local/server scaling
 * Each instance handles multiple requests in parallel
 */
export const pm2Config = {
  apps: [
    {
      name: 'evolvefit-api',
      script: './dist/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/error.log',
      out_file: 'logs/output.log',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
    },
  ],
};

/**
 * Docker Compose for local horizontal scaling
 */
export const dockerComposeConfig = `version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api-1
      - api-2
      - api-3
    networks:
      - evolvefit-network

  # Redis (Shared Cache)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - evolvefit-network
    command: redis-server --appendonly yes

  # API Instances
  api-1:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3001
      - REDIS_HOST=redis
      - INSTANCE_ID=1
    depends_on:
      - redis
    networks:
      - evolvefit-network
    restart: unless-stopped

  api-2:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3002
      - REDIS_HOST=redis
      - INSTANCE_ID=2
    depends_on:
      - redis
    networks:
      - evolvefit-network
    restart: unless-stopped

  api-3:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3003
      - REDIS_HOST=redis
      - INSTANCE_ID=3
    depends_on:
      - redis
    networks:
      - evolvefit-network
    restart: unless-stopped

volumes:
  redis-data:

networks:
  evolvefit-network:
    driver: bridge
`;

/**
 * Nginx Load Balancer Configuration
 */
export const nginxConfig = `upstream evolvefit_backend {
  least_conn;
  server api-1:3001 max_fails=3 fail_timeout=30s;
  server api-2:3002 max_fails=3 fail_timeout=30s;
  server api-3:3003 max_fails=3 fail_timeout=30s;
}

server {
  listen 80;
  server_name _;

  # Compression
  gzip on;
  gzip_types text/plain application/json;
  gzip_min_length 1000;

  # Rate limiting
  limit_req_zone \\$binary_remote_addr zone=api_limit:10m rate=10r/s;
  limit_req zone=api_limit burst=20 nodelay;

  # Cache headers for static files
  location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
  }

  # API routes with load balancing
  location /api/ {
    proxy_pass http://evolvefit_backend;
    proxy_set_header Host \\$host;
    proxy_set_header X-Real-IP \\$remote_addr;
    proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \\$scheme;
    
    # Timeouts
    proxy_connect_timeout 10s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
    
    # Buffering
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
  }

  # Health check endpoint
  location /health {
    access_log off;
    proxy_pass http://evolvefit_backend;
  }

  # Serve static files
  location / {
    proxy_pass http://evolvefit_backend;
  }
}
`;

/**
 * Kubernetes Configuration for cloud scaling
 */
export const kubernetesConfig = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: evolvefit-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: evolvefit-api
  template:
    metadata:
      labels:
        app: evolvefit-api
    spec:
      containers:
      - name: api
        image: evolvefit/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_HOST
          value: redis-service
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: evolvefit-service
spec:
  type: LoadBalancer
  selector:
    app: evolvefit-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: evolvefit-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: evolvefit-api
  minReplicas: 2
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
`;

/**
 * Vercel Deployment Configuration (Serverless)
 */
export const vercelConfig = {
  functions: {
    'api/analyze.ts': {
      memory: 1024,
      timeout: 60,
      maxDuration: 60,
    },
    'api/generate-plan.ts': {
      memory: 512,
      timeout: 120,
      maxDuration: 120,
    },
    'api/coach.ts': {
      memory: 512,
      timeout: 30,
      maxDuration: 30,
    },
  },
  crons: [
    {
      path: '/api/cron/cleanup',
      schedule: '0 2 * * *', // 2 AM daily
    },
    {
      path: '/api/cron/healthcheck',
      schedule: '*/5 * * * *', // Every 5 minutes
    },
  ],
};

/**
 * Health check endpoint
 */
export async function healthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
  };
}

/**
 * Metrics collector for monitoring
 */
export class MetricsCollector {
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };

  recordRequest(duration: number, success: boolean) {
    this.metrics.requestCount++;
    if (!success) this.metrics.errorCount++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / 2;
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString(),
    };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };
  }
}
