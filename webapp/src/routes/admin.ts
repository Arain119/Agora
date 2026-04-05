// Admin API Routes
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { addAuditLog, getMetrics, getState, getStats, resetCountersIfNeeded, updateAdminPassword, verifyAdminPassword } from '../lib/state'
import { signAdminJwt, verifyAdminJwt } from '../lib/auth'
import type { NvidiaKey, UserToken, EnvBindings } from '../types'

const admin = new Hono<{ Bindings: EnvBindings }>()

admin.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Admin auth middleware (skip login endpoint)
admin.use('*', async (c, next) => {
  const path = c.req.path
  const method = c.req.method

  if (method === 'OPTIONS' || path === '/login' || path === '/admin/login') {
    await next()
    return
  }

  const auth = c.req.header('Authorization')
  const token = auth?.replace('Bearer ', '').trim()
  const secret = c.env.ADMIN_JWT_SECRET || 'nvidia-router-admin-jwt-secret'

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const result = await verifyAdminJwt(token, secret)
  if (!result.ok) {
    return c.json({ error: 'Unauthorized', reason: result.reason }, 401)
  }

  c.set('adminSub', result.sub || 'admin')
  await next()
})

// POST /admin/login - Admin login
admin.post('/login', async (c) => {
  const body = await c.req.json() as { password: string }
  const state = await getState(c.env)

  if (await verifyAdminPassword(state, body.password)) {
    const secret = c.env.ADMIN_JWT_SECRET || 'nvidia-router-admin-jwt-secret'
    const jwt = await signAdminJwt('admin', secret)
    addAuditLog(state, { actor: 'admin', action: 'admin.login', detail: 'JWT issued' })
    return c.json({ success: true, token: jwt, expiresInSeconds: 8 * 60 * 60 })
  }
  return c.json({ error: 'Invalid password' }, 401)
})

// GET /admin/stats
admin.get('/stats', async (c) => {
  const state = await getState(c.env)
  const stats = getStats(state)
  return c.json(stats)
})

admin.get('/metrics', async (c) => {
  const state = await getState(c.env)
  return c.json(getMetrics(state))
})

// GET /admin/keys - List all NVIDIA keys
admin.get('/keys', async (c) => {
  const state = await getState(c.env)
  resetCountersIfNeeded(state)
  const keys = state.keys.map((k) => ({
    id: k.id,
    label: k.label,
    maskedKey: k.key.length > 18 ? k.key.substring(0, 14) + '****' + k.key.slice(-4) : '****',
    rpm: k.rpm,
    enabled: k.enabled,
    requestCount: k.requestCount,
    totalRequests: k.totalRequests,
    failCount: k.failCount,
    consecutiveFailures: k.consecutiveFailures,
    cooldownUntil: k.cooldownUntil,
    lastUsed: k.lastUsed,
  }))
  return c.json({ keys })
})

// POST /admin/keys - Add new key
admin.post('/keys', async (c) => {
  const state = await getState(c.env)
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
    consecutiveFailures: 0,
    cooldownUntil: 0,
    lastUsed: 0,
    lastReset: now,
  }

  state.keys.push(newKey)
  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'key.create', target: newKey.id })
  return c.json({ success: true })
})

// PATCH /admin/keys/:id - Update key (enable/disable)
admin.patch('/keys/:id', async (c) => {
  const state = await getState(c.env)
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<NvidiaKey>

  const key = state.keys.find((k) => k.id === id)
  if (!key) {
    return c.json({ error: 'Key not found' }, 404)
  }

  if (body.enabled !== undefined) key.enabled = body.enabled
  if (body.rpm !== undefined) key.rpm = body.rpm
  if (body.label !== undefined) key.label = body.label

  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'key.patch', target: id })
  return c.json({ success: true })
})

admin.put('/keys/:id', async (c) => {
  const state = await getState(c.env)
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<NvidiaKey>

  const key = state.keys.find((k) => k.id === id)
  if (!key) {
    return c.json({ error: 'Key not found' }, 404)
  }

  if (body.enabled !== undefined) key.enabled = body.enabled
  if (body.rpm !== undefined) key.rpm = body.rpm
  if (body.label !== undefined) key.label = body.label
  if (body.key !== undefined) key.key = body.key

  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'key.put', target: id })
  return c.json({ success: true })
})

admin.delete('/keys/:id', async (c) => {
  const state = await getState(c.env)
  const id = c.req.param('id')
  const idx = state.keys.findIndex((k) => k.id === id)

  if (idx === -1) {
    return c.json({ error: 'Key not found' }, 404)
  }

  state.keys.splice(idx, 1)
  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'key.delete', target: id })
  return c.json({ success: true })
})

admin.get('/tokens', async (c) => {
  const state = await getState(c.env)
  resetCountersIfNeeded(state)
  return c.json({ tokens: state.userTokens })
})

admin.post('/tokens', async (c) => {
  const state = await getState(c.env)
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
  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'token.create', target: newToken.id })
  return c.json({ success: true, token: newToken })
})

admin.patch('/tokens/:id', async (c) => {
  const state = await getState(c.env)
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<UserToken>

  const token = state.userTokens.find((t) => t.id === id)
  if (!token) return c.json({ error: 'Token not found' }, 404)

  if (body.enabled !== undefined) token.enabled = body.enabled
  if (body.rpmLimit !== undefined) token.rpmLimit = body.rpmLimit
  if (body.name !== undefined) token.name = body.name

  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'token.patch', target: id })
  return c.json({ success: true })
})

admin.put('/tokens/:id', async (c) => {
  const state = await getState(c.env)
  const id = c.req.param('id')
  const body = await c.req.json() as Partial<UserToken>

  const token = state.userTokens.find((t) => t.id === id)
  if (!token) return c.json({ error: 'Token not found' }, 404)

  if (body.enabled !== undefined) token.enabled = body.enabled
  if (body.rpmLimit !== undefined) token.rpmLimit = body.rpmLimit
  if (body.name !== undefined) token.name = body.name

  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'token.put', target: id })
  return c.json({ success: true })
})

admin.delete('/tokens/:id', async (c) => {
  const state = await getState(c.env)
  const id = c.req.param('id')
  const idx = state.userTokens.findIndex((t) => t.id === id)

  if (idx === -1) return c.json({ error: 'Token not found' }, 404)

  state.userTokens.splice(idx, 1)
  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'token.delete', target: id })
  return c.json({ success: true })
})

admin.get('/logs', async (c) => {
  const state = await getState(c.env)
  const limit = Math.min(1000, Math.max(1, parseInt(c.req.query('limit') || '100', 10)))
  const modelFilter = c.req.query('model')
  const statusFilter = c.req.query('status')

  let logs = state.logs
  if (modelFilter) logs = logs.filter((l) => l.model === modelFilter)
  if (statusFilter) {
    if (statusFilter === '200') logs = logs.filter((l) => String(l.status).startsWith('2'))
    else if (statusFilter === '400') logs = logs.filter((l) => String(l.status).startsWith('4'))
    else if (statusFilter === '500') logs = logs.filter((l) => String(l.status).startsWith('5'))
    else logs = logs.filter((l) => String(l.status) === statusFilter)
  }

  return c.json({
    total: logs.length,
    logs: logs.slice(0, limit),
  })
})

admin.get('/audit-logs', async (c) => {
  const state = await getState(c.env)
  const limit = Math.min(500, Math.max(1, parseInt(c.req.query('limit') || '100', 10)))
  return c.json({ total: state.auditLogs.length, logs: state.auditLogs.slice(0, limit) })
})

admin.post('/password', async (c) => {
  const state = await getState(c.env)
  const body = await c.req.json() as { password: string }

  if (!body.password || body.password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  await updateAdminPassword(state, body.password)
  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'admin.password.update' })
  return c.json({ success: true })
})

admin.put('/password', async (c) => {
  const state = await getState(c.env)
  const body = await c.req.json() as { newPassword?: string; password?: string }

  const pwd = body.newPassword || body.password
  if (!pwd || pwd.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400)
  }

  await updateAdminPassword(state, pwd)
  addAuditLog(state, { actor: c.get('adminSub') as string || 'admin', action: 'admin.password.update' })
  return c.json({ success: true })
})

export default admin
