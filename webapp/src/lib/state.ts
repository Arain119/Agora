// In-memory state management for the API Router Platform
// Since Cloudflare Workers have isolated instances, we use global state within a session

import type { AppState, NvidiaKey, UserToken, RequestLog, AuditLog, EnvBindings } from '../types'
import { sha256Hex } from './auth'

function parseNvidiaKeys(env?: EnvBindings): string[] {
  const raw = env?.NVIDIA_API_KEYS?.trim()
  if (!raw) return []
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
}

async function createInitialState(env?: EnvBindings): Promise<AppState> {
  const now = Date.now()
  const configuredKeys = parseNvidiaKeys(env)

  const keys: NvidiaKey[] = configuredKeys.map((key, idx) => ({
    id: `key${idx + 1}`,
    key,
    rpm: 40,
    enabled: true,
    label: `Key-${idx + 1}`,
    requestCount: 0,
    totalRequests: 0,
    failCount: 0,
    consecutiveFailures: 0,
    cooldownUntil: 0,
    lastUsed: 0,
    lastReset: now,
  }))

  const defaultToken = env?.DEFAULT_USER_TOKEN?.trim() || 'sk-nvidia-router-default'
  const defaultTokenRPM = Math.max(1, Number.parseInt(env?.DEFAULT_USER_TOKEN_RPM || '200', 10) || 200)
  const userTokens: UserToken[] = [{
    id: 'default',
    token: defaultToken,
    name: 'Default Token',
    enabled: true,
    rpmLimit: defaultTokenRPM,
    requestCount: 0,
    totalRequests: 0,
    lastReset: now,
    createdAt: now,
  }]

  const adminPassword = env?.ADMIN_PASSWORD?.trim() || 'admin123456'

  return {
    keys,
    userTokens,
    logs: [],
    auditLogs: [],
    adminPasswordHash: await sha256Hex(adminPassword),
    currentKeyIndex: 0,
  }
}

// Global state - in Cloudflare Workers this lives for the duration of the isolate
let _state: AppState | null = null
let _stateInitPromise: Promise<AppState> | null = null

export async function getState(env?: EnvBindings): Promise<AppState> {
  if (_state) return _state

  if (!_stateInitPromise) {
    _stateInitPromise = createInitialState(env).then((state) => {
      _state = state
      return state
    })
  }

  return _stateInitPromise
}

// Reset per-minute counters
export function resetCountersIfNeeded(state: AppState): void {
  const now = Date.now()
  const oneMinute = 60 * 1000

  for (const key of state.keys) {
    if (now - key.lastReset >= oneMinute) {
      key.requestCount = 0
      key.lastReset = now
    }
  }

  for (const token of state.userTokens) {
    if (now - token.lastReset >= oneMinute) {
      token.requestCount = 0
      token.lastReset = now
    }
  }
}

function keyLatencyPenalty(state: AppState, keyId: string): number {
  const recent = state.logs.filter((l) => l.keyId === keyId).slice(0, 30)
  if (recent.length === 0) return 0
  const avgLatency = recent.reduce((sum, row) => sum + row.latency, 0) / recent.length
  return Math.min(1, avgLatency / 4000)
}

export function markKeyFailure(key: NvidiaKey, cooldownMs: number): void {
  key.failCount += 1
  key.consecutiveFailures += 1
  if (key.consecutiveFailures >= 3) {
    key.cooldownUntil = Date.now() + cooldownMs
  }
}

export function markKeySuccess(key: NvidiaKey): void {
  key.consecutiveFailures = 0
  key.cooldownUntil = 0
}

// Get next available key using weighted health score
export function getNextAvailableKey(state: AppState): NvidiaKey | null {
  resetCountersIfNeeded(state)
  const now = Date.now()

  const enabledKeys = state.keys.filter((k) => k.enabled)
  if (enabledKeys.length === 0) return null

  let bestKey: NvidiaKey | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const key of enabledKeys) {
    if (key.requestCount >= key.rpm) continue
    if (key.cooldownUntil > now) continue

    const usage = key.requestCount / Math.max(1, key.rpm)
    const failRate = key.totalRequests > 0 ? key.failCount / key.totalRequests : 0
    const latencyPenalty = keyLatencyPenalty(state, key.id)
    const cooldownPenalty = key.consecutiveFailures >= 2 ? 0.5 : 0

    const score = usage * 0.55 + failRate * 0.3 + latencyPenalty * 0.1 + cooldownPenalty * 0.05
    if (score < bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  return bestKey
}

// Log a request
export function addLog(state: AppState, log: Omit<RequestLog, 'id'>): void {
  const entry: RequestLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 11),
  }
  state.logs.unshift(entry)
  if (state.logs.length > 2000) {
    state.logs = state.logs.slice(0, 2000)
  }
}

export function addAuditLog(state: AppState, log: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const entry: AuditLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
  }
  state.auditLogs.unshift(entry)
  if (state.auditLogs.length > 1000) {
    state.auditLogs = state.auditLogs.slice(0, 1000)
  }
}

// Validate user token
export function validateUserToken(state: AppState, token: string): UserToken | null {
  resetCountersIfNeeded(state)
  const bearerToken = token.replace('Bearer ', '').trim()
  const userToken = state.userTokens.find((t) => t.token === bearerToken && t.enabled)
  if (!userToken) return null
  if (userToken.requestCount >= userToken.rpmLimit) return null
  return userToken
}

export async function verifyAdminPassword(state: AppState, password: string): Promise<boolean> {
  return (await sha256Hex(password)) === state.adminPasswordHash
}

export async function updateAdminPassword(state: AppState, password: string): Promise<void> {
  state.adminPasswordHash = await sha256Hex(password)
}

// Get stats
export function getStats(state: AppState) {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const recentLogs = state.logs.filter((l) => now - l.timestamp < oneHour)

  return {
    totalRequests: state.logs.length,
    requestsLastHour: recentLogs.length,
    successRate: recentLogs.length > 0
      ? (recentLogs.filter((l) => l.status >= 200 && l.status < 300).length / recentLogs.length * 100).toFixed(1)
      : '100.0',
    avgLatency: recentLogs.length > 0
      ? Math.round(recentLogs.reduce((a, b) => a + b.latency, 0) / recentLogs.length)
      : 0,
    activeKeys: state.keys.filter((k) => k.enabled).length,
    totalKeys: state.keys.length,
    activeTokens: state.userTokens.filter((t) => t.enabled).length,
  }
}

export function getMetrics(state: AppState) {
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  const recent = state.logs.filter((l) => now - l.timestamp <= fiveMinutes)
  const success = recent.filter((l) => l.status >= 200 && l.status < 300).length
  const p95 = (() => {
    if (recent.length === 0) return 0
    const sorted = recent.map((r) => r.latency).sort((a, b) => a - b)
    return sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)]
  })()

  return {
    windowMinutes: 5,
    requestCount: recent.length,
    successRate: recent.length ? Number(((success / recent.length) * 100).toFixed(2)) : 100,
    p95Latency: p95,
    keyHealth: state.keys.map((k) => ({
      keyId: k.id,
      enabled: k.enabled,
      cooldownUntil: k.cooldownUntil,
      failRate: k.totalRequests > 0 ? Number((k.failCount / k.totalRequests).toFixed(4)) : 0,
      rpmUsage: Number((k.requestCount / Math.max(1, k.rpm)).toFixed(4)),
      consecutiveFailures: k.consecutiveFailures,
    })),
  }
}
