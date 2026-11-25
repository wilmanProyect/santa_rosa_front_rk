/** Descarga un Blob como archivo (para endpoints que exigen el token: no sirve un `<a href>`). */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Se libera más tarde: algunos navegadores todavía leen la URL después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
