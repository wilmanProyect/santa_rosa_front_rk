import { AUTH_ROUTES, useAuth } from '@/features/auth'
import { NotificationSettingsSection, NOTIFICATIONS_ROUTES, PushSettingsCard } from '@/features/notifications'
import { PERMISSIONS } from '@/shared/config/permissions'
import { setThemePreference, useThemePreference, type ThemePreference } from '@/shared/lib/theme'
import { isNavItemAllowed } from '@/shared/lib/navigation'
import { Icon, ModuleCard, ModuleGrid, PageHeader, type IconName } from '@/shared/ui'
import { NAVIGATION } from '../navigation'

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; icon: IconName }[] = [
  { value: 'light', label: 'Claro', description: 'Fondo claro, siempre.', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', description: 'Fondo oscuro, siempre.', icon: 'moon' },
  { value: 'system', label: 'Según el sistema', description: 'Sigue la configuración del dispositivo.', icon: 'monitor' },
]

/** Modo claro u oscuro. Se guarda en este navegador. */
function ThemeChoice() {
  const preference = useThemePreference()
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Apariencia">
      {THEME_OPTIONS.map((option) => (
        <label key={option.value} className="choice row" style={{ gap: 12, cursor: 'pointer' }}>
          <input
            type="radio"
            name="theme"
            value={option.value}
            checked={preference === option.value}
            onChange={() => setThemePreference(option.value)}
          />
          <Icon name={option.icon} size={20} />
          <span>
            <strong>{option.label}</strong>
            <span className="muted small" style={{ display: 'block' }}>
              {option.description}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}

export const SETTINGS_ROUTE = '/configuracion'

/** Rutas que se abren desde Configuración: el botón del menú queda resaltado en ellas. */
export const SETTINGS_PATHS = [
  SETTINGS_ROUTE,
  AUTH_ROUTES.profile,
  AUTH_ROUTES.changePassword,
  NOTIFICATIONS_ROUTES.list,
  ...NAVIGATION.filter((item) => item.placement === 'settings').map((item) => item.to),
]

/** Configuración: la cuenta del usuario y los módulos de sistema (copias, auditoría). */
export function SettingsPage() {
  const { can, logout } = useAuth()
  const systemItems = NAVIGATION.filter((item) => item.placement === 'settings' && isNavItemAllowed(item, can))

  return (
    <>
      <PageHeader title="Configuración" description="Su cuenta y las herramientas del sistema." />

      <h2 className="section-title">Mi cuenta</h2>
      <ModuleGrid>
        <ModuleCard
          to={AUTH_ROUTES.profile}
          icon="user"
          title="Mi perfil"
          description="Sus datos, su rol y sus permisos."
        />
        <ModuleCard
          to={AUTH_ROUTES.changePassword}
          icon="key"
          title="Cambiar contraseña"
          description="Elija una contraseña nueva para entrar al sistema."
        />
        <ModuleCard
          onClick={() => void logout()}
          icon="logout"
          title="Cerrar sesión"
          description="Salir del sistema en este dispositivo."
          action="Salir"
          tone="danger"
        />
      </ModuleGrid>

      <h2 className="section-title" style={{ marginTop: 32 }}>
        Apariencia
      </h2>
      <ThemeChoice />

      <h2 className="section-title" style={{ marginTop: 32 }}>
        Notificaciones
      </h2>
      <div className="stack">
        <PushSettingsCard />
        {can(PERMISSIONS.NOTIFICATIONS_SETTINGS) && <NotificationSettingsSection />}
      </div>

      {systemItems.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: 32 }}>
            Sistema
          </h2>
          <ModuleGrid>
            {systemItems.map((item) => (
              <ModuleCard
                key={item.to}
                to={item.to}
                icon={item.icon}
                title={item.label}
                description={item.description}
              />
            ))}
          </ModuleGrid>
        </>
      )}
    </>
  )
}
