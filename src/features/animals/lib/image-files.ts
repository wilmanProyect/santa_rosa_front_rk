import { FILE_LIMITS } from '../types/animal.types'

const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const CERTIFICATE_EXTENSIONS = ['.pdf', ...PHOTO_EXTENSIONS]

const hasExtension = (file: File, extensions: string[]) =>
  extensions.some((ext) => file.name.toLowerCase().endsWith(ext))

/**
 * El backend detecta el formato por el contenido, pero algunos navegadores no informan
 * `file.type`: en ese caso se acepta por la extensión y el backend tiene la última palabra.
 */
function isAccepted(file: File, types: readonly string[], extensions: string[]) {
  return file.type ? types.includes(file.type) : hasExtension(file, extensions)
}

/** Fotos de iPhone (HEIC/HEIF): el backend las rechaza, hay que convertirlas a JPG antes. */
export function isHeic(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

/** Valida una foto antes de subirla. Devuelve el problema o null. */
export function validatePhoto(file: File): string | null {
  if (!isAccepted(file, FILE_LIMITS.photoTypes, PHOTO_EXTENSIONS)) {
    return 'Formato no admitido: use JPG, PNG o WEBP.'
  }
  if (file.size > FILE_LIMITS.photoMaxBytes) return 'La foto supera los 15 MB.'
  return null
}

/** Valida el certificado ABSID antes de subirlo. Devuelve el problema o null. */
export function validateCertificate(file: File): string | null {
  if (!isAccepted(file, FILE_LIMITS.certificateTypes, CERTIFICATE_EXTENSIONS)) {
    return 'El certificado debe ser PDF, JPG, PNG o WEBP.'
  }
  if (file.size > FILE_LIMITS.certificateMaxBytes) return 'El certificado supera los 10 MB.'
  return null
}

/**
 * Convierte una foto HEIC a JPG en el navegador. La librería (~1 MB) se carga solo
 * cuando hace falta. La conversión no conserva el EXIF: la fecha de la cámara se pierde.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(result) ? result[0] : result
  const name = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
}
