// Types for the API Router Platform

export interface NvidiaKey {
  id: string;
  key: string;
  rpm: number; // requests per minute limit
  requestCount: number;
  totalRequests: number;
  failCount: number;
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
  timestamp: number;
  model: string;
  keyId: string;
  userToken: string;
  status: number;
  latency: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  error?: string;
}

export interface AppState {
  keys: NvidiaKey[];
  userTokens: UserToken[];
  logs: RequestLog[];
  adminPassword: string;
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
  [key: string]: unknown;
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}
