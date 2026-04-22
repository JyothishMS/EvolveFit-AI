import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();
dotenv.config({ path: '.env.local' });

console.log('✅ Environment variables loaded');

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Layer 1: CDN
import { initCloudflare, cdnMiddleware } from './src/lib/cdn-config';

// Layer 2: Redis Cache
import { initRedis, cacheGet, cacheSet, cacheKeys, CACHE_TTL } from './src/lib/redis-cache';

// Layer 3: Queue System
import { 
  setupQueueMonitoring, 
  addAnalysisJob, 
  addPlanJob,
  getJobStatus,
  closeQueues 
} from './src/lib/queue-system';

// Layer 4: Horizontal Scaling
import { MetricsCollector, healthCheck } from './src/lib/scaling-config';

// API handlers
import analyzeHandler from './api/analyze';
import generatePlanHandler from './api/generate-plan';
import coachHandler from './api/coach';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize components
let redisClient: any = null;
let cdn: any = null;
const metrics = new MetricsCollector();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  // 🔹 Layer 4: Metrics middleware for load balancing
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      metrics.recordRequest(duration, res.statusCode < 400);
    });
    next();
  });

  // Body parser middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb' }));

  // 🔹 Layer 1: CDN middleware
  cdn = initCloudflare();
  app.use(cdnMiddleware(cdn));

  // 🔹 Layer 2: Initialize Redis cache
  console.log('🔄 Initializing Redis cache...');
  redisClient = await initRedis();

  // 🔹 Layer 3: Setup queue monitoring
  console.log('🔄 Setting up queue system...');
  setupQueueMonitoring();

  // ============= API ROUTES =============

  // Health check endpoint (no cache)
  app.get('/api/health', async (req, res) => {
    const health = await healthCheck();
    res.json(health);
  });

  // Metrics endpoint (for monitoring)
  app.get('/api/metrics', (req, res) => {
    res.json(metrics.getMetrics());
  });

  // 🔹 Image Analysis with Queue + Cache
  app.post('/api/analyze', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      const userId = req.query.userId || 'anonymous';

      if (!imageBase64) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Check cache first
      const cacheKey = cacheKeys.analysis(userId as string);
      const cached = await cacheGet(cacheKey);
      
      if (cached) {
        console.log(`✅ Cache hit for analysis: ${userId}`);
        return res.json({ cached: true, ...cached });
      }

      // Queue job for background processing
      console.log(`📤 Queuing analysis job for ${userId}`);
      const job = await addAnalysisJob({
        userId: userId as string,
        imageBase64,
        timestamp: new Date().toISOString(),
      });

      // Return immediately with job ID (don't wait for processing)
      res.json({
        status: 'processing',
        jobId: job.id,
        message: 'Analysis queued. Check status with GET /api/analyze/:jobId',
      });
    } catch (error) {
      console.error('❌ Analysis endpoint error:', error);
      res.status(500).json({ error: 'Analysis failed' });
    }
  });

  // Get analysis job status
  app.get('/api/analyze/:jobId', async (req, res) => {
    try {
      const status = await getJobStatus('analysis', req.params.jobId);
      if (!status) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(status);
    } catch (error) {
      console.error('❌ Status check error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  // 🔹 Plan Generation with Queue + Cache
  app.post('/api/generate-plan', async (req, res) => {
    try {
      const { profile } = req.body;
      const userId = req.query.userId || 'anonymous';

      if (!profile) {
        return res.status(400).json({ error: 'No profile provided' });
      }

      // Check cache
      const cacheKey = cacheKeys.plan(userId as string);
      const cached = await cacheGet(cacheKey);
      
      if (cached) {
        console.log(`✅ Cache hit for plan: ${userId}`);
        return res.json({ cached: true, ...cached });
      }

      // Queue job
      console.log(`📤 Queuing plan generation for ${userId}`);
      const job = await addPlanJob({
        userId: userId as string,
        profile,
        timestamp: new Date().toISOString(),
      });

      // Return immediately
      res.json({
        status: 'processing',
        jobId: job.id,
        message: 'Plan generation queued. Check status with GET /api/generate-plan/:jobId',
      });
    } catch (error) {
      console.error('❌ Plan generation error:', error);
      res.status(500).json({ error: 'Plan generation failed' });
    }
  });

  // Get plan generation status
  app.get('/api/generate-plan/:jobId', async (req, res) => {
    try {
      const status = await getJobStatus('plan', req.params.jobId);
      if (!status) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(status);
    } catch (error) {
      console.error('❌ Status check error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  // 🔹 Coaching with Cache
  app.post('/api/coach', async (req, res) => {
    try {
      const { message } = req.body;
      const userId = req.query.userId || 'anonymous';

      if (!message) {
        return res.status(400).json({ error: 'No message provided' });
      }

      // For quick responses, try cache first
      const cacheKey = cacheKeys.coachResponse(userId as string, message);
      const cached = await cacheGet(cacheKey);
      
      if (cached) {
        console.log(`✅ Cache hit for coach response`);
        return res.json(cached);
      }

      // Process coaching request
      const result = await coachHandler(req, res);
      
      // Cache the response
      if (result && typeof result === 'object') {
        await cacheSet(cacheKey, result, CACHE_TTL.SHORT);
      }

      return result;
    } catch (error) {
      console.error('❌ Coaching error:', error);
      res.status(500).json({ error: 'Coaching failed' });
    }
  });

  // Fallback for old direct API calls
  app.post('/api/analyze-direct', analyzeHandler);
  app.post('/api/generate-plan-direct', generatePlanHandler);

  // ============= STATIC FILES & VITE =============

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: false, // Disable ETag for better CDN compatibility
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ============= SERVER STARTUP =============

  const server = app.listen(PORT, 'localhost', () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 EvolveFit Server Started              ║
║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV}                 ║
║   Instance: ${process.env.INSTANCE_ID || '1'}                    ║
║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║   ✅ Layer 1: CDN ${cdn ? '✓' : '✗'}                       ║
║   ✅ Layer 2: Redis Cache ${redisClient ? '✓' : '✗'}             ║
║   ✅ Layer 3: Queue System ✓                ║
║   ✅ Layer 4: Scaling Ready ✓               ║
╚════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📵 SIGTERM received, shutting down gracefully...');
    server.close(async () => {
      await closeQueues();
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

startServer().catch(console.error);
