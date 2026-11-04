import { http, httpFile, upload } from '@/shared/api/http-client'
import type { Paginated } from '@/shared/types/api.types'
import type {
  AnimalColor,
  AnimalDetail,
  AnimalFilters,
  AnimalPhoto,
  AnimalSummary,
  Breed,
  BreedFilters,
  ChangeAnimalStatusRequest,
  ChangeAnimalStatusResponse,
  ColorFilters,
  CreateAnimalRequest,
  Species,
  UpdateAnimalRequest,
  UpdatePhotoRequest,
  BatchWeighingRequest,
  CreateWeighingRequest,
  UpdateWeighingRequest,
  Weighing,
} from '../types/animal.types'

export const animalsApi = {
  list: (filters: AnimalFilters, signal?: AbortSignal) =>
    http<Paginated<AnimalSummary>>('/animals', { query: { ...filters }, signal }),

  get: (id: string) => http<AnimalDetail>(`/animals/${id}`),

  create: (body: CreateAnimalRequest) => http<AnimalDetail>('/animals', { method: 'POST', body }),

  update: (id: string, body: UpdateAnimalRequest) =>
    http<AnimalDetail>(`/animals/${id}`, { method: 'PATCH', body }),

  changeStatus: (id: string, body: ChangeAnimalStatusRequest) =>
    http<ChangeAnimalStatusResponse>(`/animals/${id}/status`, { method: 'PATCH', body }),

  remove: (id: string) => http<void>(`/animals/${id}`, { method: 'DELETE' }),

  // ---------- Certificado ABSID ----------
  uploadCertificate: (id: string, file: File, onProgress?: (fraction: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return upload<AnimalDetail>(`/animals/${id}/certificate-file`, form, { method: 'PUT', onProgress })
  },

  /** El endpoint exige el token: se descarga como blob, no con un enlace directo. */
  certificate: (id: string) =>
    http<Blob>(`/animals/${id}/certificate-file`, { responseType: 'blob' }),

  removeCertificate: (id: string) =>
    http<void>(`/animals/${id}/certificate-file`, { method: 'DELETE' }),

  // ---------- Certificado del animal (PDF generado por el backend) ----------
  /**
   * Emite el certificado: cada llamada genera un número nuevo (`X-Certificate-Number`)
   * con los datos vigentes. No se guarda en el servidor.
   */
  issueCertificate: async (id: string, download = false) => {
    const file = await httpFile(`/animals/${id}/certificate`, { query: { download: download || undefined } })
    return { ...file, number: file.headers.get('x-certificate-number') }
  },
}

export const catalogsApi = {
  breeds: (filters: BreedFilters = {}) => http<Breed[]>('/breeds', { query: { ...filters } }),
  createBreed: (body: { species: Species; name: string }) =>
    http<Breed>('/breeds', { method: 'POST', body }),
  updateBreed: (id: string, body: { species?: Species; name?: string; isActive?: boolean }) =>
    http<Breed>(`/breeds/${id}`, { method: 'PATCH', body }),
  removeBreed: (id: string) => http<void>(`/breeds/${id}`, { method: 'DELETE' }),

  colors: (filters: ColorFilters = {}) =>
    http<AnimalColor[]>('/animal-colors', { query: { ...filters } }),
  createColor: (body: { name: string }) =>
    http<AnimalColor>('/animal-colors', { method: 'POST', body }),
  updateColor: (id: string, body: { name?: string; isActive?: boolean }) =>
    http<AnimalColor>(`/animal-colors/${id}`, { method: 'PATCH', body }),
  removeColor: (id: string) => http<void>(`/animal-colors/${id}`, { method: 'DELETE' }),
}

export interface UploadPhotoInput {
  file: File
  description?: string
  takenAt?: string
}

export const photosApi = {
  list: (animalId: string, page: number, limit: number) =>
    http<Paginated<AnimalPhoto>>(`/animals/${animalId}/photos`, { query: { page, limit } }),

  get: (animalId: string, photoId: string) =>
    http<AnimalPhoto>(`/animals/${animalId}/photos/${photoId}`),

  /** Una foto por petición, con avance de la subida. */
  upload: (animalId: string, input: UploadPhotoInput, onProgress?: (fraction: number) => void) => {
    const form = new FormData()
    form.append('file', input.file)
    if (input.description) form.append('description', input.description)
    if (input.takenAt) form.append('takenAt', input.takenAt)
    return upload<AnimalPhoto>(`/animals/${animalId}/photos`, form, { onProgress })
  },

  update: (animalId: string, photoId: string, body: UpdatePhotoRequest) =>
    http<AnimalPhoto>(`/animals/${animalId}/photos/${photoId}`, { method: 'PATCH', body }),

  setPrimary: (animalId: string, photoId: string) =>
    http<AnimalPhoto>(`/animals/${animalId}/photos/${photoId}/primary`, { method: 'PUT' }),

  remove: (animalId: string, photoId: string) =>
    http<void>(`/animals/${animalId}/photos/${photoId}`, { method: 'DELETE' }),
}

export const weighingsApi = {
  /** Del más antiguo al más reciente (para la curva de crecimiento). */
  list: (animalId: string) => http<Weighing[]>(`/animals/${animalId}/weighings`),

  create: (animalId: string, body: CreateWeighingRequest) =>
    http<Weighing>(`/animals/${animalId}/weighings`, { method: 'POST', body }),

  update: (animalId: string, id: string, body: UpdateWeighingRequest) =>
    http<Weighing>(`/animals/${animalId}/weighings/${id}`, { method: 'PATCH', body }),

  remove: (animalId: string, id: string) =>
    http<void>(`/animals/${animalId}/weighings/${id}`, { method: 'DELETE' }),

  /** Jornada de pesaje: todo o nada. */
  batch: (body: BatchWeighingRequest) => http<Weighing[]>('/weighings/batch', { method: 'POST', body }),
}
