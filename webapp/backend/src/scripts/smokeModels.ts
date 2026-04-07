import { createUserTokenForUser, deleteUserToken } from '../store';

type SmokeModel = {
  id: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  includeClearThinking?: boolean;
};

const MODELS: SmokeModel[] = [
  { id: 'google/gemma-3-27b-it', maxTokens: 128, temperature: 1, topP: 0.95 },
  { id: 'google/gemma-4-31b-it', maxTokens: 128, temperature: 1, topP: 0.95 },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', maxTokens: 128, temperature: 0.6, topP: 0.95 },
  { id: 'qwen/qwen3.5-122b-a10b', maxTokens: 128, temperature: 0.6, topP: 0.95 },
  { id: 'qwen/qwen3.5-397b-a17b', maxTokens: 128, temperature: 0.6, topP: 0.95 },
  { id: 'openai/gpt-oss-120b', maxTokens: 128, temperature: 1, topP: 1 },
  { id: 'moonshotai/kimi-k2-instruct', maxTokens: 128, temperature: 0.6, topP: 0.9 },
  { id: 'moonshotai/kimi-k2-instruct-0905', maxTokens: 128, temperature: 0.6, topP: 0.9 },
  { id: 'moonshotai/kimi-k2-thinking', maxTokens: 128, temperature: 1, topP: 0.9 },
  { id: 'moonshotai/kimi-k2.5', maxTokens: 128, temperature: 1, topP: 1 },
  { id: 'stepfun-ai/step-3.5-flash', maxTokens: 128, temperature: 1, topP: 0.9 },
  { id: 'minimaxai/minimax-m2.5', maxTokens: 128, temperature: 1, topP: 0.95 },
  { id: 'deepseek-ai/deepseek-v3.1', maxTokens: 128, temperature: 1, topP: 0.95 },
  { id: 'deepseek-ai/deepseek-v3.1-terminus', maxTokens: 128, temperature: 1, topP: 0.95 },
  { id: 'deepseek-ai/deepseek-v3.2', maxTokens: 128, temperature: 1, topP: 0.95 },
  { id: 'z-ai/glm4.7', maxTokens: 128, temperature: 1, topP: 1, includeClearThinking: true },
  { id: 'z-ai/glm5', maxTokens: 128, temperature: 1, topP: 1, includeClearThinking: true }
];

type ToggleKey = 'thinking' | 'enable_thinking';
const TOGGLE_KEYS: ToggleKey[] = ['thinking', 'enable_thinking'];

function getSelectedModels(): SmokeModel[] {
  const raw = process.env.SMOKE_MODELS;
  if (!raw || !raw.trim()) return MODELS;

  const wanted = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const selected = MODELS.filter((m) => wanted.has(m.id));
  if (selected.length === 0) {
    console.error(`No models matched SMOKE_MODELS=${raw}`);
  }
  return selected;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGateway(baseUrl: string, token: string, body: any) {
  const timeoutMsRaw = process.env.SMOKE_TIMEOUT_MS;
  const timeoutMs = timeoutMsRaw && timeoutMsRaw.trim() ? Math.max(1000, Number(timeoutMsRaw)) : 60_000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (body?.stream === true) {
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return { status: response.status, text };
      }

      const decoder = new TextDecoder();
      let acc = '';
      while (acc.length < 4096) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (acc.includes('\n\n') && acc.includes('data:')) break;
      }
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      return { status: response.status, text: acc };
    }

    const text = await response.text();
    return { status: response.status, text };
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : String(e?.message || e);
    return { status: 0, text: message };
  } finally {
    clearTimeout(timeout);
  }
}

function compact(s: string, maxLen = 120) {
  const v = String(s || '').replace(/\s+/g, ' ').trim();
  return v.length > maxLen ? `${v.slice(0, maxLen)}...` : v;
}

async function main() {
  const baseUrl = process.env.AGORA_GATEWAY_URL || 'http://127.0.0.1:3001';
  const smokeStreamRaw = String(process.env.SMOKE_STREAM || '').trim().toLowerCase();
  const smokeStream = smokeStreamRaw === '1' || smokeStreamRaw === 'true' || smokeStreamRaw === 'yes' || smokeStreamRaw === 'on';

  const created = createUserTokenForUser('usr_admin', `smoke_${Date.now()}`);
  const token = created.token;

  const results: Array<{ model: string; toggleKey: ToggleKey; status: number; note: string }> = [];

  try {
    const selectedModels = getSelectedModels();
    const total = selectedModels.length * TOGGLE_KEYS.length;
    let done = 0;
    for (const model of selectedModels) {
      for (const toggleKey of TOGGLE_KEYS) {
        done++;
        console.log(`[${done}/${total}] ${model.id} (${toggleKey}=true)`);
        const body: any = {
          model: model.id,
          messages: [
            {
              role: 'user',
              content: `Reply with: ok (${model.id}). Keep it short.`
            }
          ],
          max_tokens: model.maxTokens,
          temperature: model.temperature,
          top_p: model.topP,
          stream: smokeStream
        };

        // We purposely send the toggle as a top-level key to validate that
        // Agora will normalize it into the correct chat_template_kwargs per model.
        body[toggleKey] = true;
        if (model.includeClearThinking) body.clear_thinking = false;

        const { status, text } = await callGateway(baseUrl, token, body);
        let note = '';
        try {
          const parsed = JSON.parse(text);
          note = parsed?.choices?.[0]?.message?.content
            ? String(parsed.choices[0].message.content)
            : parsed?.error?.message
              ? String(parsed.error.message)
              : compact(text);
        } catch {
          note = compact(text);
        }

        results.push({ model: model.id, toggleKey, status, note: compact(note) });
        console.log(`  -> ${status} ${compact(note)}`);
        // Light throttle to avoid spiky upstream throttling.
        await sleep(200);
      }
    }
  } finally {
    deleteUserToken(created.id, 'usr_admin');
  }

  const failed = results.filter((r) => r.status !== 200);
  if (failed.length > 0) {
    console.error('FAILED:');
    for (const f of failed) {
      console.error(`${f.model} [${f.toggleKey}] => ${f.status} | ${f.note}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('OK: all model smoke tests returned 200');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
