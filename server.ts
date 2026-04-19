import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();
dotenv.config({ path: '.env.local' });

console.log('✅ Environment variables loaded');
console.log('HF_API_KEY:', process.env.HF_API_KEY ? '✅ Found' : '❌ Not found');

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeHandler from './api/analyze';
import generatePlanHandler from './api/generate-plan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb' }));

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/analyze', analyzeHandler);
  app.post('/api/generate-plan', generatePlanHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, 'localhost', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
