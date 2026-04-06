import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { db, initDb } from './db';
import apiRouter from './routes/api';
import proxyRouter from './routes/proxy';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(morgan('dev'));

// For normal API routes, parse JSON
app.use('/api', express.json());
// For proxy router (NVIDIA gateway), we might need raw or stream depending on implementation,
// but express.json() is generally fine if we re-serialize,
// OR we can just proxy stream. Let's use express.json() for now, and handle streaming manually.
app.use('/v1', express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use('/v1', proxyRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Agora Backend listening on port ${PORT}`);
  });
}

start();
