// Types for the API Router Platform

export interface EnvBindings {
  NVIDIA_API_KEYS?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_JWT_SECRET?: string;
  DEFAULT_USER_TOKEN?: string;
  DEFAULT_USER_TOKEN_RPM?: string;
  MAX_RETRY_ATTEMPTS?: string;
  KEY_COOLDOWN_MS?: string;
}

export interface NvidiaKey {
  id: string;
  key: string;
  rpm: number; // requests per minute limit
  requestCount: number;
  totalRequests: number;
  failCount: number;
  consecutiveFailures: number;
  cooldownUntil: number;
  lastUsed: number;
  lastReset: number;
  enabled: boolean;
  label: string;
}

export interface UserToken {
  id: string;
  token: string;
  name: string;
  enabled: boolean;
  rpmLimit: number;
  totalRequests: number;
  requestCount: number;
  lastReset: number;
  createdAt: number;
}

export interface RequestLog {
  id: string;
  requestId: string;
  timestamp: number;
  model: string;
  keyId: string;
  userToken: string;
  status: number;
  latency: number;
  attemptCount?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  error?: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  target?: string;
  detail?: string;
}

export interface AppState {
  keys: NvidiaKey[];
  userTokens: UserToken[];
  logs: RequestLog[];
  auditLogs: AuditLog[];
  adminPasswordHash: string;
  currentKeyIndex: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  seed?: number;
  n?: number;
  thinking?: boolean;
  enable_thinking?: boolean;
  clear_thinking?: boolean;
  chat_template_kwargs?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}
