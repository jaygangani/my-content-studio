import { ApiError } from '@/types/api'

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
}

/**
 * Minimal typed HTTP client. Extend with auth headers / base URL
 * per environment when wiring real backends.
 */
export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...DEFAULT_HEADERS, ...init.headers },
  })

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed`)
  }

  return (await response.json()) as T
}

/** Convenience wrapper for JSON POST requests. */
export const postJson = <T>(
  path: string,
  body: unknown,
  init: RequestInit = {},
): Promise<T> =>
  http<T>(path, {
    ...init,
    method: 'POST',
    body: JSON.stringify(body),
  })