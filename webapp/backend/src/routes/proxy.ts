import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import https from 'https';
import type { ClientRequest } from 'http';
import {
  findUserTokenByRawToken,
  insertRequestLog,
  listEligibleUpstreamKeys,
  getNextUpstreamAvailableAt,
  deactivateUpstreamKey,
  markUpstreamError,
  markUpstreamLastUsed,
  markUpstreamSuccess,
  RequestLog
} from '../store';
import { isRetryableStatus } from '../upstreamHealth';
import { getAllowedModels, isModelAllowlistEnforced } from '../models';

const router = Router();
const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || 'https://integrate.api.nvidia.com/v1';

function clampInt(raw: unknown, fallback: number, min: number, max: number) {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : typeof raw === 'number' ? raw : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

function isPlainObject(value: any): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

type ThinkingSupport = 'thinking' | 'enable_thinking' | 'always_on' | 'unsupported' | 'both';

function getThinkingSupport(modelId: string): ThinkingSupport {
  const m = String(modelId || '').trim();
  switch (m) {
    // Kimi family
    case 'moonshotai/kimi-k2-instruct':
    case 'moonshotai/kimi-k2-instruct-0905':
      return 'unsupported';
    case 'moonshotai/kimi-k2-thinking':
      return 'always_on';
    case 'moonshotai/kimi-k2.5':
      return 'thinking';

    // Qwen family
    case 'qwen/qwen3-coder-480b-a35b-instruct':
      return 'unsupported';
    case 'qwen/qwen3.5-122b-a10b':
    case 'qwen/qwen3.5-397b-a17b':
      return 'enable_thinking';

    // Gemma
    case 'google/gemma-4-31b-it':
      return 'enable_thinking';
    case 'google/gemma-3-27b':
    case 'google/gemma-3-27b-it':
    case 'google/gemma3-27b':
    case 'google/gemma3-27b-it':
      return 'unsupported';

    // GLM family
    case 'z-ai/glm4.7':
    case 'z-ai/glm5':
      return 'enable_thinking';

    // DeepSeek family
    case 'deepseek-ai/deepseek-v3.1':
    case 'deepseek-ai/deepseek-v3.1-terminus':
    case 'deepseek-ai/deepseek-v3.2':
      return 'thinking';

    // Always-on reasoning (cannot disable)
    case 'openai/gpt-oss-120b':
      return 'always_on';

    default:
      return 'both';
  }
}

function mergeExtraBody(body: any) {
  if (!isPlainObject(body)) return body;
  if (!isPlainObject(body.extra_body)) return body;
  const merged = { ...body, ...body.extra_body };
  delete (merged as any).extra_body;
  return merged;
}

function normalizeChatTemplateKwargs(body: any) {
  if (!isPlainObject(body)) return body;

  const chatTemplateKwargs = isPlainObject(body.chat_template_kwargs) ? { ...body.chat_template_kwargs } : {};

  const thinkingCandidates = [
    chatTemplateKwargs.thinking,
    chatTemplateKwargs.enable_thinking,
    body.thinking,
    body.enable_thinking
  ];
  const requestedThinking = thinkingCandidates.find((v) => typeof v === 'boolean') as boolean | undefined;

  const clearCandidates = [chatTemplateKwargs.clear_thinking, body.clear_thinking];
  const requestedClearThinking = clearCandidates.find((v) => typeof v === 'boolean') as boolean | undefined;

  delete (chatTemplateKwargs as any).thinking;
  delete (chatTemplateKwargs as any).enable_thinking;
  delete (chatTemplateKwargs as any).clear_thinking;
  delete (body as any).thinking;
  delete (body as any).enable_thinking;
  delete (body as any).clear_thinking;

  const modelId = String((body as any).model || '').trim();
  const support = getThinkingSupport(modelId);

  if (support === 'thinking') {
    if (requestedThinking !== undefined) {
      (chatTemplateKwargs as any).thinking = requestedThinking;
    }
  } else if (support === 'enable_thinking') {
    if (requestedThinking !== undefined) {
      (chatTemplateKwargs as any).enable_thinking = requestedThinking;
    }
    if (requestedClearThinking !== undefined) {
      (chatTemplateKwargs as any).clear_thinking = requestedClearThinking;
    }
  } else if (support === 'both') {
    if (requestedThinking !== undefined) {
      (chatTemplateKwargs as any).thinking = requestedThinking;
      (chatTemplateKwargs as any).enable_thinking = requestedThinking;
    }
    if (requestedClearThinking !== undefined) {
      (chatTemplateKwargs as any).clear_thinking = requestedClearThinking;
    }
  } else if (support === 'always_on') {
    // Never send disabling flags; model output always includes reasoning.
    // Intentionally omit chat_template_kwargs changes to avoid upstream param errors.
  } else if (support === 'unsupported') {
    // Drop thinking toggles for models that don't accept them.
  }

  if (Object.keys(chatTemplateKwargs).length > 0) {
    (body as any).chat_template_kwargs = chatTemplateKwargs;
  } else {
    delete (body as any).chat_template_kwargs;
  }

  return body;
}

const STREAMING_TIMEOUT_SECONDS = clampInt(process.env.STREAMING_TIMEOUT, 300, 5, 3600);
const FAILURE_RETRY_COUNT = clampInt(process.env.FAILURE_RETRY_COUNT, 1, 0, 10);

function effectiveWeight(key: any) {
  const w = typeof key.weight === 'number' && Number.isFinite(key.weight) ? Math.max(0, key.weight) : 1;
  const failures = typeof key.consecutiveFailures === 'number' && Number.isFinite(key.consecutiveFailures) ? Math.max(0, key.consecutiveFailures) : 0;
  // Penalize recent failures without completely starving the key.
  return w * Math.pow(0.5, Math.min(failures, 10));
}

function pickWeightedIndex<T>(items: T[], weightFn: (item: T) => number) {
  const total = items.reduce((sum, it) => sum + Math.max(0, weightFn(it)), 0);
  if (!Number.isFinite(total) || total <= 0) return Math.floor(Math.random() * items.length);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weightFn(items[i]));
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function takeWeightedNoReplacement<T>(items: T[], count: number, weightFn: (item: T) => number) {
  const remaining = [...items];
  const out: T[] = [];
  const n = Math.min(Math.max(Math.floor(count), 0), remaining.length);
  for (let i = 0; i < n; i++) {
    const idx = pickWeightedIndex(remaining, weightFn);
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}

// Keep-alive improves latency and reduces TLS overhead under load.
const relayAgent = new https.Agent({
  keepAlive: true,
  maxSockets: clampInt(process.env.RELAY_MAX_SOCKETS ?? process.env.RELAY_MAX_IDLE_CONNS_PER_HOST, 100, 10, 2000),
  maxFreeSockets: clampInt(process.env.RELAY_MAX_FREE_SOCKETS, 20, 1, 2000),
  keepAliveMsecs: 30_000
});

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade'
]);

router.all('/*', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: "Invalid API Key", type: "invalid_request_error" } });
  }

  const tokenStr = authHeader.split(' ')[1];
  const userToken = findUserTokenByRawToken(tokenStr);
  
  if (!userToken) {
    return res.status(401).json({ error: { message: "Invalid API Key", type: "invalid_request_error" } });
  }

  const normalizedBody = normalizeChatTemplateKwargs(
    mergeExtraBody(isPlainObject(req.body) ? { ...req.body } : req.body)
  );

  // Optional model allowlist (disabled by default)
  if (isModelAllowlistEnforced() && normalizedBody && (normalizedBody as any).model) {
    const allowlist = getAllowedModels();
    if (!allowlist.includes((normalizedBody as any).model)) {
      return res.status(400).json({
        error: {
          message: `The model '${(normalizedBody as any).model}' does not exist or you do not have access to it. Allowed models are: ${allowlist.join(', ')}`,
          type: "invalid_request_error",
          param: "model",
          code: "model_not_found"
        }
      });
    }
  }

  // Get eligible upstream keys (active + not cooling down)
  const now = new Date();
  const nowIso = now.toISOString();
  const eligibleKeys = listEligibleUpstreamKeys(nowIso);
  if (eligibleKeys.length === 0) {
    const next = getNextUpstreamAvailableAt(nowIso);
    if (next) {
      const retryAfterSeconds = Math.max(1, Math.ceil((new Date(next).getTime() - now.getTime()) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(503).json({
        error: { message: `All upstream keys are cooling down. Retry after ${retryAfterSeconds}s`, type: "api_error" }
      });
    }
    return res.status(503).json({ error: { message: "No active upstream channels available", type: "api_error" } });
  }

  const startTime = Date.now();
  const targetUrl = `${NVIDIA_API_BASE}${req.url}`;
  
  const normalizedBodyObj = normalizedBody && isPlainObject(normalizedBody) ? normalizedBody : null;
  const primaryReqBody =
    normalizedBodyObj && Object.keys(normalizedBodyObj).length > 0 ? JSON.stringify(normalizedBodyObj) : undefined;

  let fallbackReqBody: string | undefined;
  if (normalizedBodyObj && normalizedBodyObj.chat_template_kwargs !== undefined) {
    const fallbackBody = { ...normalizedBodyObj };
    delete (fallbackBody as any).chat_template_kwargs;
    fallbackReqBody = JSON.stringify(fallbackBody);
  }
  
  let isStream = false;
  if (normalizedBodyObj && (normalizedBodyObj as any).stream === true) {
    isStream = true;
  }

  const maxAttempts = Math.min(eligibleKeys.length, 1 + FAILURE_RETRY_COUNT);
  const candidates = takeWeightedNoReplacement(eligibleKeys, maxAttempts, effectiveWeight);
  let upstreamRequests = 0;

  let currentProxyReq: ClientRequest | null = null;
  const onClientClose = () => {
    currentProxyReq?.destroy();
  };
  req.on('close', onClientClose);

  try {
    for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex++) {
      const upstream = candidates[attemptIndex];
      const allowRetry = attemptIndex < maxAttempts - 1;

      const sent = await new Promise<boolean>((resolve) => {
        const options = {
          method: req.method,
          agent: relayAgent,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${upstream.key}`,
            'Accept': isStream ? 'text/event-stream' : 'application/json'
          }
        };

        const timeoutMs = STREAMING_TIMEOUT_SECONDS * 1000;

        let fallbackStarted = false;
        let fallbackLaunched = false;

        const startRequest = (bodyToSend: string | undefined, allowParamFallback: boolean) => {
          upstreamRequests += 1;
          const proxyReq = https.request(targetUrl, options, (proxyRes) => {
            const statusCode = proxyRes.statusCode || 500;
            const now = new Date();
            const nowIso = now.toISOString();

            // Always track that we attempted this upstream.
            markUpstreamLastUsed(upstream.id, nowIso);

            // If an upstream key is invalid, disable it and retry on other keys.
            // Never return upstream 401 to end users because it looks like *their* API token is invalid.
            if (statusCode === 401) {
              deactivateUpstreamKey(upstream.id, nowIso);
              proxyRes.resume(); // drain

              if (allowRetry) {
                proxyRes.on('end', () => resolve(false));
                proxyRes.on('error', () => resolve(false));
                return;
              }

              if (!res.headersSent) {
                res.status(502).json({ error: { message: "Upstream authentication failed", type: "api_error" } });
              } else {
                res.end();
              }

              const durationMs = Date.now() - startTime;
              const log: RequestLog = {
                id: 'log_' + crypto.randomBytes(8).toString('hex'),
                requestId: ((req as any).requestId as string | undefined) ?? null,
                userId: userToken.userId,
                tokenId: userToken.id,
                upstreamKeyId: upstream.id,
                model: (normalizedBodyObj as any)?.model || 'unknown',
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                durationMs,
                status: 502,
                upstreamAttempts: upstreamRequests,
                isStream,
                createdAt: nowIso
              };
              insertRequestLog(log);

              proxyRes.on('end', () => resolve(true));
              proxyRes.on('error', () => resolve(true));
              return;
            }

            // Retry only for upstream-side failures (429/5xx) and only if we haven't
            // started sending the response to the client.
            if (allowRetry && isRetryableStatus(statusCode)) {
              markUpstreamError(upstream.id, nowIso, statusCode);
              proxyRes.resume(); // drain
              proxyRes.on('end', () => resolve(false));
              proxyRes.on('error', () => resolve(false));
              return;
            }

            // Best-effort compatibility fallback:
            // Some models reject `chat_template_kwargs` even if others accept it.
            // If we hit a 400/422, strip chat_template_kwargs and retry once on the same upstream.
            if (
              allowParamFallback &&
              !fallbackStarted &&
              (statusCode === 400 || statusCode === 422) &&
              fallbackReqBody &&
              !res.headersSent
            ) {
              fallbackStarted = true;
              proxyRes.resume(); // drain
              const startFallback = () => {
                if (fallbackLaunched) return;
                fallbackLaunched = true;
                currentProxyReq = startRequest(fallbackReqBody, false);
              };
              proxyRes.once('end', startFallback);
              proxyRes.once('error', startFallback);
              return;
            }

            res.status(statusCode);
            for (const key in proxyRes.headers) {
              const lower = key.toLowerCase();
              if (HOP_BY_HOP_HEADERS.has(lower)) continue;
              const value = proxyRes.headers[key];
              if (value !== undefined) {
                res.setHeader(key, value as string | string[]);
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

              // Log request
              let promptTokens = 0;
              let completionTokens = 0;
              let totalTokens = 0;
              const model = (normalizedBodyObj as any)?.model || 'unknown';

              if (!isStream && statusCode === 200) {
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

              if (isRetryableStatus(statusCode)) {
                markUpstreamError(upstream.id, nowIso, statusCode);
              } else if (statusCode < 400) {
                markUpstreamSuccess(upstream.id, nowIso);
              }

              const log: RequestLog = {
                id: 'log_' + crypto.randomBytes(8).toString('hex'),
                requestId: ((req as any).requestId as string | undefined) ?? null,
                userId: userToken.userId,
                tokenId: userToken.id,
                upstreamKeyId: upstream.id,
                model,
                promptTokens,
                completionTokens,
                totalTokens,
                durationMs,
                status: statusCode,
                upstreamAttempts: upstreamRequests,
                isStream,
                createdAt: nowIso
              };

              insertRequestLog(log);
              resolve(true);
            });

            proxyRes.on('error', () => {
              // If we already started writing to the client, we can't retry safely.
              const now = new Date();
              const nowIso = now.toISOString();
              markUpstreamError(upstream.id, nowIso, 500);
              if (!res.headersSent) {
                res.status(502).json({ error: { message: "Bad Gateway", type: "api_error" } });
              } else {
                res.end();
              }
              resolve(true);
            });
          });

          currentProxyReq = proxyReq;
          proxyReq.setTimeout(timeoutMs, () => proxyReq.destroy(new Error('Upstream timeout')));

          proxyReq.on('error', (e) => {
            console.error('Proxy error:', e);
            const now = new Date();
            const nowIso = now.toISOString();
            markUpstreamError(upstream.id, nowIso, 500);
            if (allowRetry && !res.headersSent) {
              resolve(false);
              return;
            }
            if (!res.headersSent) {
              res.status(502).json({ error: { message: "Bad Gateway", type: "api_error" } });
            }
            resolve(true);
          });

          if (bodyToSend) {
            proxyReq.write(bodyToSend);
          }
          proxyReq.end();

          return proxyReq;
        };

        startRequest(primaryReqBody, true);
      });

      if (sent) {
        return;
      }
    }

    if (!res.headersSent) {
      return res.status(502).json({ error: { message: "Bad Gateway", type: "api_error" } });
    }
  } finally {
    req.off('close', onClientClose);
  }
});

export default router;
