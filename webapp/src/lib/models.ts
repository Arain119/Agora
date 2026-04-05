// Curated model catalog - selected vendors only
export interface ModelMeta {
  id: string
  owned_by: string
  type: 'chat' | 'vision' | 'embedding' | 'rerank' | 'code' | 'reasoning' | 'multimodal' | 'safety' | 'other'
  context_length?: number
  description?: string
}

export const NVIDIA_MODELS: ModelMeta[] = [
  // ===== Google - Gemma 4 series =====
  { id: 'google/gemma-4-31b-it', owned_by: 'google', type: 'chat', context_length: 128000, description: 'Gemma 4 31B Instruct' },

  // ===== Qwen - qwen3.5 series =====
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', owned_by: 'qwen', type: 'code',      context_length: 131072, description: 'Qwen3 Coder 480B - frontier coding model' },
  { id: 'qwen/qwen3.5-122b-a10b',              owned_by: 'qwen', type: 'chat',      context_length: 131072, description: 'Qwen3.5 122B-A10B' },
  { id: 'qwen/qwen3.5-397b-a17b',              owned_by: 'qwen', type: 'chat',      context_length: 131072, description: 'Qwen3.5 397B-A17B - flagship MoE' },

  // ===== OpenAI OSS series =====
  { id: 'openai/gpt-oss-20b',  owned_by: 'openai', type: 'chat', context_length: 128000, description: 'GPT OSS 20B - OpenAI open-source model' },
  { id: 'openai/gpt-oss-120b', owned_by: 'openai', type: 'chat', context_length: 128000, description: 'GPT OSS 120B - OpenAI open-source flagship' },

  // ===== Moonshotai - all models =====
  { id: 'moonshotai/kimi-k2-instruct',      owned_by: 'moonshotai', type: 'chat',      context_length: 131072, description: 'Kimi K2 Instruct - Moonshot flagship chat' },
  { id: 'moonshotai/kimi-k2-instruct-0905', owned_by: 'moonshotai', type: 'chat',      context_length: 131072, description: 'Kimi K2 Instruct 0905 - updated version' },
  { id: 'moonshotai/kimi-k2-thinking',      owned_by: 'moonshotai', type: 'reasoning', context_length: 131072, description: 'Kimi K2 Thinking - extended reasoning' },
  { id: 'moonshotai/kimi-k2.5',             owned_by: 'moonshotai', type: 'chat',      context_length: 131072, description: 'Kimi K2.5 - latest Moonshot model' },

  // ===== Stepfun - all models =====
  { id: 'stepfun-ai/step-3.5-flash', owned_by: 'stepfun-ai', type: 'chat', context_length: 32000, description: 'Step 3.5 Flash - StepFun fast inference model' },

  // ===== Minimaxai - all models =====
  { id: 'minimaxai/minimax-m2.5', owned_by: 'minimaxai', type: 'chat', context_length: 1000000, description: 'MiniMax M2.5 - long-context model (1M tokens)' },

  // ===== DeepSeek - non-distill series only =====
  { id: 'deepseek-ai/deepseek-v3.1',          owned_by: 'deepseek-ai', type: 'chat', context_length: 131072, description: 'DeepSeek V3.1 - frontier MoE chat model' },
  { id: 'deepseek-ai/deepseek-v3.1-terminus', owned_by: 'deepseek-ai', type: 'chat', context_length: 131072, description: 'DeepSeek V3.1 Terminus - enhanced version' },
  { id: 'deepseek-ai/deepseek-v3.2',          owned_by: 'deepseek-ai', type: 'chat', context_length: 131072, description: 'DeepSeek V3.2 - latest DeepSeek chat model' },

  // ===== Z-AI - all models =====
  { id: 'z-ai/glm4.7', owned_by: 'z-ai', type: 'chat', context_length: 128000, description: 'GLM 4.7 - Z-AI latest GLM model with reasoning' },
  { id: 'z-ai/glm5',   owned_by: 'z-ai', type: 'chat', context_length: 128000, description: 'GLM 5 - Z-AI next generation model' },
]

export function getModelList() {
  const seen = new Set<string>()
  return NVIDIA_MODELS
    .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
    .map(m => ({
      id: m.id,
      object: 'model',
      created: 1706745938,
      owned_by: m.owned_by,
      type: m.type,
      context_length: m.context_length,
      description: m.description,
    }))
}

export function isValidModel(modelId: string): boolean {
  return NVIDIA_MODELS.some(m => m.id === modelId)
}

export function getModelType(modelId: string): string {
  return NVIDIA_MODELS.find(m => m.id === modelId)?.type ?? 'chat'
}

export function isVisionModel(modelId: string): boolean {
  const m = NVIDIA_MODELS.find(m => m.id === modelId)
  return m?.type === 'vision' || m?.type === 'multimodal'
}

export function getProviders(): string[] {
  const providers = new Set<string>()
  NVIDIA_MODELS.forEach(m => providers.add(m.owned_by))
  return Array.from(providers).sort()
}
