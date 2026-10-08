import { useState } from 'react'
import { Can, useAuth } from '@/features/auth'
import { getErrorMessage } from '@/shared/api/api-error'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDateTime } from '@/shared/lib/format'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Icon,
  PageHeader,
  SelectField,
  Spinner,
  useToast,
} from '@/shared/ui'
import { AreaFormDialog } from '../components/AreaFormDialog'
import { useAreas, useDeleteArea, useUpdateArea } from '../hooks/useAreas'
import type { Area } from '../types/area.types'

type ActiveFilter = '' | 'true' | 'false'

export function AreasPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('')
  const { data: areas, isPending, isError, error } = useAreas(
    activeFilter ? { isActive: activeFilter === 'true' } : {},
  )
  const update = useUpdateArea()
  const remove = useDeleteArea()

  const [editing, setEditing] = useState<Area | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Area | null>(null)

  const canEdit = can(PERMISSIONS.AREAS_UPDATE)
  const canDelete = can(PERMISSIONS.AREAS_DELETE)

  function openForm(area: Area | null) {
    setEditing(area)
    setFormOpen(true)
  }

  function toggleActive(area: Area) {
    update.mutate(
      { id: area.id, body: { isActive: !area.isActive } },
      {
        onSuccess: (updated) =>
          toast.show(`Área "${updated.name}" ${updated.isActive ? 'activada' : 'desactivada'}`),
        onError: (err) => toast.show(getErrorMessage(err), 'error'),
      },
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Áreas"
        description="Áreas de trabajo de la cabaña. Los roles y el personal se organizan por área."
        actions={
          <Can permissions={[PERMISSIONS.AREAS_CREATE]}>
            <Button icon="plus" onClick={() => openForm(null)}>
              Nueva área
            </Button>
          </Can>
        }
      />

      <div className="toolbar">
        <SelectField
          label="Estado"
          className="visually-hidden-label"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
        >
          <option value="">Todas las áreas</option>
          <option value="true">Solo activas</option>
          <option value="false">Solo inactivas</option>
        </SelectField>
      </div>

      {isPending && <Spinner />}
      {isError && <Alert tone="error">{getErrorMessage(error)}</Alert>}

      {areas && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Área</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Última modificación</th>
                {(canEdit || canDelete) && (
                  <th className="table__actions">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {areas.length === 0 && (
                <tr>
                  <td colSpan={5} className="table__empty">
                    <div className="empty">
                      <Icon name="area" size={28} />
                      No hay áreas para mostrar.
                    </div>
                  </td>
                </tr>
              )}
              {areas.map((area) => (
                <tr key={area.id}>
                  <td>
                    <span className="table__primary">{area.name}</span>
                  </td>
                  <td className="muted">{area.description || '—'}</td>
                  <td>
                    {area.isActive ? (
                      <Badge tone="success">Activa</Badge>
                    ) : (
                      <Badge tone="danger">Inactiva</Badge>
                    )}
                  </td>
                  <td className="muted small">{formatDateTime(area.updatedAt)}</td>
                  {(canEdit || canDelete) && (
                    <td className="table__actions">
                      <div className="row">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              title={area.isActive ? 'Desactivar' : 'Activar'}
                              aria-label={`${area.isActive ? 'Desactivar' : 'Activar'} ${area.name}`}
                              disabled={update.isPending}
                              onClick={() => toggleActive(area)}
                            >
                              <Icon name="power" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Editar"
                              aria-label={`Editar ${area.name}`}
                              onClick={() => openForm(area)}
                            >
                              <Icon name="edit" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            title="Eliminar"
                            aria-label={`Eliminar ${area.name}`}
                            onClick={() => {
                              remove.reset()
                              setDeleting(area)
                            }}
                          >
                            <Icon name="trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AreaFormDialog open={formOpen} area={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar área"
        message={
          <>
            ¿Eliminar el área <strong>{deleting?.name}</strong>? Solo se puede eliminar si no tiene
            usuarios ni roles asignados. Si quiere conservarla para el historial, desactívela.
          </>
        }
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.isError ? getErrorMessage(remove.error) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.show(`Área "${deleting.name}" eliminada`)
              setDeleting(null)
            },
          })
        }
      />
    </>
  )
}
