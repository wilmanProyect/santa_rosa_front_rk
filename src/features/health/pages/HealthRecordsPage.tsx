import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Can } from '@/features/auth'
import { PERMISSIONS } from '@/shared/config/permissions'
import { Button, PageHeader } from '@/shared/ui'
import { HealthRecordDialog } from '../components/HealthRecordDialog'
import { HealthRecordsTable } from '../components/HealthRecordsTable'
import { HEALTH_ROUTES } from '../routes'

/** Registro sanitario general: eventos de todos los animales y de las instalaciones. */
export function HealthRecordsPage() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        eyebrow="Sanidad"
        title="Registro sanitario"
        description="Vacunaciones, desparasitaciones, tratamientos y tareas de manejo, más los eventos generales como la limpieza de corrales."
        actions={
          <Can permissions={[PERMISSIONS.HEALTH_WRITE]}>
            <Button variant="secondary" icon="users" onClick={() => navigate(HEALTH_ROUTES.batch)}>
              Aplicación masiva
            </Button>
            <Button icon="plus" onClick={() => setCreating(true)}>
              Registrar evento
            </Button>
          </Can>
        }
      />
      <HealthRecordsTable />
      <HealthRecordDialog open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
