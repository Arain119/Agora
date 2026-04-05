// In-memory state management for the API Router Platform
// Since Cloudflare Workers have isolated instances, we use global state within a session

import type { AppState, NvidiaKey, UserToken, RequestLog } from '../types'

// Default NVIDIA API Keys
const DEFAULT_KEYS: Omit<NvidiaKey, 'requestCount' | 'lastReset' | 'lastUsed' | 'failCount' | 'totalRequests'>[] = [
  { id: 'key1', key: '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', rpm: 40, enabled: true, label: 'Key-1' },
  { id: 'key2', key: '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', rpm: 40, enabled: true, label: 'Key-2' },
  { id: 'key3', key: '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', rpm: 40, enabled: true, label: 'Key-3' },
  { id: 'key4', key: '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', rpm: 40, enabled: true, label: 'Key-4' },
  { id: 'key5', key: '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', rpm: 40, enabled: true, label: 'Key-5' },
]

// Default admin token for accessing this API
const DEFAULT_USER_TOKENS: Omit<UserToken, 'requestCount' | 'lastReset' | 'totalRequests'>[] = [
  { id: 'default', token: 'sk-nvidia-router-default-2024', name: 'Default Token', enabled: true, rpmLimit: 200, createdAt: Date.now() },
]

function createInitialState(): AppState {
  const now = Date.now()
  return {
    keys: DEFAULT_KEYS.map(k => ({
      ...k,
      requestCount: 0,
      totalRequests: 0,
      failCount: 0,
      lastUsed: 0,
      lastReset: now,
    })),
    userTokens: DEFAULT_USER_TOKENS.map(t => ({
      ...t,
      requestCount: 0,
      totalRequests: 0,
      lastReset: now,
    })),
    logs: [],
    adminPassword: 'admin123456',
    currentKeyIndex: 0,
  }
}

// Global state - in Cloudflare Workers this lives for the duration of the isolate
let _state: AppState | null = null

export function getState(): AppState {
  if (!_state) {
    _state = createInitialState()
  }
  return _state
}

// Reset per-minute counters
export function resetCountersIfNeeded(state: AppState): void {
  const now = Date.now()
  const oneMinute = 60 * 1000

  // Reset key counters
  for (const key of state.keys) {
    if (now - key.lastReset >= oneMinute) {
      key.requestCount = 0
      key.lastReset = now
    }
  }

  // Reset user token counters
  for (const token of state.userTokens) {
    if (now - token.lastReset >= oneMinute) {
      token.requestCount = 0
      token.lastReset = now
    }
  }
}

// Get next available key using round-robin with rate limiting
export function getNextAvailableKey(state: AppState): NvidiaKey | null {
  resetCountersIfNeeded(state)
  
  const enabledKeys = state.keys.filter(k => k.enabled)
  if (enabledKeys.length === 0) return null

  // Find key with lowest usage ratio that hasn't hit rate limit
  let bestKey: NvidiaKey | null = null
  let bestScore = Infinity

  for (const key of enabledKeys) {
    if (key.requestCount >= key.rpm) continue // Skip rate-limited keys
    
    // Score: lower is better (prefer less used keys)
    const score = key.requestCount / key.rpm
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
  // Keep only last 500 logs
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(0, 500)
  }
}

// Validate user token
export function validateUserToken(state: AppState, token: string): UserToken | null {
  resetCountersIfNeeded(state)
  const bearerToken = token.replace('Bearer ', '').trim()
  const userToken = state.userTokens.find(t => t.token === bearerToken && t.enabled)
  if (!userToken) return null
  
  // Check rate limit
  if (userToken.requestCount >= userToken.rpmLimit) return null
  
  return userToken
}

// Get stats
export function getStats(state: AppState) {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const recentLogs = state.logs.filter(l => now - l.timestamp < oneHour)
  
  return {
    totalRequests: state.logs.length,
    requestsLastHour: recentLogs.length,
    successRate: recentLogs.length > 0 
      ? (recentLogs.filter(l => l.status === 200).length / recentLogs.length * 100).toFixed(1)
      : '100.0',
    avgLatency: recentLogs.length > 0
      ? Math.round(recentLogs.reduce((a, b) => a + b.latency, 0) / recentLogs.length)
      : 0,
    activeKeys: state.keys.filter(k => k.enabled).length,
    totalKeys: state.keys.length,
    activeTokens: state.userTokens.filter(t => t.enabled).length,
  }
}
