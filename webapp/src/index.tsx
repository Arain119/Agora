import { Hono } from 'hono'
import { cors } from 'hono/cors'
import adminRoutes from './routes/admin'
import { getState, getNextAvailableKey, addLog, validateUserToken } from './lib/state'
import { getModelList, isValidModel } from './lib/models'
import { adaptChatRequestByModel } from './lib/model-adapter'
import { shellHTML } from './views/shell'
import { loginHTML } from './views/login'
import type { ChatCompletionRequest } from './types'

const app = new Hono()

// Global CORS
app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))

// ===== PUBLIC PAGES =====
app.get('/login', (c) => c.html(loginHTML()))
app.get('/admin', (c) => c.html(shellHTML(true)))
app.get('/dashboard', (c) => c.redirect('/admin'))
app.get('/user', (c) => c.html(shellHTML(false)))
app.get('/', (c) => c.redirect('/user'))

// ===== ADMIN API (mounted at /admin) =====
app.route('/admin', adminRoutes)

// ===== OPENAI-COMPATIBLE API =====

// User token auth middleware - only for /v1/* routes
const userAuthMiddleware = async (c: any, next: any) => {
  const path = c.req.path
  // Skip auth for models list
  if (path === '/v1/models') {
    await next()
    return
  }

  const auth = c.req.header('Authorization')
  if (!auth) {
    return c.json({ error: { message: 'Missing Authorization header', type: 'authentication_error', code: 401 } }, 401)
  }

  const state = getState()
  const userToken = validateUserToken(state, auth)

  if (!userToken) {
    return c.json({ error: { message: 'Invalid or rate-limited API key', type: 'authentication_error', code: 401 } }, 401)
  }

  c.set('userToken', userToken)
  await next()
}

// GET /v1/models
app.get('/v1/models', (c) => {
  const models = getModelList()
  return c.json({ object: 'list', data: models })
})

// POST /v1/chat/completions
app.post('/v1/chat/completions', userAuthMiddleware, async (c) => {
  const state = getState()
  const startTime = Date.now()
  const userToken = c.get('userToken') as any

  let body: ChatCompletionRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { message: 'Invalid JSON body', type: 'invalid_request_error', code: 400 } }, 400)
  }

  if (!body.model) {
    return c.json({ error: { message: 'model is required', type: 'invalid_request_error', code: 400 } }, 400)
  }

  if (!isValidModel(body.model)) {
    return c.json({ error: { message: `Model '${body.model}' is not supported. Use GET /v1/models to see available models.`, type: 'invalid_request_error', code: 400 } }, 400)
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return c.json({ error: { message: 'messages is required and must be an array', type: 'invalid_request_error', code: 400 } }, 400)
  }

  const key = getNextAvailableKey(state)
  if (!key) {
    return c.json({ error: { message: 'All API keys are rate limited. Please try again later.', type: 'rate_limit_error', code: 429 } }, 429)
  }

  key.requestCount++
  key.totalRequests++
  key.lastUsed = Date.now()
  userToken.requestCount++
  userToken.totalRequests++

  const isStream = body.stream === true
  const upstreamPayload = adaptChatRequestByModel(body)

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.key}`,
        'Accept': isStream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = { message: errorText }
      try { errorData = JSON.parse(errorText) } catch {}

      key.failCount++
      addLog(state, {
        timestamp: startTime,
        model: body.model,
        keyId: key.id,
        userToken: userToken.token.substring(0, 20) + '...',
        status: response.status,
        latency,
        error: errorData?.error?.message || errorText,
      })
      return c.json({ error: errorData?.error || { message: errorText } }, response.status as any)
    }

    addLog(state, {
      timestamp: startTime,
      model: body.model,
      keyId: key.id,
      userToken: userToken.token.substring(0, 20) + '...',
      status: 200,
      latency,
    })

    if (isStream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const data = await response.json() as any
    return c.json(data)

  } catch (err: any) {
    const latency = Date.now() - startTime
    key.failCount++
    addLog(state, {
      timestamp: startTime,
      model: body.model,
      keyId: key.id,
      userToken: userToken.token.substring(0, 20) + '...',
      status: 500,
      latency,
      error: err.message,
    })
    return c.json({ error: { message: `Request failed: ${err.message}`, type: 'server_error', code: 500 } }, 500)
  }
})

// POST /v1/completions
app.post('/v1/completions', userAuthMiddleware, async (c) => {
  const state = getState()
  const startTime = Date.now()
  const userToken = c.get('userToken') as any
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: { message: 'Invalid JSON body' } }, 400) }

  if (body.model && !isValidModel(body.model)) {
    return c.json({ error: { message: `Model '${body.model}' is not supported. Use GET /v1/models to see available models.`, type: 'invalid_request_error', code: 400 } }, 400)
  }

  const key = getNextAvailableKey(state)
  if (!key) return c.json({ error: { message: 'All API keys are rate limited' } }, 429)

  key.requestCount++; key.totalRequests++; key.lastUsed = Date.now()
  userToken.requestCount++; userToken.totalRequests++

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.key}` },
      body: JSON.stringify(body),
    })

    const latency = Date.now() - startTime
    if (!response.ok) {
      const errorText = await response.text()
      key.failCount++
      addLog(state, { timestamp: startTime, model: body.model || 'unknown', keyId: key.id, userToken: userToken.token.substring(0, 20) + '...', status: response.status, latency, error: errorText })
      return new Response(errorText, { status: response.status })
    }
    addLog(state, { timestamp: startTime, model: body.model || 'unknown', keyId: key.id, userToken: userToken.token.substring(0, 20) + '...', status: 200, latency })

    if (body.stream) {
      return new Response(response.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' } })
    }
    return c.json(await response.json() as any)
  } catch (err: any) {
    return c.json({ error: { message: err.message } }, 500)
  }
})

export default app
