// Admin API Routes
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getState, getStats, resetCountersIfNeeded } from '../lib/state'
import type { NvidiaKey, UserToken } from '../types'

const admin = new Hono()

admin.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Admin auth middleware (skip login endpoint)
admin.use('*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method

  // Allow OPTIONS preflight and login
  if (method === 'OPTIONS' || path === '/login' || path === '/admin/login') {
    await next()
    return
  }

  const auth = c.req.header('Authorization')
  const state = getState()
  const token = auth?.replace('Bearer ', '').trim()
  if (token !== state.adminPassword) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// POST /admin/login - Admin login
admin.post('/login', async (c) => {
  const body = await c.req.json() as { password: string }
  const state = getState()

  if (body.password === state.adminPassword) {
    return c.json({ success: true, token: state.adminPassword })
  }
  return c.json({ error: 'Invalid password' }, 401)
})

// GET /admin/stats
admin.get('/stats', (c) => {
  const state = getState()
  const stats = getStats(state)
  return c.json(stats)
})

// GET /admin/keys - List all NVIDIA keys
admin.get('/keys', (c) => {
  const state = getState()
  resetCountersIfNeeded(state)
  const keys = state.keys.map(k => ({
    id: k.id,
    label: k.label,
    maskedKey: k.key.substring(0, 14) + '****' + k.key.slice(-4),
    rpm: k.rpm,
    enabled: k.enabled,
    requestCount: k.requestCount,
    totalRequests: k.totalRequests,
    failCount: k.failCount,
    lastUsed: k.lastUsed,
  }))
  return c.json({ keys })
})

// POST /admin/keys - Add new key
admin.post('/keys', async (c) => {
  const state = getState()
  const body = await c.req.json() as Partial<NvidiaKey>

  if (!body.key) {
    return c.json({ error: 'key is required' }, 400)
  }

  const now = Date.now()
  const newKey: NvidiaKey = {
    id: `key${Date.now()}`,
    key: body.key,
    rpm: body.rpm || 40,
    label: body.label || `Key-${state.keys.length + 1}`,
    enabled: true,
    requestCount: 0,
    totalRequests: 0,
    failCount: 0,
    lastUsed: 0,
    lastReset: now,
  }

  state.keys.push(newKey)
  return c.json({ success: true })
})

// PATCH /admin/keys/:id - Update key (enable/disable)
admin.patch('/keys/:id', async (c) => {
  const state = getState()
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<NvidiaKey>

  const key = state.keys.find(k => k.id === id)
  if (!key) {
    return c.json({ error: 'Key not found' }, 404)
  }

  if (body.enabled !== undefined) key.enabled = body.enabled
  if (body.rpm !== undefined) key.rpm = body.rpm
  if (body.label !== undefined) key.label = body.label

  return c.json({ success: true })
})

// PUT /admin/keys/:id - Update key (full update)
admin.put('/keys/:id', async (c) => {
  const state = getState()
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<NvidiaKey>

  const key = state.keys.find(k => k.id === id)
  if (!key) {
    return c.json({ error: 'Key not found' }, 404)
  }

  if (body.enabled !== undefined) key.enabled = body.enabled
  if (body.rpm !== undefined) key.rpm = body.rpm
  if (body.label !== undefined) key.label = body.label
  if (body.key !== undefined) key.key = body.key

  return c.json({ success: true })
})

// DELETE /admin/keys/:id - Delete key
admin.delete('/keys/:id', async (c) => {
  const state = getState()
  const id = c.req.param('id')
  const idx = state.keys.findIndex(k => k.id === id)

  if (idx === -1) {
    return c.json({ error: 'Key not found' }, 404)
  }

  state.keys.splice(idx, 1)
  return c.json({ success: true })
})

// GET /admin/tokens - List user tokens
admin.get('/tokens', (c) => {
  const state = getState()
  resetCountersIfNeeded(state)
  return c.json({ tokens: state.userTokens })
})

// POST /admin/tokens - Create new user token
admin.post('/tokens', async (c) => {
  const state = getState()
  const body = await c.req.json() as Partial<UserToken>

  const now = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
  const randomToken = 'sk-' + randomSuffix

  const newToken: UserToken = {
    id: `tok${Date.now()}`,
    token: body.token || randomToken,
    name: body.name || 'New Token',
    enabled: true,
    rpmLimit: body.rpmLimit || 100,
    requestCount: 0,
    totalRequests: 0,
    lastReset: now,
    createdAt: now,
  }

  state.userTokens.push(newToken)
  return c.json({ success: true, token: newToken })
})

// PATCH /admin/tokens/:id - Update user token (enable/disable)
admin.patch('/tokens/:id', async (c) => {
  const state = getState()
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<UserToken>

  const token = state.userTokens.find(t => t.id === id)
  if (!token) return c.json({ error: 'Token not found' }, 404)

  if (body.enabled !== undefined) token.enabled = body.enabled
  if (body.rpmLimit !== undefined) token.rpmLimit = body.rpmLimit
  if (body.name !== undefined) token.name = body.name

  return c.json({ success: true })
})

// PUT /admin/tokens/:id - Update user token (full update)
admin.put('/tokens/:id', async (c) => {
  const state = getState()
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<UserToken>

  const token = state.userTokens.find(t => t.id === id)
  if (!token) return c.json({ error: 'Token not found' }, 404)

  if (body.enabled !== undefined) token.enabled = body.enabled
  if (body.rpmLimit !== undefined) token.rpmLimit = body.rpmLimit
  if (body.name !== undefined) token.name = body.name

  return c.json({ success: true })
})

// DELETE /admin/tokens/:id - Delete user token
admin.delete('/tokens/:id', async (c) => {
  const state = getState()
  const id = c.req.param('id')
  const idx = state.userTokens.findIndex(t => t.id === id)

  if (idx === -1) return c.json({ error: 'Token not found' }, 404)

  state.userTokens.splice(idx, 1)
  return c.json({ success: true })
})

// GET /admin/logs - Get request logs
admin.get('/logs', (c) => {
  const state = getState()
  const limit = parseInt(c.req.query('limit') || '100')
  const modelFilter = c.req.query('model')
  const statusFilter = c.req.query('status')

  let logs = state.logs
  if (modelFilter) logs = logs.filter(l => l.model === modelFilter)
  if (statusFilter) {
    if (statusFilter === '200') logs = logs.filter(l => String(l.status).startsWith('2'))
    else if (statusFilter === '400') logs = logs.filter(l => String(l.status).startsWith('4'))
    else if (statusFilter === '500') logs = logs.filter(l => String(l.status).startsWith('5'))
    else logs = logs.filter(l => String(l.status) === statusFilter)
  }

  return c.json({
    total: logs.length,
    logs: logs.slice(0, limit),
  })
})

// POST /admin/password - Change admin password
admin.post('/password', async (c) => {
  const state = getState()
  const body = await c.req.json() as { password: string }

  if (!body.password || body.password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  state.adminPassword = body.password
  return c.json({ success: true })
})

// PUT /admin/password - Change admin password (PUT variant)
admin.put('/password', async (c) => {
  const state = getState()
  const body = await c.req.json() as { newPassword?: string; password?: string }

  const pwd = body.newPassword || body.password
  if (!pwd || pwd.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400)
  }

  state.adminPassword = pwd
  return c.json({ success: true })
})

export default admin
