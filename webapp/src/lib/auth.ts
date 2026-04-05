const te = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let str = ''
  bytes.forEach((b) => { str += String.fromCharCode(b) })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacSha256(content: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, te.encode(content))
  return toBase64Url(new Uint8Array(signature))
}

export async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', te.encode(input))
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signAdminJwt(subject: string, secret: string, expiresInSeconds = 8 * 60 * 60): Promise<string> {
  const header = toBase64Url(te.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = toBase64Url(te.encode(JSON.stringify({ sub: subject, role: 'admin', iat: now, exp: now + expiresInSeconds })))
  const unsigned = `${header}.${payload}`
  const signature = await hmacSha256(unsigned, secret)
  return `${unsigned}.${signature}`
}

export async function verifyAdminJwt(token: string, secret: string): Promise<{ ok: boolean; reason?: string; sub?: string }> {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed_token' }

  const [headerB64, payloadB64, providedSig] = parts
  const unsigned = `${headerB64}.${payloadB64}`
  const expectedSig = await hmacSha256(unsigned, secret)

  if (providedSig !== expectedSig) return { ok: false, reason: 'invalid_signature' }

  try {
    const payloadRaw = new TextDecoder().decode(fromBase64Url(payloadB64))
    const payload = JSON.parse(payloadRaw) as { exp?: number; role?: string; sub?: string }

    if (payload.role !== 'admin') return { ok: false, reason: 'invalid_role' }
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'token_expired' }
    return { ok: true, sub: payload.sub }
  } catch {
    return { ok: false, reason: 'invalid_payload' }
  }
}
