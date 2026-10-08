import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { usersApi } from '../api/users.api'
import type {
  AssignPermissionsRequest,
  ChangeUserStatusRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserDetail,
  UserFilters,
} from '../types/user.types'

export const usersKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => [...usersKeys.all, 'list', filters] as const,
  detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: ({ signal }) => usersApi.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: usersKeys.detail(id ?? ''),
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  })
}

/**
 * Tras modificar un usuario: guarda el detalle devuelto, invalida los listados y,
 * si es el usuario de la sesión, recarga sus permisos (rigen de inmediato).
 */
function useOnUserChanged() {
  const queryClient = useQueryClient()
  const { user: sessionUser, refreshUser } = useAuth()
  return async (user: UserDetail) => {
    queryClient.setQueryData(usersKeys.detail(user.id), user)
    await queryClient.invalidateQueries({ queryKey: [...usersKeys.all, 'list'] })
    if (user.id === sessionUser?.id) await refreshUser()
  }
}

export function useCreateUser() {
  const onChanged = useOnUserChanged()
  return useMutation({
    mutationFn: (body: CreateUserRequest) => usersApi.create(body),
    onSuccess: onChanged,
  })
}

export function useUpdateUser() {
  const onChanged = useOnUserChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) => usersApi.update(id, body),
    onSuccess: onChanged,
  })
}

export function useChangeUserStatus() {
  const onChanged = useOnUserChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeUserStatusRequest }) =>
      usersApi.changeStatus(id, body),
    onSuccess: onChanged,
  })
}

export function useAssignUserRoles() {
  const onChanged = useOnUserChanged()
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      usersApi.assignRoles(id, roleIds),
    onSuccess: onChanged,
  })
}

export function useAssignUserPermissions() {
  const onChanged = useOnUserChanged()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssignPermissionsRequest }) =>
      usersApi.assignPermissions(id, body),
    onSuccess: onChanged,
  })
}

export function useResetUserPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      usersApi.resetPassword(id, newPassword),
    // El backend desbloquea la cuenta y exige cambio de contraseña: recargar el detalle.
    onSuccess: (_data, { id }) => queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: usersKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: [...usersKeys.all, 'list'] })
    },
  })
}
