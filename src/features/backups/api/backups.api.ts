import { httpFile } from '@/shared/api/http-client'

export const backupsApi = {
  /** Copia completa (base + archivos) en .tar.gz; el backend la genera al pedirla. */
  download: () => httpFile('/backups/download'),
}
