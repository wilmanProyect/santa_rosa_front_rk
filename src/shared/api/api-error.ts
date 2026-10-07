/** Error HTTP devuelto por el backend, con los mensajes ya normalizados a una lista. */
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join('. ') || `Error HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let messages: string[] = []
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) messages = body.message
      else if (body.message) messages = [body.message]
    } catch {
      // Respuesta sin cuerpo JSON
    }
    return new ApiError(response.status, messages)
  }
}

/** Mensaje legible para mostrar al usuario a partir de cualquier error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'No se pudo conectar con el servidor'
  return 'Ocurrió un error inesperado'
}
