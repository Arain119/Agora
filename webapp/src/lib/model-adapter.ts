import type { ChatCompletionRequest } from '../types'

type ChatTemplateKwargs = Record<string, unknown>
type ThinkingStrategy = 'unsupported' | 'thinking' | 'enable_thinking' | 'enable_with_clear'

function withChatTemplateKwargs(body: ChatCompletionRequest): ChatTemplateKwargs {
  const current = (body.chat_template_kwargs ?? {}) as ChatTemplateKwargs
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    return { ...current }
  }
  return {}
}

function resolveThinkingStrategy(model: string): ThinkingStrategy {
  if (model.startsWith('z-ai/glm')) return 'enable_with_clear'
  if (model.startsWith('qwen/qwen3.5-') || model.startsWith('google/gemma-4')) return 'enable_thinking'
  if (model.startsWith('deepseek-ai/deepseek-v3') || model.startsWith('moonshotai/kimi-k2.5')) return 'thinking'
  return 'unsupported'
}

function stripUnsupportedThinkingFields(kwargs: ChatTemplateKwargs): ChatTemplateKwargs {
  const cleaned = { ...kwargs }
  delete cleaned.thinking
  delete cleaned.enable_thinking
  delete cleaned.clear_thinking
  return cleaned
}

function adaptThinkingParam(model: string, body: ChatCompletionRequest): ChatCompletionRequest {
  const hasThinking = typeof body.thinking === 'boolean' || typeof body.enable_thinking === 'boolean'
  const hasClearThinking = typeof body.clear_thinking === 'boolean'
  if (!hasThinking && !hasClearThinking) {
    return body
  }

  const payload: ChatCompletionRequest = { ...body }
  const strategy = resolveThinkingStrategy(model)
  const kwargs = withChatTemplateKwargs(payload)
  const requestedThinking = typeof body.thinking === 'boolean' ? body.thinking : body.enable_thinking

  if (strategy === 'unsupported') {
    // For models without documented thinking controls (e.g. gpt-oss, kimi-k2-thinking, kimi-k2-instruct, qwen3-coder),
    // drop thinking toggles to avoid upstream schema errors.
    if (payload.chat_template_kwargs) {
      payload.chat_template_kwargs = stripUnsupportedThinkingFields(kwargs)
    }
    delete payload.thinking
    delete payload.enable_thinking
    delete payload.clear_thinking
    return payload
  }

  if (typeof requestedThinking === 'boolean') {
    if (strategy === 'thinking') kwargs.thinking = requestedThinking
    if (strategy === 'enable_thinking' || strategy === 'enable_with_clear') kwargs.enable_thinking = requestedThinking
  }

  if (strategy === 'enable_with_clear' && typeof body.clear_thinking === 'boolean') {
    kwargs.clear_thinking = body.clear_thinking
  } else if (strategy === 'enable_with_clear' && kwargs.enable_thinking === true && kwargs.clear_thinking === undefined) {
    // Align with GLM "View Code" sample behavior.
    kwargs.clear_thinking = false
  }

  payload.chat_template_kwargs = kwargs
  delete payload.thinking
  delete payload.enable_thinking
  delete payload.clear_thinking
  return payload
}

export function adaptChatRequestByModel(body: ChatCompletionRequest): ChatCompletionRequest {
  const model = body.model || ''
  return adaptThinkingParam(model, body)
}
