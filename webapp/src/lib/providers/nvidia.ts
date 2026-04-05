import type { ChatCompletionRequest } from '../../types'

const BASE_URL = 'https://integrate.api.nvidia.com/v1'

export interface UpstreamResult {
  response: Response;
  attempts: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

export class NvidiaProviderService {
  constructor(private readonly apiKey: string, private readonly maxRetryAttempts: number) {}

  async chatCompletion(payload: ChatCompletionRequest, isStream: boolean): Promise<UpstreamResult> {
    return this.fetchWithRetry('/chat/completions', payload, isStream)
  }

  async completion(payload: unknown, isStream: boolean): Promise<UpstreamResult> {
    return this.fetchWithRetry('/completions', payload, isStream)
  }

  private async fetchWithRetry(path: string, payload: unknown, isStream: boolean): Promise<UpstreamResult> {
    let attempts = 0
    let lastResponse: Response | null = null

    while (attempts <= this.maxRetryAttempts) {
      attempts += 1
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': isStream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!shouldRetry(response.status) || attempts > this.maxRetryAttempts) {
        return { response, attempts }
      }

      lastResponse = response
      await sleep(Math.min(1200, attempts * 250))
    }

    return { response: lastResponse as Response, attempts }
  }
}
