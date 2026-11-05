import { createBrowserRouter } from 'react-router'
import {
  AnimalFormPage,
  AnimalsPage,
  ANIMALS_ROUTES,
  CatalogsPage,
  WeighingBatchPage,
} from '@/features/animals'
import { AreasPage, AREAS_ROUTES } from '@/features/areas'
import { AUDIT_ROUTES, LoginHistoryPage } from '@/features/audit'
import { BackupsPage, BACKUPS_ROUTES } from '@/features/backups'
import {
  HealthBatchPage,
  HealthRecordsPage,
  HEALTH_ROUTES,
  VeterinaryProductsPage,
} from '@/features/health'
import {
  AUTH_ROUTES,
  ChangePasswordPage,
  LoginPage,
  ProfilePage,
  RequireAuth,
  RequirePermission,
} from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'
import { RoleEditorPage, RolesPage, ROLES_ROUTES } from '@/features/roles'
import { UserDetailPage, UsersPage, USERS_ROUTES } from '@/features/users'
import { PERMISSIONS } from '@/shared/config/permissions'
import { MainLayout } from '../layouts/MainLayout'
import { AnimalDetailRoute } from './AnimalDetailRoute'
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
          { path: AUTH_ROUTES.profile, element: <ProfilePage /> },
          {
            element: <RequirePermission permissions={[PERMISSIONS.ANIMALS_READ]} />,
            children: [
              { path: ANIMALS_ROUTES.list, element: <AnimalsPage /> },
              { path: ANIMALS_ROUTES.detailPattern, element: <AnimalDetailRoute /> },
            ],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.ANIMALS_CREATE]} />,
            children: [{ path: ANIMALS_ROUTES.create, element: <AnimalFormPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.ANIMALS_UPDATE]} />,
            children: [{ path: ANIMALS_ROUTES.editPattern, element: <AnimalFormPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.ANIMAL_CATALOGS_MANAGE]} />,
            children: [{ path: ANIMALS_ROUTES.catalogs, element: <CatalogsPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.WEIGHINGS_WRITE]} />,
            children: [{ path: ANIMALS_ROUTES.weighingBatch, element: <WeighingBatchPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.HEALTH_READ]} />,
            children: [
              { path: HEALTH_ROUTES.records, element: <HealthRecordsPage /> },
              { path: HEALTH_ROUTES.products, element: <VeterinaryProductsPage /> },
            ],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.HEALTH_WRITE]} />,
            children: [{ path: HEALTH_ROUTES.batch, element: <HealthBatchPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.AUDIT_READ]} />,
            children: [{ path: AUDIT_ROUTES.loginHistory, element: <LoginHistoryPage /> }],
          },
          {
            element: <RequirePermission permissions={[PERMISSIONS.BACKUPS_CREATE]} />,
            children: [{ path: BACKUPS_ROUTES.page, element: <BackupsPage /> }],
          },
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
