import { createBrowserRouter } from 'react-router'
import { AreasPage, AREAS_ROUTES } from '@/features/areas'
import {
  AUTH_ROUTES,
  ChangePasswordPage,
  LoginPage,
  RequireAuth,
  RequirePermission,
} from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { RoleEditorPage, RolesPage, ROLES_ROUTES } from '@/features/roles'
import { UserDetailPage, UsersPage, USERS_ROUTES } from '@/features/users'
import { PERMISSIONS } from '@/shared/config/permissions'
import { MainLayout } from '../layouts/MainLayout'
import { NAVIGATION } from '../navigation'
import { NotFoundPage } from './NotFoundPage'

export const router = createBrowserRouter([
  { path: AUTH_ROUTES.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: AUTH_ROUTES.changePassword, element: <ChangePasswordPage /> },
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <DashboardPage modules={NAVIGATION} /> },
          {
            element: <RequirePermission permissions={[PERMISSIONS.USERS_READ]} />,
            children: [
              { path: USERS_ROUTES.list, element: <UsersPage /> },
              { path: USERS_ROUTES.detailPattern, element: <UserDetailPage /> },
            ],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.ROLES_READ]} />,
            children: [
              { path: ROLES_ROUTES.list, element: <RolesPage /> },
              { path: ROLES_ROUTES.detailPattern, element: <RoleEditorPage /> },
            ],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.ROLES_CREATE]} />,
            children: [{ path: ROLES_ROUTES.create, element: <RoleEditorPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.AREAS_READ]} />,
            children: [{ path: AREAS_ROUTES.list, element: <AreasPage /> }],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
