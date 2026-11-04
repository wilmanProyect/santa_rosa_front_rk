import { Button } from './Button'
import { Icon } from './Icon'

interface PaginationProps {
  page: number
  limit: number
  total: number
  /** Sustantivo en plural para el resumen: "usuario(s)", "animales"… */
  noun: string
  onChange(page: number): void
}

/** Resumen "N elementos · página X de Y" con botones Anterior/Siguiente. */
export function Pagination({ page, limit, total, noun, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="pagination">
      <span>
        {total} {noun} · página {page} de {totalPages}
      </span>
      <div className="row">
        <Button
          variant="secondary"
          size="sm"
          icon="chevronLeft"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
          <Icon name="chevronRight" size={16} />
        </Button>
      </div>
    </div>
  )
}
