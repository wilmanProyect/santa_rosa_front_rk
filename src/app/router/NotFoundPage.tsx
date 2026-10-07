import { Link } from 'react-router'
import { PageHeader } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página no encontrada" description="La dirección no existe o fue movida." />
      <Link to="/">Volver al inicio</Link>
    </>
  )
}
