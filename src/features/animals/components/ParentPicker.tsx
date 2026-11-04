import { useId, useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { Badge, Icon } from '@/shared/ui'
import { useAnimals } from '../hooks/useAnimals'
import { animalLabel } from '../lib/animal-label'
import { SPECIES_LABELS, type AnimalStatus, type AnimalSummary, type ParentRef, type Sex, type Species } from '../types/animal.types'

interface ParentPickerProps {
  label: string
  /** Vacío: hasta elegir especie no busca (salvo con `anySpecies`). */
  species: Species | ''
  sex?: Sex
  /** Busca en ambas especies (p. ej. al elegir el animal de un pesaje). */
  anySpecies?: boolean
  /** Solo animales en este estado (p. ej. ALIVE para el inventario actual). */
  status?: AnimalStatus
  placeholder?: string
  hint?: string
  value: ParentRef | null
  /** Recibe también el resumen completo del animal elegido (especie, raza…). */
  onChange(parent: ParentRef | null, animal?: AnimalSummary): void
  /** Incluye reproductores externos (para el padre). */
  includeExternal?: boolean
  /** El propio animal, al editar, para que no sea su propio padre. */
  excludeId?: string
  disabled?: boolean
}

const SUGGESTIONS = 8

/** Autocompletado de animales (madre, padre o el animal de un evento): pueden ser cientos. */
export function ParentPicker({
  label,
  species,
  sex,
  anySpecies = false,
  status,
  placeholder,
  hint,
  value,
  onChange,
  includeExternal = false,
  excludeId,
  disabled,
}: ParentPickerProps) {
  const inputId = useId()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(search, 300)
  const canSearch = anySpecies || !!species
  const enabled = open && canSearch

  const base = { species: species || undefined, sex, status, search: debounced || undefined, limit: SUGGESTIONS }
  const own = useAnimals({ ...base, isExternal: false }, { enabled })
  const external = useAnimals({ ...base, isExternal: true }, { enabled: enabled && includeExternal })

  const options = [...(own.data?.items ?? []), ...(includeExternal ? (external.data?.items ?? []) : [])]
    .filter((animal) => animal.id !== excludeId)
  const loading = own.isFetching || external.isFetching

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {value ? (
        <div className="picker__selected">
          <span className="row" style={{ gap: 6 }}>
            <strong>{animalLabel(value)}</strong>
            {value.isExternal && <Badge tone="accent">Externo</Badge>}
          </span>
          {!disabled && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Quitar ${label.toLowerCase()}`}
              title="Quitar"
              onClick={() => onChange(null)}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="picker">
          <div className="input-icon">
            <Icon name="search" />
            <input
              id={inputId}
              className="input"
              type="search"
              autoComplete="off"
              disabled={disabled || !canSearch}
              placeholder={canSearch ? (placeholder ?? 'Buscar por arete o nombre') : 'Elija primero la especie'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              // Se cierra con retraso para que el clic en una opción llegue a registrarse.
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            />
          </div>
          {open && canSearch && (
            <ul className="picker__list" role="listbox" aria-label={label}>
              {loading && options.length === 0 && <li className="picker__empty">Buscando…</li>}
              {!loading && options.length === 0 && (
                <li className="picker__empty">No hay coincidencias.</li>
              )}
              {options.map((animal) => (
                <li key={animal.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="picker__option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(
                        {
                          id: animal.id,
                          earTag: animal.earTag,
                          name: animal.name,
                          isExternal: animal.isExternal,
                        },
                        animal,
                      )
                      setSearch('')
                      setOpen(false)
                    }}
                  >
                    <span>
                      {animalLabel(animal)}
                      <span className="muted small">
                        {' · '}
                        {anySpecies && `${SPECIES_LABELS[animal.species]} · `}
                        {animal.breed.name}
                      </span>
                    </span>
                    {animal.isExternal && <Badge tone="accent">Externo</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {hint && <small className="field__hint">{hint}</small>}
    </div>
  )
}
