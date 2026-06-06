import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { globalErrorHandler } from './server/middleware/errorHandler.js';
import apiRouter from './server/routes.js';
import dotenv from 'dotenv';

// Load environment variables (.env files)
dotenv.config();

async function bootstrap() {
  const app = express();
  const PORT = 3000;

  // Generous request size limits to handle base64 encoding of PDF assets
  app.use(express.json({ limit: '64mb' }));
  app.use(express.urlencoded({ limit: '64mb', extended: true }));

  // Expose API Controller routes before mounting Vite middlewares
  app.use(apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
  });

  // Integrate Vite Asset middleware depending on lifecycle environment
  if (process.env.NODE_ENV !== 'production') {
    console.log("[Bootstrap] Integrating Vite Web Dev Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Bootstrap] Running in PRODUCTION Mode. Serving compiled files...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA routing fallback handler (requires Express v4 router catch-all)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Mount Standard Global Spring-style Exception Advice
  app.use(globalErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bootstrap] Fullstack PDF server active on http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error("[Bootstrap] Critical crash during server launch:", err);
});
