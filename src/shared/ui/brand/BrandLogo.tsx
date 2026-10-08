import {
  ANIMALS_PATH,
  CABANA_PATH,
  FRAME_PATH,
  ISOTYPE_VIEWBOX,
  LOGO_VIEWBOX,
  NAME_PATH,
  SHUTTERS_PATH,
} from './brand-paths'
import './brand.css'

interface BrandLogoProps {
  /** `full`: logotipo principal (isotipo + nombre). `isotype`: solo la ventana. */
  variant?: 'full' | 'isotype'
  /**
   * Versiones aprobadas en el manual de marca:
   * `color` sobre fondo claro, `white` sobre verde y `ochre` sobre café.
   */
  tone?: 'color' | 'white' | 'ochre'
  className?: string
  title?: string
}

export function BrandLogo({
  variant = 'full',
  tone = 'color',
  className,
  title = 'Cabaña Santa Rosa',
}: BrandLogoProps) {
  const full = variant === 'full'

  return (
    <svg
      className={['brand-logo', `brand-logo--${tone}`, className].filter(Boolean).join(' ')}
      viewBox={full ? LOGO_VIEWBOX : ISOTYPE_VIEWBOX}
      role="img"
      aria-label={title}
    >
      <path className="brand-logo__frame" d={FRAME_PATH} />
      <path className="brand-logo__shutters" d={SHUTTERS_PATH} />
      <path className="brand-logo__animals" d={ANIMALS_PATH} />
      {full && <path className="brand-logo__cabana" d={CABANA_PATH} />}
      {full && <path className="brand-logo__name" d={NAME_PATH} />}
    </svg>
  )
}
