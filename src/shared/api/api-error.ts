/** Cuerpo de error del backend. Algunos errores traen datos extra (fields, conflicts, photoId…). */
export interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
  /** Código de negocio: DUPLICATE_IDENTIFIER, DUPLICATE_PHOTO… */
  code?: string
  [extra: string]: unknown
}

/** Error HTTP devuelto por el backend, con los mensajes ya normalizados a una lista. */
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]
  readonly body: ApiErrorBody

  constructor(status: number, messages: string[], body: ApiErrorBody = {}) {
    super(messages.join('. ') || defaultMessage(status))
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
    this.body = body
  }

  /** Código de negocio (p. ej. DUPLICATE_IDENTIFIER), si el backend lo envió. */
  get code(): string | undefined {
    return this.body.code
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // Respuesta sin cuerpo JSON
    }
    return ApiError.fromBody(response.status, body)
  }

  static fromBody(status: number, body: ApiErrorBody): ApiError {
    let messages: string[] = []
    if (Array.isArray(body.message)) messages = body.message
    else if (body.message) messages = [body.message]
    return new ApiError(status, messages, body)
  }
}

function defaultMessage(status: number): string {
  if (status === 413) return 'El archivo es demasiado grande'
  if (status === 403) return 'No tiene permiso para realizar esta acción'
  return `Error HTTP ${status}`
}

/** Mensaje legible para mostrar al usuario a partir de cualquier error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'No se pudo conectar con el servidor'
  return 'Ocurrió un error inesperado'
}
