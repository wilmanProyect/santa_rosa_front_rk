import { env } from '@/shared/config/env'
import { ApiError } from './api-error'

/**
 * Lo que el cliente HTTP necesita de la sesión. Lo registra la feature `auth`
 * con `configureHttpAuth`, así `shared` no depende de ninguna feature.
 */
export interface HttpAuthHandlers {
  getAccessToken(): string | null
  /** Renueva el access token. Devuelve el nuevo o null si la sesión terminó. */
  refreshAccessToken(): Promise<string | null>
  onSessionExpired(): void
}

let authHandlers: HttpAuthHandlers | null = null
let refreshInFlight: Promise<string | null> | null = null

export function configureHttpAuth(handlers: HttpAuthHandlers) {
  authHandlers = handlers
}

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  /** false para endpoints públicos (login, refresh). */
  auth?: boolean
  signal?: AbortSignal
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options
  let response = await send(path, options, auth ? authHandlers?.getAccessToken() : null)

  if (response.status === 401 && auth && authHandlers) {
    const newToken = await refreshOnce()
    if (newToken) {
      response = await send(path, options, newToken)
    }
    if (response.status === 401) {
      authHandlers.onSessionExpired()
    }
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  const contentType = response.headers.get('content-type') ?? ''
  return (contentType.includes('application/json') ? response.json() : response.text()) as Promise<T>
}

/** Varias peticiones que reciben 401 a la vez comparten un único refresh. */
function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= authHandlers!
    .refreshAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

function send(path: string, options: RequestOptions, token: string | null | undefined) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${env.apiUrl}${path}${qs ? `?${qs}` : ''}`
}
