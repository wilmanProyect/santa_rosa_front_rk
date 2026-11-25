import { useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS, type PermissionCode } from '@/shared/config/permissions'
import { saveBlob } from '@/shared/lib/download'
import { Alert, Button, Dialog, SelectField, TextField, useToast } from '@/shared/ui'
import { exportsApi, type ExcelExportParams, type ExportSection } from '../api/exports.api'

const SECTIONS: { id: ExportSection; label: string; sheets: string; permission: PermissionCode }[] = [
  { id: 'animals', label: 'Animales', sheets: 'Hoja Animales', permission: PERMISSIONS.ANIMALS_READ },
  {
    id: 'health',
    label: 'Registro sanitario',
    sheets: 'Hoja Registro sanitario',
    permission: PERMISSIONS.HEALTH_READ,
  },
  {
    id: 'services',
    label: 'Montas y diagnósticos',
    sheets: 'Hojas Montas y Diagnósticos',
    permission: PERMISSIONS.REPRODUCTION_READ,
  },
  {
    id: 'births',
    label: 'Partos y crías',
    sheets: 'Hojas Partos y Crías',
    permission: PERMISSIONS.REPRODUCTION_READ,
  },
]

const STATUS_OPTIONS = [
  ['', 'Todos los estados'],
  ['ALIVE', 'Solo inventario actual (vivos)'],
  ['DEAD', 'Muertos'],
  ['SOLD', 'Vendidos'],
  ['SLAUGHTERED', 'Faenados'],
  ['GIFTED', 'Regalados'],
  ['EXCHANGED', 'Intercambiados'],
  ['LOST', 'Perdidos'],
] as const

/**
 * Botón "Exportar a Excel" con su diálogo. Solo aparece con `exports:download`, y en el
 * diálogo solo las secciones que el usuario puede leer.
 */
export function ExportExcelButton() {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  if (!can(PERMISSIONS.EXPORTS_DOWNLOAD)) return null
  const available = SECTIONS.filter((s) => can(s.permission))
  if (available.length === 0) return null

  return (
    <>
      <Button variant="secondary" icon="download" onClick={() => setOpen(true)}>
        Exportar a Excel
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Exportar a Excel"
        description="Descarga un archivo .xlsx con una hoja por sección y un resumen de los filtros."
        bare
      >
        {open && <ExportForm sections={available} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}

function ExportForm({ sections, onDone }: { sections: typeof SECTIONS; onDone(): void }) {
  const toast = useToast()
  // Todas marcadas por defecto.
  const [selected, setSelected] = useState<ExportSection[]>(() => sections.map((s) => s.id))
  const [species, setSpecies] = useState<'' | 'SHEEP' | 'GOAT'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [includeExternal, setIncludeExternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAnimals = selected.includes('animals')
  // Las fechas filtran sanidad, montas y partos; no la hoja de animales.
  const hasDated = selected.some((s) => s !== 'animals')

  const toggle = (id: ExportSection) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (selected.length === 0) {
      setError('Marque al menos una sección.')
      return
    }
    if (hasDated && from && to && from > to) {
      setError('La fecha "Desde" no puede ser posterior a "Hasta".')
      return
    }
    setError(null)
    setBusy(true)
    const params: ExcelExportParams = {
      // En el orden del diálogo, no en el que se marcaron.
      sections: sections.map((s) => s.id).filter((id) => selected.includes(id)),
      species: species || undefined,
      from: hasDated && from ? from : undefined,
      to: hasDated && to ? to : undefined,
      status: hasAnimals && status ? status : undefined,
      includeExternal: hasAnimals && includeExternal ? true : undefined,
    }
    try {
      const { blob, fileName } = await exportsApi.excel(params)
      saveBlob(blob, fileName ?? 'santa-rosa-datos.xlsx')
      toast.show('Archivo de Excel descargado')
      onDone()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit}>
      <div className="dialog__body stack">
        {error && <Alert tone="error">{error}</Alert>}

        <fieldset className="stack stack--sm" style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ marginBottom: 6, fontWeight: 700 }}>
            Secciones
          </legend>
          {sections.map((s) => (
            <label key={s.id} className="checkbox">
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span>
                {s.label} <span className="muted small">· {s.sheets}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid-2">
          <SelectField
            label="Especie"
            value={species}
            onChange={(e) => setSpecies(e.target.value as typeof species)}
          >
            <option value="">Ovinos y caprinos</option>
            <option value="SHEEP">Solo ovinos</option>
            <option value="GOAT">Solo caprinos</option>
          </SelectField>
          {hasAnimals && (
            <SelectField
              label="Estado de los animales"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          )}
        </div>

        {hasAnimals && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeExternal}
              onChange={(e) => setIncludeExternal(e.target.checked)}
            />
            <span>Incluir reproductores externos en la hoja de animales</span>
          </label>
        )}

        {hasDated && (
          <div className="stack stack--sm">
            <div className="grid-2">
              <TextField
                label="Desde"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
              <TextField
                label="Hasta"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <p className="m-0 muted small">
              Las fechas filtran sanidad, montas, diagnósticos y partos. Vacías, se exporta todo
              el historial. No filtran la hoja de animales.
            </p>
          </div>
        )}
      </div>
      <footer className="dialog__footer">
        <Button variant="secondary" onClick={onDone} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="download" loading={busy}>
          Descargar Excel
        </Button>
      </footer>
    </form>
  )
}
