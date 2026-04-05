import { Hono } from 'hono'
import { cors } from 'hono/cors'
import adminRoutes from './routes/admin'
import { addLog, getState, getNextAvailableKey, markKeyFailure, markKeySuccess, validateUserToken } from './lib/state'
import { getModelList, isValidModel } from './lib/models'
import { adaptChatRequestByModel } from './lib/model-adapter'
import { shellHTML } from './views/shell'
import { loginHTML } from './views/login'
import { NvidiaProviderService } from './lib/providers/nvidia'
import type { ChatCompletionRequest, EnvBindings } from './types'

const app = new Hono<{ Bindings: EnvBindings }>()

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))

app.get('/login', (c) => c.html(loginHTML()))
app.get('/admin', (c) => c.html(shellHTML(true)))
app.get('/dashboard', (c) => c.redirect('/admin'))
app.get('/user', (c) => c.html(shellHTML(false)))
app.get('/', (c) => c.redirect('/user'))

app.route('/admin', adminRoutes)

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const userAuthMiddleware = async (c: any, next: any) => {
  const path = c.req.path
  if (path === '/v1/models') {
    await next()
    return
  }

  const auth = c.req.header('Authorization')
  if (!auth) {
    return c.json({ error: { message: 'Missing Authorization header', type: 'authentication_error', code: 401 } }, 401)
  }

  const state = await getState(c.env)
  const userToken = validateUserToken(state, auth)

  if (!userToken) {
    return c.json({ error: { message: 'Invalid or rate-limited API key', type: 'authentication_error', code: 401 } }, 401)
  }

  c.set('userToken', userToken)
  await next()
}

app.get('/v1/models', (c) => {
  const models = getModelList()
  return c.json({ object: 'list', data: models })
})

app.post('/v1/chat/completions', userAuthMiddleware, async (c) => {
  const state = await getState(c.env)
  const startTime = Date.now()
  const requestId = generateRequestId()
  const userToken = c.get('userToken') as any

  let body: ChatCompletionRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { message: 'Invalid JSON body', type: 'invalid_request_error', code: 400 }, request_id: requestId }, 400)
  }

  if (!body.model) {
    return c.json({ error: { message: 'model is required', type: 'invalid_request_error', code: 400 }, request_id: requestId }, 400)
  }

  if (!isValidModel(body.model)) {
    return c.json({ error: { message: `Model '${body.model}' is not supported. Use GET /v1/models to see available models.`, type: 'invalid_request_error', code: 400 }, request_id: requestId }, 400)
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return c.json({ error: { message: 'messages is required and must be an array', type: 'invalid_request_error', code: 400 }, request_id: requestId }, 400)
  }

  const key = getNextAvailableKey(state)
  if (!key) {
    return c.json({ error: { message: 'All NVIDIA API keys are rate limited or cooling down. Please try again later.', type: 'rate_limit_error', code: 429 }, request_id: requestId }, 429)
  }

  key.requestCount++
  key.totalRequests++
  key.lastUsed = Date.now()
  userToken.requestCount++
  userToken.totalRequests++

  const isStream = body.stream === true
  const upstreamPayload = adaptChatRequestByModel(body)

  try {
    const maxRetryAttempts = Math.max(0, Number.parseInt(c.env.MAX_RETRY_ATTEMPTS || '2', 10) || 2)
    const cooldownMs = Math.max(1000, Number.parseInt(c.env.KEY_COOLDOWN_MS || '30000', 10) || 30000)
    const provider = new NvidiaProviderService(key.key, maxRetryAttempts)
    const { response, attempts } = await provider.chatCompletion(upstreamPayload, isStream)

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = { message: errorText }
      try { errorData = JSON.parse(errorText) } catch {}

      markKeyFailure(key, cooldownMs)
      addLog(state, {
        requestId,
        timestamp: startTime,
        model: body.model,
        keyId: key.id,
        userToken: userToken.token.substring(0, 20) + '...',
        status: response.status,
        latency,
        attemptCount: attempts,
        error: errorData?.error?.message || errorText,
      })
      return c.json({ error: errorData?.error || { message: errorText }, request_id: requestId }, response.status as any)
    }

    markKeySuccess(key)
    addLog(state, {
      requestId,
      timestamp: startTime,
      model: body.model,
      keyId: key.id,
      userToken: userToken.token.substring(0, 20) + '...',
      status: 200,
      latency,
      attemptCount: attempts,
    })

    if (isStream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
          'X-Request-Id': requestId,
        },
      })
    }

    const data = await response.json() as any
    return c.json({ ...data, request_id: requestId })
  } catch (err: any) {
    const latency = Date.now() - startTime
    const cooldownMs = Math.max(1000, Number.parseInt(c.env.KEY_COOLDOWN_MS || '30000', 10) || 30000)
    markKeyFailure(key, cooldownMs)
    addLog(state, {
      requestId,
      timestamp: startTime,
      model: body.model,
      keyId: key.id,
      userToken: userToken.token.substring(0, 20) + '...',
      status: 500,
      latency,
      error: err.message,
    })
    return c.json({ error: { message: `Request failed: ${err.message}`, type: 'server_error', code: 500 }, request_id: requestId }, 500)
  }
})

app.post('/v1/completions', userAuthMiddleware, async (c) => {
  const state = await getState(c.env)
  const startTime = Date.now()
  const requestId = generateRequestId()
  const userToken = c.get('userToken') as any

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { message: 'Invalid JSON body' }, request_id: requestId }, 400)
  }

  if (body.model && !isValidModel(body.model)) {
    return c.json({ error: { message: `Model '${body.model}' is not supported. Use GET /v1/models to see available models.`, type: 'invalid_request_error', code: 400 }, request_id: requestId }, 400)
  }

  const key = getNextAvailableKey(state)
  if (!key) return c.json({ error: { message: 'All NVIDIA API keys are rate limited or cooling down' }, request_id: requestId }, 429)

  key.requestCount++
  key.totalRequests++
  key.lastUsed = Date.now()
  userToken.requestCount++
  userToken.totalRequests++

  try {
    const maxRetryAttempts = Math.max(0, Number.parseInt(c.env.MAX_RETRY_ATTEMPTS || '2', 10) || 2)
    const cooldownMs = Math.max(1000, Number.parseInt(c.env.KEY_COOLDOWN_MS || '30000', 10) || 30000)
    const provider = new NvidiaProviderService(key.key, maxRetryAttempts)
    const { response, attempts } = await provider.completion(body, body.stream === true)

    const latency = Date.now() - startTime
    if (!response.ok) {
      const errorText = await response.text()
      markKeyFailure(key, cooldownMs)
      addLog(state, { requestId, timestamp: startTime, model: body.model || 'unknown', keyId: key.id, userToken: userToken.token.substring(0, 20) + '...', status: response.status, latency, attemptCount: attempts, error: errorText })
      return new Response(errorText, { status: response.status, headers: { 'X-Request-Id': requestId } })
    }

    markKeySuccess(key)
    addLog(state, { requestId, timestamp: startTime, model: body.model || 'unknown', keyId: key.id, userToken: userToken.token.substring(0, 20) + '...', status: 200, latency, attemptCount: attempts })

    if (body.stream) {
      return new Response(response.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*', 'X-Request-Id': requestId } })
    }

    const data = await response.json() as any
    return c.json({ ...data, request_id: requestId })
  } catch (err: any) {
    return c.json({ error: { message: err.message }, request_id: requestId }, 500)
  }
})

export default app
