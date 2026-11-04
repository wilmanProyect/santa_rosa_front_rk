import { env } from '@/shared/config/env'
import { ApiError, type ApiErrorBody } from './api-error'

/**
 * Lo que el cliente HTTP necesita de la sesión. Lo registra la feature `auth`
 * con `configureHttpAuth`, así `shared` no depende de ninguna feature.
 */
export interface HttpAuthHandlers {
  getAccessToken(): string | null
  /** Renueva el access token. Devuelve el nuevo o null si la sesión terminó. */
  refreshAccessToken(): Promise<string | null>
  onSessionExpired(): void
  /** Se llama ante un 403: puede deberse a que el usuario debe cambiar su contraseña. */
  onForbidden?(): void
}

let authHandlers: HttpAuthHandlers | null = null
let refreshInFlight: Promise<string | null> | null = null

export function configureHttpAuth(handlers: HttpAuthHandlers) {
  authHandlers = handlers
}

/** Endpoints en los que un 401 no debe disparar el refresh. */
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/me/password']

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Objeto que se envía como JSON, o `FormData` para multipart. */
  body?: unknown
  query?: Record<string, QueryValue>
  /** false para endpoints públicos (login, refresh). */
  auth?: boolean
  signal?: AbortSignal
  /** `blob` para descargar archivos (p. ej. el certificado ABSID). */
  responseType?: 'json' | 'blob'
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options
  const response = await withAuth(path, auth, (token) => send(path, options, token))

  if (!response.ok) {
    if (response.status === 403 && auth) authHandlers?.onForbidden?.()
    throw await ApiError.fromResponse(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  if (options.responseType === 'blob') {
    return (await response.blob()) as T
  }
  const contentType = response.headers.get('content-type') ?? ''
  return (contentType.includes('application/json') ? response.json() : response.text()) as Promise<T>
}

export interface DownloadedFile {
  blob: Blob
  headers: Headers
  /** Nombre sugerido por el servidor en `Content-Disposition`, si lo envió. */
  fileName: string | null
}

/** Descarga un archivo con los headers de la respuesta (p. ej. un número de certificado). */
export async function httpFile(path: string, options: Omit<RequestOptions, 'responseType'> = {}): Promise<DownloadedFile> {
  const { auth = true } = options
  const response = await withAuth(path, auth, (token) =>
    send(path, { ...options, responseType: 'blob' }, token),
  )
  if (!response.ok) {
    if (response.status === 403 && auth) authHandlers?.onForbidden?.()
    throw await ApiError.fromResponse(response)
  }
  return {
    blob: await response.blob(),
    headers: response.headers,
    fileName: parseFileName(response.headers.get('content-disposition')),
  }
}

/** Lee el nombre de `Content-Disposition`, con soporte para `filename*=UTF-8''…` (tildes, ñ). */
function parseFileName(disposition: string | null): string | null {
  if (!disposition) return null
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // Se intenta con el nombre simple.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1].trim() : null
}

/**
 * Ejecuta la petición con el token actual y, si responde 401, renueva el token una vez
 * y la repite. Si tampoco funciona, la sesión terminó.
 */
async function withAuth<R extends { status: number }>(
  path: string,
  auth: boolean,
  run: (token: string | null) => Promise<R>,
): Promise<R> {
  let response = await run(auth ? (authHandlers?.getAccessToken() ?? null) : null)

  if (response.status === 401 && auth && authHandlers && !NO_REFRESH.includes(path)) {
    const newToken = await refreshOnce()
    if (newToken) {
      response = await run(newToken)
    }
    if (response.status === 401) {
      authHandlers.onSessionExpired()
    }
  }
  return response
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
  const headers: Record<string, string> = {
    Accept: options.responseType === 'blob' ? '*/*' : 'application/json',
  }
  const isForm = options.body instanceof FormData
  // Con FormData el navegador pone el Content-Type con el boundary del multipart.
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body),
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

export interface UploadOptions {
  method?: 'POST' | 'PUT'
  /** Avance de 0 a 1. */
  onProgress?(fraction: number): void
  signal?: AbortSignal
}

interface XhrResult {
  status: number
  body: unknown
}

/**
 * Sube un formulario multipart informando el avance (fetch no lo permite).
 * Comparte el manejo de tokens y errores con `http`.
 */
export async function upload<T>(path: string, form: FormData, options: UploadOptions = {}): Promise<T> {
  const result = await withAuth(path, true, (token) => sendXhr(path, form, token, options))

  if (result.status < 200 || result.status >= 300) {
    if (result.status === 403) authHandlers?.onForbidden?.()
    const body = typeof result.body === 'object' && result.body !== null ? result.body : {}
    throw ApiError.fromBody(result.status, body as ApiErrorBody)
  }
  return result.body as T
}

function sendXhr(
  path: string,
  form: FormData,
  token: string | null,
  options: UploadOptions,
): Promise<XhrResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(options.method ?? 'POST', buildUrl(path))
    xhr.setRequestHeader('Accept', 'application/json')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = null
      }
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => reject(new TypeError('No se pudo conectar con el servidor'))
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))
    options.signal?.addEventListener('abort', () => xhr.abort())

    options.onProgress?.(0)
    xhr.send(form)
  })
}
