/** Política del backend: 8 a 72 bytes, con mayúscula, minúscula y número. */
export const PASSWORD_RULES =
  'Entre 8 y 72 caracteres, con al menos una mayúscula, una minúscula y un número.'

export const PASSWORD_PATTERN = '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}'

/** Valida la política completa (el límite de 72 es en bytes UTF-8, no en caracteres). */
export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    new TextEncoder().encode(password).length <= 72 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

// Sin caracteres que se confunden al dictarlos (O/0, l/1/I).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'

function randomIndex(max: number): number {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return n % max
}

/** Genera una contraseña temporal que cumple la política (10 caracteres). */
export function generateTemporaryPassword(): string {
  const all = UPPER + LOWER + DIGITS
  const chars = [UPPER, LOWER, DIGITS].map((set) => set[randomIndex(set.length)])
  while (chars.length < 10) chars.push(all[randomIndex(all.length)])
  // Mezcla Fisher–Yates para que los obligatorios no queden siempre al inicio.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
