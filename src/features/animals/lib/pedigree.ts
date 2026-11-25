/** Colores para distinguir cada ancestro repetido del árbol (se reutilizan si hay más). */
const REPEAT_COLORS = ['#d9822b', '#2b7bd9', '#9b4dca', '#1e9e6a', '#d9442b', '#c2a400']

export function repeatColor(index: number): string {
  return REPEAT_COLORS[index % REPEAT_COLORS.length]
}
