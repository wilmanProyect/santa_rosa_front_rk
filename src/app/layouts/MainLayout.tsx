import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { AUTH_ROUTES, useAuth } from '@/features/auth'
import { storage } from '@/shared/lib/storage'
import { BrandLogo, Icon } from '@/shared/ui'
import { NAVIGATION } from '../navigation'
import './main-layout.css'

const COLLAPSED_KEY = 'sr.sidebarCollapsed'

export function MainLayout() {
  const { user, can, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  // En escritorio el menú se puede contraer a solo íconos; se recuerda la preferencia.
  const [collapsed, setCollapsed] = useState(() => storage.get(COLLAPSED_KEY) === '1')
  const items = NAVIGATION.filter((item) => can(...item.permissions))
  // Secciones del menú en el orden en que aparecen en NAVIGATION; se omiten las vacías.
  const groups = items.reduce<{ title?: string; items: typeof items }[]>((acc, item) => {
    const last = acc[acc.length - 1]
    if (last && last.title === item.group) last.items.push(item)
    else acc.push({ title: item.group, items: [item] })
    return acc
  }, [])
  // En móvil, el menú se cierra al elegir una opción.
  const closeMenu = () => setMenuOpen(false)

  function toggleCollapsed() {
    setCollapsed((current) => {
      storage.set(COLLAPSED_KEY, current ? '0' : '1')
      return !current
    })
  }

  const className = [
    'layout',
    menuOpen && 'layout--menu-open',
    collapsed && 'layout--collapsed',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <header className="layout__topbar">
        <button
          type="button"
          className="layout__menu-btn"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="main-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
        <BrandLogo variant="isotype" tone="white" className="layout__topbar-logo" />
        <span className="layout__topbar-title">Santa Rosa</span>
      </header>

      <aside id="main-sidebar" className="layout__sidebar">
        <div className="layout__brand">
          <BrandLogo tone="white" className="layout__brand-full" />
          <BrandLogo variant="isotype" tone="white" className="layout__brand-mark" />
        </div>

        <button
          type="button"
          className="layout__collapse-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!collapsed}
          aria-controls="main-sidebar"
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
        </button>

        <nav aria-label="Principal" className="layout__nav">
          {groups.map((group) => (
            <div key={group.title ?? 'main'} className="layout__nav-group">
              {group.title && <span className="layout__nav-title">{group.title}</span>}
              <ul>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={closeMenu}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon name={item.icon} />
                      <span className="layout__label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="layout__user">
          <div className="layout__user-info" title={collapsed ? user?.fullName : undefined}>
            <span className="avatar">{user?.fullName.trim()[0]?.toUpperCase() ?? '?'}</span>
            <div className="layout__label">
              <strong>{user?.fullName}</strong>
              <span>@{user?.username}</span>
            </div>
          </div>
          <NavLink
            to={AUTH_ROUTES.profile}
            className="layout__user-link"
            onClick={closeMenu}
            title={collapsed ? 'Mi perfil' : undefined}
          >
            <Icon name="user" size={16} />
            <span className="layout__label">Mi perfil</span>
          </NavLink>
          <NavLink
            to={AUTH_ROUTES.changePassword}
            className="layout__user-link"
            onClick={closeMenu}
            title={collapsed ? 'Cambiar contraseña' : undefined}
          >
            <Icon name="key" size={16} />
            <span className="layout__label">Cambiar contraseña</span>
          </NavLink>
          <button
            type="button"
            className="layout__user-link"
            onClick={() => void logout()}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <Icon name="logout" size={16} />
            <span className="layout__label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="layout__scrim" aria-hidden="true" onClick={closeMenu} />

      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  )
}
