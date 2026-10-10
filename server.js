'use strict';

const express = require('express');
const path = require('node:path');
const client = require('prom-client');
const cors = require('cors');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
const requests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests handled by the application',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});
const duration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});

function createApp(pool) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || false,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  }));

  app.use((req, res, next) => {
    const finishTimer = duration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path || req.path;
      requests.inc({
        method: req.method,
        route,
        status_code: String(res.statusCode),
      });
      finishTimer({ method: req.method, route });
      console.log(`${req.method} ${route} ${res.statusCode} ${req.ip}`);
    });
    next();
  });

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/healthz', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'database unavailable' });
    }
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  app.get('/api/notes', async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT id, content, created_at FROM notes ORDER BY id DESC'
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/notes', async (req, res, next) => {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 500) {
      return res.status(400).json({ error: 'content must be 1-500 characters' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO notes (content) VALUES ($1) RETURNING id, content, created_at',
        [content]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/notes/:id', async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'id must be a number' });
    }
    try {
      const result = await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) return res.sendStatus(404);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

async function start() {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id BIGSERIAL PRIMARY KEY,
      content VARCHAR(500) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const port = Number(process.env.PORT || 3000);
  const server = createApp(pool).listen(port, '0.0.0.0', () => {
    console.log(`Notes app listening on port ${port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Application startup failed:', error);
    process.exit(1);
  });
}

module.exports = { createApp };
