import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import https from 'https';
import { db, RequestLog } from '../db';

const router = Router();
const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

router.all('/*', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: "Invalid API Key", type: "invalid_request_error" } });
  }

  const tokenStr = authHeader.split(' ')[1];
  const userToken = db.get('userTokens').find({ token: tokenStr }).value();

  if (!userToken) {
    return res.status(401).json({ error: { message: "Invalid API Key", type: "invalid_request_error" } });
  }

  // Get active upstream keys
  const activeKeys = db.get('upstreamKeys').filter({ isActive: true }).value();
  if (activeKeys.length === 0) {
    return res.status(503).json({ error: { message: "No active upstream channels available", type: "api_error" } });
  }

  // Simple random selection for load balancing
  const upstream = activeKeys[Math.floor(Math.random() * activeKeys.length)];

  const startTime = Date.now();
  const targetUrl = `${NVIDIA_API_BASE}${req.path}`;

  const options = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${upstream.key}`,
      'Accept': req.headers.accept || '*/*'
    },
  };

  const reqBody = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined;

  let isStream = false;
  if (req.body && req.body.stream === true) {
    isStream = true;
  }

  const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    res.status(proxyRes.statusCode || 500);

    // Copy headers
    for (const key in proxyRes.headers) {
      if (proxyRes.headers[key]) {
        res.setHeader(key, proxyRes.headers[key] as string | string[]);
      }
    }

    let responseBody = '';

    proxyRes.on('data', (chunk) => {
      res.write(chunk);
      if (!isStream) {
        responseBody += chunk.toString();
      }
    });

    proxyRes.on('end', () => {
      res.end();

      const durationMs = Date.now() - startTime;

      // Update upstream last used
      db.get('upstreamKeys').find({ id: upstream.id }).assign({ lastUsedAt: new Date().toISOString() }).write();

      // Log request
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      const model = req.body?.model || 'unknown';

      if (!isStream && proxyRes.statusCode === 200) {
        try {
          const parsed = JSON.parse(responseBody);
          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens || 0;
            completionTokens = parsed.usage.completion_tokens || 0;
            totalTokens = parsed.usage.total_tokens || 0;
          }
        } catch (e) {
          // parse error
        }
      }

      if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        db.get('upstreamKeys').find({ id: upstream.id }).assign({ errorCount: upstream.errorCount + 1 }).write();
      }

      const log: RequestLog = {
        id: 'log_' + crypto.randomBytes(8).toString('hex'),
        userId: userToken.userId,
        tokenId: userToken.id,
        upstreamKeyId: upstream.id,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        durationMs,
        status: proxyRes.statusCode || 500,
        createdAt: new Date().toISOString()
      };

      db.get('requestLogs').push(log).write();
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e);
    db.get('upstreamKeys').find({ id: upstream.id }).assign({ errorCount: upstream.errorCount + 1 }).write();
    if (!res.headersSent) {
      res.status(502).json({ error: { message: "Bad Gateway", type: "api_error" } });
    }
  });

  if (reqBody) {
    proxyReq.write(reqBody);
  }
  proxyReq.end();
});

export default router;
