import { PageHeader } from '@/shared/ui'
import { LoginHistoryTable } from '../components/LoginHistoryTable'

export function LoginHistoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Seguridad"
        title="Auditoría de accesos"
        description="Cada intento de inicio de sesión, exitoso o fallido, con su IP y navegador."
      />
      <LoginHistoryTable />
    </>
  )
}
