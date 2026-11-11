import { http, httpFile, upload } from '@/shared/api/http-client'

/** Respaldo de la carpeta del servidor. */
export interface ServerBackupFile {
  fileName: string
  size: number
  modifiedAt: string
}

/** Respaldo subido o elegido, verificado y listo para confirmar. */
export interface RestorePreview {
  restoreId: string
  /** Hay 30 minutos para confirmar. */
  expiresAt: string
  origin: { kind: 'UPLOAD' | 'SERVER_FILE'; fileName: string }
  backup: {
    createdAt: string
    createdBy: string | null
    database: { size: number; serverVersion: string; lastMigration: string | null }
    files: number
    totalFileBytes: number
  }
  /** Actualizaciones de la base que se aplicarán después (respaldo de una versión anterior). */
  pendingMigrations: string[]
}

export interface RestoreOutcome {
  restoredFrom: string
  origin: RestorePreview['origin']
  uploadedFiles: number
  deletedFiles: number
  /** Respaldo del estado anterior, guardado en la carpeta del servidor. */
  safetyCopy: { fileName: string; size: number }
  migrationsApplied: string[]
  sessionEnded: true
}

export const RESTORE_CONFIRMATION_WORD = 'RESTAURAR'

export const backupsApi = {
  /** Copia completa (base + archivos) en .tar.gz; el backend la genera al pedirla. */
  download: () => httpFile('/backups/download'),

  listServerFiles: () => http<ServerBackupFile[]>('/backups/files'),
  /**
   * Paso 1: sube el respaldo y lo verifica completo. No modifica nada.
   * Con XHR para informar el avance: el archivo puede pesar cientos de MB.
   */
  stageUpload: (file: File, onProgress?: (fraction: number) => void) => {
    const body = new FormData()
    body.append('file', file)
    return upload<RestorePreview>('/backups/restore/upload', body, { onProgress })
  },
  /** Paso 1 (alternativa): prepara un respaldo de la carpeta del servidor. */
  stageServerFile: (fileName: string) =>
    http<RestorePreview>('/backups/restore/server-file', { method: 'POST', body: { fileName } }),
  /** Paso 2: reemplaza TODOS los datos y archivos. */
  confirm: (restoreId: string) =>
    http<RestoreOutcome>(`/backups/restore/${restoreId}/confirm`, {
      method: 'POST',
      body: { confirmation: RESTORE_CONFIRMATION_WORD },
    }),
  cancel: (restoreId: string) => http<void>(`/backups/restore/${restoreId}`, { method: 'DELETE' }),
}
