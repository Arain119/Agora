import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { initDb } from './store';
import apiRouter from './routes/api';
import proxyRouter from './routes/proxy';
import authRouter from './routes/auth';

// Load .env from project root regardless of current working directory.
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Enable correct client IP when behind nginx reverse proxy.
app.set('trust proxy', true);

function getMaxRequestBodyLimit(): string {
  const raw = process.env.MAX_REQUEST_BODY_MB;
  const parsed = raw === undefined ? 32 : Number(raw);
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : 32;
  return `${mb}mb`;
}

const jsonBodyLimit = getMaxRequestBodyLimit();

// Middlewares
app.use(cors());
app.use(morgan('dev'));

// For normal API routes, parse JSON
app.use('/api', express.json({ limit: jsonBodyLimit }));
// For proxy router (NVIDIA gateway), we might need raw or stream depending on implementation, 
// but express.json() is generally fine if we re-serialize, 
// OR we can just proxy stream. Let's use express.json() for now, and handle streaming manually.
app.use('/v1', express.json({ limit: jsonBodyLimit }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use('/v1', proxyRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    // Avoid serving the SPA index.html for API routes.
    // If an API route is missing, we want a real 404/401, not HTML.
    if (req.path.startsWith('/api') || req.path.startsWith('/v1')) {
      return next();
    }

    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle invalid JSON from express.json()/body-parser
  const isInvalidJson =
    err &&
    (err.type === 'entity.parse.failed' ||
      (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err));

  if (isInvalidJson) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const isTooLarge =
    err && (err.type === 'entity.too.large' || (typeof err.status === 'number' && err.status === 413));
  if (isTooLarge) {
    return res.status(413).json({ error: `Request body too large (max ${jsonBodyLimit})` });
  }

  console.error(err?.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Agora Backend listening on port ${PORT}`);
  });
}

start();
