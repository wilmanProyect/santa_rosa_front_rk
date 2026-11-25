import { useSearchParams } from 'react-router'
import { PageHeader, Tabs } from '@/shared/ui'
import { ActivityTable } from '../components/ActivityTable'
import { LoginHistoryTable } from '../components/LoginHistoryTable'

type Tab = 'accesos' | 'actividad'

/** Auditoría: intentos de inicio de sesión y registro de actividad (cambios de datos). */
export function AuditPage() {
  // La pestaña y la operación viven en la URL (?tab=actividad&operacion=<requestId>).
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'actividad' ? 'actividad' : 'accesos'
  const requestId = searchParams.get('operacion') ?? undefined

  return (
    <>
      <PageHeader
        eyebrow="Seguridad"
        title="Auditoría"
        description={
          tab === 'accesos'
            ? 'Cada intento de inicio de sesión, exitoso o fallido, con su IP y navegador.'
            : 'Quién ingresó, modificó o borró cada dato, y cuándo.'
        }
      />
      <Tabs
        label="Secciones de la auditoría"
        value={tab}
        onChange={(next) => setSearchParams(next === 'accesos' ? {} : { tab: next }, { replace: true })}
        tabs={[
          { id: 'accesos', label: 'Accesos', icon: 'key' },
          { id: 'actividad', label: 'Actividad', icon: 'activity' },
        ]}
      />
      {tab === 'accesos' ? (
        <LoginHistoryTable />
      ) : (
        <ActivityTable
          key={requestId ?? 'all'}
          requestId={requestId}
          onClearRequest={() => setSearchParams({ tab: 'actividad' })}
        />
      )}
    </>
  )
}
