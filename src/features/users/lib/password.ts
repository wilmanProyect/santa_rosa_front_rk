/** Política del backend: 8 a 72 caracteres, con mayúscula, minúscula y número. */
export const PASSWORD_RULES =
  'Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número.'

export const PASSWORD_PATTERN = '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}'

// Sin caracteres que se confunden al dictarlos (O/0, l/1/I).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'

function pick(chars: string): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1))
  return chars[n % chars.length]
}

/** Genera una contraseña temporal que cumple la política (10 caracteres). */
export function generateTemporaryPassword(): string {
  const all = UPPER + LOWER + DIGITS
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)]
  while (chars.length < 10) chars.push(pick(all))
  // Mezcla Fisher–Yates para que los obligatorios no queden siempre al inicio.
  for (let i = chars.length - 1; i > 0; i--) {
    const [n] = crypto.getRandomValues(new Uint32Array(1))
    const j = n % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
