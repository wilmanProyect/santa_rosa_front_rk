import type { ReactNode } from 'react'
import { BrandLogo } from '@/shared/ui'
import '../pages/auth-pages.css'

/** Marco de las pantallas de acceso: panel de marca a la izquierda y formulario a la derecha. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-hero" aria-hidden="true">
        <BrandLogo tone="white" className="auth-hero__logo" />
        <div className="auth-hero__text">
          <p className="auth-hero__eyebrow">Sistema de gestión</p>
          <h2>Genética que transforma el futuro del ganado.</h2>
          <p>Un arte de vivir en el campo, conociendo la vida en ella.</p>
        </div>
      </aside>
      <main className="auth-main">
        <section className="auth-card">
          <BrandLogo className="auth-card__mobile-logo" />
          {children}
          <p className="auth-card__footer">Cabaña Santa Rosa · Santa Rosa del Sara, Santa Cruz</p>
        </section>
      </main>
    </div>
  )
}
