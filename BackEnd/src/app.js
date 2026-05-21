import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import morgan  from 'morgan';

import { authLimiter, apiLimiter } from './middlewares/rateLimiter.js';

import authRoutes        from './routes/auth.routes.js';
import hrAssistantRoutes from './routes/hrAssistant.routes.js';
import pulseWorkRoutes   from './routes/pulseWork.routes.js';
import enpsRoutes        from './routes/enps.routes.js';
import performanceRoutes from './routes/performance.routes.js';
import usersRoutes       from './routes/users.routes.js';
import areasRoutes       from './routes/areas.routes.js';
import ragRoutes         from './routes/rag.routes.js';
import recognitionRoutes from './routes/recognition.routes.js';
import feedbackRoutes    from './routes/feedback.routes.js';
import meetingsRoutes    from './routes/meetings.routes.js';

import notFound     from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// ── Seguridad HTTP ────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Permite requests sin origin (Postman, mobile, etc.) en desarrollo
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} no permitido por CORS`));
  },
  credentials: true,
}));

// ── Logging HTTP ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting global ──────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health check raíz ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Ecosistema Digital RRHH Garnier — API Online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',         authLimiter, authRoutes);   // rate limit estricto en auth
app.use('/api/v1/hr-assistant', hrAssistantRoutes);
app.use('/api/v1/pulse-work',   pulseWorkRoutes);
app.use('/api/v1/enps',         enpsRoutes);
app.use('/api/v1/performance',  performanceRoutes);
app.use('/api/v1/users',        usersRoutes);
app.use('/api/v1/areas',        areasRoutes);
app.use('/api/v1/rag',          ragRoutes);
app.use('/api/v1/recognitions', recognitionRoutes);
app.use('/api/v1/feedback',     feedbackRoutes);
app.use('/api/v1/meetings',     meetingsRoutes);

// ── Error handlers (siempre al final) ────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
