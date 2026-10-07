import { getErrorMessage } from '@/shared/api/api-error'
import { Alert, Badge, PageHeader, Spinner } from '@/shared/ui'
import { useAreas } from '../hooks/useAreas'

export function AreasPage() {
  const { data: areas, isPending, isError, error } = useAreas()

  return (
    <>
      <PageHeader title="Áreas" description="Áreas de trabajo de la empresa. Los roles se organizan por área." />

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
              </tr>
            </thead>
            <tbody>
              {areas.length === 0 && (
                <tr>
                  <td colSpan={3} className="table__empty">
                    Todavía no hay áreas creadas.
                  </td>
                </tr>
              )}
              {areas.map((area) => (
                <tr key={area.id}>
                  <td>{area.name}</td>
                  <td className="muted">{area.description || '—'}</td>
                  <td>
                    {area.isActive ? (
                      <Badge tone="success">Activa</Badge>
                    ) : (
                      <Badge tone="danger">Inactiva</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
