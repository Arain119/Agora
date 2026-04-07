export const DEFAULT_ALLOWED_MODELS = [
  // Gemma4
  'google/gemma-4-31b-it',
  // Gemma3 (non-thinking)
  'google/gemma-3-27b-it',

  // Qwen
  'qwen/qwen3-coder-480b-a35b-instruct',
  'qwen/qwen3.5-122b-a10b',
  'qwen/qwen3.5-397b-a17b',

  // GPT-OSS
  'openai/gpt-oss-120b',

  // Kimi
  'moonshotai/kimi-k2-instruct',
  'moonshotai/kimi-k2-instruct-0905',
  'moonshotai/kimi-k2-thinking',
  'moonshotai/kimi-k2.5',

  // StepFun
  'stepfun-ai/step-3.5-flash',

  // MiniMax
  'minimaxai/minimax-m2.5',

  // DeepSeek
  'deepseek-ai/deepseek-v3.1',
  'deepseek-ai/deepseek-v3.1-terminus',
  'deepseek-ai/deepseek-v3.2',

  // GLM
  'z-ai/glm4.7',
  'z-ai/glm5'
];

export function getAllowedModels(): string[] {
  const raw = process.env.ALLOWED_MODELS;
  if (!raw) return DEFAULT_ALLOWED_MODELS;

  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_MODELS;
}

export function isModelAllowlistEnforced(): boolean {
  const raw = String(process.env.MODEL_ALLOWLIST_ENFORCED || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
