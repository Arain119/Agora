#!/usr/bin/env node

const BASE_URL = (process.env.BASE_URL || 'https://3000-i3278fd5io2xk8wog1shy-18e660f9.sandbox.novita.ai').replace(/\/$/, '')
const API_KEY = process.env.API_KEY || 'sk-nvidia-router-default-2024'

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
}

function buildPayload(model, stream = false) {
  const marker = `forwarding-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    model,
    messages: [
      { role: 'system', content: 'You are a concise assistant.' },
      { role: 'user', content: `Reply with exactly: ${marker}` },
    ],
    max_tokens: 24,
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: ['\n\n'],
    seed: 123,
    user: 'forwarding-tester',
    stream,
  }

  // Model-specific thinking options based on NVIDIA Build's "View Code" examples.
  if (model.startsWith('moonshotai/kimi-k2.5') || model.startsWith('deepseek-ai/deepseek-v3')) {
    payload.thinking = true
  } else if (model.startsWith('qwen/qwen3.5-') || model.startsWith('z-ai/glm') || model.startsWith('google/gemma-4')) {
    payload.enable_thinking = true
    if (model.startsWith('z-ai/glm')) {
      payload.clear_thinking = false
    }
  }

  return payload
}

async function fetchModels() {
  const res = await fetch(`${BASE_URL}/v1/models`)
  if (!res.ok) {
    throw new Error(`/v1/models failed: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return (data.data || []).map((m) => m.id)
}

async function testNonStream(model) {
  const payload = buildPayload(model, false)
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  if (!res.ok) {
    return { ok: false, status: res.status, detail: text.slice(0, 300) }
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, status: res.status, detail: 'non-JSON response' }
  }

  const hasChoice = Array.isArray(parsed.choices) && parsed.choices.length > 0
  return { ok: hasChoice, status: res.status, detail: hasChoice ? 'ok' : 'missing choices' }
}

async function testStream(model) {
  const payload = buildPayload(model, true)
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok || !res.body) {
    return { ok: false, status: res.status, detail: (await res.text()).slice(0, 300) }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let combined = ''
  const deadline = Date.now() + 15000

  while (Date.now() < deadline && combined.length < 4000) {
    const { value, done } = await reader.read()
    if (done) break
    combined += decoder.decode(value, { stream: true })
    if (combined.includes('data: [DONE]') || combined.includes('data: {')) {
      break
    }
  }

  reader.cancel().catch(() => {})
  const looksLikeSSE = combined.includes('data: ')
  return { ok: looksLikeSSE, status: res.status, detail: looksLikeSSE ? 'ok' : 'no SSE data received' }
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`)
  const models = await fetchModels()
  if (models.length === 0) {
    throw new Error('No models found from /v1/models')
  }

  console.log(`Discovered models: ${models.length}`)
  const failures = []

  for (const [index, model] of models.entries()) {
    console.log(`\n[${index + 1}/${models.length}] Testing ${model}`)

    const nonStream = await testNonStream(model)
    console.log(`  non-stream: ${nonStream.ok ? 'PASS' : 'FAIL'} (${nonStream.status}) ${nonStream.detail}`)
    if (!nonStream.ok) failures.push({ model, mode: 'non-stream', ...nonStream })

    const stream = await testStream(model)
    console.log(`  stream    : ${stream.ok ? 'PASS' : 'FAIL'} (${stream.status}) ${stream.detail}`)
    if (!stream.ok) failures.push({ model, mode: 'stream', ...stream })
  }

  console.log('\n===== SUMMARY =====')
  console.log(`Total checks: ${models.length * 2}`)
  console.log(`Failures    : ${failures.length}`)

  if (failures.length > 0) {
    for (const f of failures) {
      console.log(`- ${f.model} [${f.mode}] -> ${f.status}: ${f.detail}`)
    }
    process.exit(1)
  }

  console.log('All models passed non-stream and stream forwarding checks.')
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
