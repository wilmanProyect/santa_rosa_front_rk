import { useState } from 'react'
import { Link } from 'react-router'
import { ANIMALS_ROUTES, animalLabel, useAnimal } from '@/features/animals'
import { useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatDate, todayIso } from '@/shared/lib/format'
import { Alert, Badge, ConfirmDialog, Icon, Pagination, SelectField, Spinner, useToast } from '@/shared/ui'
import { useDeleteHealthRecord, useHealthRecords, useProducts } from '../hooks/useHealth'
import {
  DOSE_UNIT_LABELS,
  HEALTH_CATEGORY_LABELS,
  HEALTH_EVENT_LABELS,
  ROUTE_LABELS,
  type HealthCategory,
  type HealthEventType,
  type HealthRecord,
} from '../types/health.types'
import { HealthRecordDialog, type HealthAnimalContext } from './HealthRecordDialog'

const PAGE_SIZE = 20

interface HealthRecordsTableProps {
  /** Historial de un animal: oculta la columna y el filtro de animal. */
  animal?: HealthAnimalContext
}

/** Eventos sanitarios y de manejo, del más reciente al más antiguo, con filtros. */
export function HealthRecordsTable({ animal }: HealthRecordsTableProps) {
  const { can } = useAuth()
  const toast = useToast()
  const [scope, setScope] = useState<'' | 'general'>('')
  const [category, setCategory] = useState<HealthCategory | ''>('')
  const [type, setType] = useState<HealthEventType | ''>('')
  const [productId, setProductId] = useState('')
  const [condition, setCondition] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const debouncedCondition = useDebouncedValue(condition, 300)
  const [editing, setEditing] = useState<HealthRecord | null>(null)
  const [deleting, setDeleting] = useState<HealthRecord | null>(null)

  const { data: products } = useProducts()
  const remove = useDeleteHealthRecord()
  const { data, isPending, isError, error, isFetching } = useHealthRecords({
    animalId: animal?.id,
    general: !animal && scope === 'general' ? true : undefined,
    category: category || undefined,
    type: type || undefined,
    productId: productId || undefined,
    targetCondition: debouncedCondition || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: PAGE_SIZE,
  })
  const canWrite = can(PERMISSIONS.HEALTH_WRITE)
  const today = todayIso()

  /** Envuelve un setter para volver a la página 1 al cambiar un filtro. */
  const filter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const types = (Object.keys(HEALTH_EVENT_LABELS) as HealthEventType[]).filter(
    (t) => !animal || t !== 'CORRAL_CLEANING',
  )

  return (
    <>
      <div className="toolbar">
        {!animal && (
          <SelectField
            label="Alcance"
            className="visually-hidden-label"
            value={scope}
            onChange={(e) => filter(setScope)(e.target.value as typeof scope)}
          >
            <option value="">Todos los eventos</option>
            <option value="general">Solo generales (sin animal)</option>
          </SelectField>
        )}
        <SelectField
          label="Categoría"
          className="visually-hidden-label"
          value={category}
          onChange={(e) => {
            filter(setCategory)(e.target.value as HealthCategory | '')
            setType('')
          }}
        >
          <option value="">Todas las categorías</option>
          {(Object.keys(HEALTH_CATEGORY_LABELS) as HealthCategory[])
            .filter((c) => !animal || c !== 'FACILITY')
            .map((c) => (
              <option key={c} value={c}>
                {HEALTH_CATEGORY_LABELS[c]}
              </option>
            ))}
        </SelectField>
        <SelectField
          label="Tipo"
          className="visually-hidden-label"
          value={type}
          onChange={(e) => filter(setType)(e.target.value as HealthEventType | '')}
        >
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {HEALTH_EVENT_LABELS[t]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Producto"
          className="visually-hidden-label"
          value={productId}
          onChange={(e) => filter(setProductId)(e.target.value)}
        >
          <option value="">Todos los productos</option>
          {products?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <div className="input-icon">
          <Icon name="search" />
          <input
            className="input"
            type="search"
            placeholder="Enfermedad u objetivo"
            aria-label="Filtrar por enfermedad u objetivo"
            value={condition}
            onChange={(e) => filter(setCondition)(e.target.value)}
          />
        </div>
        <div className="toolbar__range">
          <label>
            <span>Desde</span>
            <input
              className="input"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => filter(setFrom)(e.target.value)}
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              className="input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => filter(setTo)(e.target.value)}
            />
          </label>
        </div>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <>
          <div className="table-wrap" aria-busy={isFetching}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Evento</th>
                  {!animal && <th>Animal / lugar</th>}
                  <th>Producto y dosis</th>
                  <th>Retiro de carne</th>
                  <th>Próxima dosis</th>
                  {canWrite && (
                    <th className="table__actions">
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table__empty">
                      <div className="empty">
                        <Icon name="shield" size={28} />
                        No hay eventos sanitarios que coincidan con los filtros.
                      </div>
                    </td>
                  </tr>
                )}
                {data.items.map((r) => {
                  const inWithdrawal = r.meatWithdrawalEndsOn !== null && r.meatWithdrawalEndsOn > today
                  return (
                    <tr key={r.id}>
                      <td className="nowrap">
                        {formatDate(r.appliedAt)}
                        {r.isDateEstimated && <div className="muted small">aproximada</div>}
                      </td>
                      <td>
                        <strong>{HEALTH_EVENT_LABELS[r.type]}</strong>
                        <div className="muted small">
                          {[r.targetCondition, r.appliedBy].filter(Boolean).join(' · ') ||
                            HEALTH_CATEGORY_LABELS[r.category]}
                        </div>
                      </td>
                      {!animal && (
                        <td>
                          {r.animalId ? <AnimalRef id={r.animalId} /> : <Badge tone="neutral">General</Badge>}
                          {r.location && <div className="muted small">{r.location}</div>}
                        </td>
                      )}
                      <td className="small">
                        {r.product?.name ?? <span className="muted">—</span>}
                        {(r.doseQuantity != null || r.route) && (
                          <div className="muted">
                            {r.doseQuantity != null &&
                              `${r.doseQuantity.toLocaleString('es-BO')} ${r.doseUnit ? DOSE_UNIT_LABELS[r.doseUnit] : ''}`}
                            {r.doseQuantity != null && r.route && ' · '}
                            {r.route && ROUTE_LABELS[r.route]}
                          </div>
                        )}
                        {r.productBatch && <div className="muted">Lote {r.productBatch}</div>}
                      </td>
                      <td className="nowrap">
                        {r.meatWithdrawalEndsOn ? (
                          <Badge tone={inWithdrawal ? 'danger' : 'neutral'}>
                            {inWithdrawal ? 'Hasta' : 'Cumplido'} {formatDate(r.meatWithdrawalEndsOn)}
                          </Badge>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="nowrap">{r.nextDoseAt ? formatDate(r.nextDoseAt) : '—'}</td>
                      {canWrite && (
                        <td className="table__actions">
                          <div className="row">
                            <button
                              type="button"
                              className="icon-btn"
                              title="Corregir"
                              aria-label={`Corregir ${HEALTH_EVENT_LABELS[r.type]} del ${formatDate(r.appliedAt)}`}
                              onClick={() => setEditing(r)}
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              title="Eliminar"
                              aria-label={`Eliminar ${HEALTH_EVENT_LABELS[r.type]} del ${formatDate(r.appliedAt)}`}
                              onClick={() => {
                                remove.reset()
                                setDeleting(r)
                              }}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} noun="evento(s)" onChange={setPage} />
        </>
      )}

      <HealthRecordDialog open={editing !== null} record={editing} animal={animal} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar evento"
        message={
          deleting && (
            <>
              ¿Eliminar {HEALTH_EVENT_LABELS[deleting.type].toLowerCase()} del {formatDate(deleting.appliedAt)}?
              {deleting.meatWithdrawalEndsOn && ' Su período de retiro dejará de contar.'}
            </>
          )
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { id: deleting.id, animalId: deleting.animalId },
            {
              onSuccess: () => {
                toast.show('Evento eliminado')
                setDeleting(null)
              },
            },
          )
        }
      />
    </>
  )
}

/** Nombre del animal de un evento (la respuesta solo trae su id; la ficha queda en caché). */
function AnimalRef({ id }: { id: string }) {
  const { data } = useAnimal(id)
  return (
    <Link to={ANIMALS_ROUTES.detail(id)} className="table__primary">
      {data ? animalLabel(data) : 'Ver animal'}
    </Link>
  )
}
