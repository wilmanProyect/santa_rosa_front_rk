# Santa Rosa API

Referencia de los endpoints del backend. Todo el tráfico es JSON.

|  |  |
| --- | --- |
| Base local | `http://localhost:3000` |
| Swagger | `/docs` |
| Autenticación | `Authorization: Bearer <accessToken>` |
| Admin inicial | `admin` / `Admin123` (obliga a cambiar la contraseña) |
| CORS | Solo los orígenes listados en `CORS_ORIGINS` del backend (por defecto `http://localhost:5173`) |

Salvo los marcados como **Público**, todos los endpoints exigen un access token. La columna **Permiso** indica el permiso adicional requerido.

## Índice

- [Convenciones](#convenciones)
- [Flujo de autenticación](#flujo-de-autenticación)
- [Errores](#errores)
- [Catálogo de permisos](#catálogo-de-permisos)
- [Resumen de endpoints](#resumen-de-endpoints)
- [Autenticación](#autenticación)
- [Usuarios](#usuarios)
- [Roles y permisos](#roles-y-permisos)
- [Áreas](#áreas)
- [Sistema](#sistema)
- [Modelos de respuesta](#modelos-de-respuesta)
- [Valores fijos](#valores-fijos)

---

## Convenciones

- **Fechas:** con hora en ISO 8601 UTC (`2026-10-07T15:30:00.000Z`); sin hora como `YYYY-MM-DD` (nacimiento, fecha de baja).
- **IDs:** todos son UUID. Un ID mal formado en la URL devuelve `400`.
- **Campos desconocidos:** se rechazan con `400`. Envíe solo los campos documentados.
- **PATCH** actualiza solo los campos enviados. En los campos *anulables*, enviar `null` los vacía.
- **PUT** sobre `/users/:id/roles` o `/users/:id/permissions` **reemplaza la lista completa**; los IDs repetidos se ignoran.
- **Borrados:** son lógicos. El registro deja de aparecer pero se conserva para auditoría.
- **Auditoría:** los recursos devuelven `createdAt`, `createdBy`, `updatedAt`, `updatedBy` (IDs de usuario; `null` si los creó el sistema).

### Paginación

Los listados paginados aceptan `?page=1&limit=20` (límite máximo 100) y responden:

```json
{ "items": [], "total": 57, "page": 1, "limit": 20 }
```

---

## Flujo de autenticación

1. **Login** con `POST /auth/login`. Guarde `accessToken` (dura 15 min) y `refreshToken` (dura 7 días).
2. Envíe `Authorization: Bearer <accessToken>` en cada petición.
3. Si el login devuelve `mustChangePassword: true`, muestre la pantalla de cambio de contraseña. Hasta cambiarla, el resto de endpoints responde `403`; solo funcionan `GET /auth/me`, `PUT /auth/me/password` y los de logout.
4. Cuando el access token expire (`401`), llame a `POST /auth/refresh`. Devuelve un access token y un refresh token **nuevos**: reemplace ambos. El refresh token anterior deja de servir.
5. Si el refresh también falla con `401`, mande al usuario al login.

> **Efecto inmediato.** Cada petición se valida contra la base de datos. Dar de baja a un usuario, restablecer su contraseña o cerrar su sesión le corta el acceso en la siguiente petición. Los cambios de roles y permisos también rigen de inmediato, sin volver a iniciar sesión.

**Bloqueo por intentos fallidos:** tras 5 contraseñas incorrectas seguidas, la cuenta se bloquea 15 minutos (configurable con `AUTH_MAX_FAILED_ATTEMPTS` y `AUTH_LOCK_MINUTES`). Durante el bloqueo, incluso la contraseña correcta devuelve `401` con el tiempo restante. Un administrador puede desbloquearla restableciendo la contraseña.

**Política de contraseñas:** entre 8 y 72 caracteres, con al menos una mayúscula, una minúscula y un número.

---

## Errores

```json
{
  "statusCode": 409,
  "message": "Ya existe un rol con el nombre \"Contador\"",
  "error": "Conflict"
}
```

En errores de validación, `message` es una lista con un texto por campo:

```json
{
  "statusCode": 400,
  "message": ["El número de CI no tiene un formato válido", "email must be an email"],
  "error": "Bad Request"
}
```

| Código | Significado |
| --- | --- |
| `400` | Datos inválidos, regla de negocio violada (p. ej. editar el rol Administrador) o contraseña que no cumple la política. |
| `401` | Sin token, token inválido o expirado, sesión cerrada, usuario dado de baja o credenciales incorrectas. |
| `403` | Falta un permiso (el mensaje indica cuál) o el usuario debe cambiar su contraseña primero. |
| `404` | El recurso no existe, o el área indicada está inactiva. |
| `409` | Duplicado (usuario, correo, CI, nombre de rol o área) o recurso en uso que no se puede eliminar. |

---

## Catálogo de permisos

Los define el sistema en [`permission-catalog.ts`](../src/modules/roles-permissions/domain/permission-catalog.ts) y se sincronizan con la base de datos al arrancar. Se asignan a roles o, de forma individual, a usuarios. El rol **Administrador** tiene siempre todos. La lista con IDs se obtiene en `GET /roles/permissions`.

| Código | Módulo | Permite |
| --- | --- | --- |
| `users:read` | Usuarios | Ver usuarios y sus detalles |
| `users:create` | Usuarios | Crear usuarios |
| `users:update` | Usuarios | Editar los datos de los usuarios |
| `users:change-status` | Usuarios | Activar o dar de baja usuarios |
| `users:assign-roles` | Usuarios | Asignar roles a usuarios |
| `users:assign-permissions` | Usuarios | Otorgar o quitar permisos individuales |
| `users:reset-password` | Usuarios | Restablecer la contraseña de otros usuarios |
| `users:delete` | Usuarios | Eliminar usuarios |
| `roles:read` | Roles y permisos | Ver roles y el catálogo de permisos |
| `roles:create` | Roles y permisos | Crear roles |
| `roles:update` | Roles y permisos | Editar roles y sus permisos |
| `roles:delete` | Roles y permisos | Eliminar roles |
| `areas:read` | Áreas | Ver áreas |
| `areas:create` | Áreas | Crear áreas |
| `areas:update` | Áreas | Editar áreas |
| `areas:delete` | Áreas | Eliminar áreas |
| `audit:read` | Auditoría | Ver el historial de inicios de sesión |

**Permisos efectivos** = permisos de los roles activos del usuario + permisos otorgados individualmente − permisos denegados individualmente. Una denegación gana sobre lo que digan los roles. El frontend puede usar `effectivePermissions` (o `user.permissions` en el login) para mostrar u ocultar opciones.

---

## Resumen de endpoints

| Método | Ruta | Permiso |
| --- | --- | --- |
| `POST` | [`/auth/login`](#post-authlogin) | Público |
| `POST` | [`/auth/refresh`](#post-authrefresh) | Público |
| `POST` | [`/auth/logout`](#post-authlogout) | Autenticado |
| `POST` | [`/auth/logout-all`](#post-authlogout-all) | Autenticado |
| `GET` | [`/auth/me`](#get-authme) | Autenticado |
| `PUT` | [`/auth/me/password`](#put-authmepassword) | Autenticado |
| `GET` | [`/auth/login-history`](#get-authlogin-history) | `audit:read` |
| `POST` | [`/users`](#post-users) | `users:create` |
| `GET` | [`/users`](#get-users) | `users:read` |
| `GET` | [`/users/:id`](#get-usersid) | `users:read` |
| `PATCH` | [`/users/:id`](#patch-usersid) | `users:update` |
| `PATCH` | [`/users/:id/status`](#patch-usersidstatus) | `users:change-status` |
| `PUT` | [`/users/:id/roles`](#put-usersidroles) | `users:assign-roles` |
| `PUT` | [`/users/:id/permissions`](#put-usersidpermissions) | `users:assign-permissions` |
| `POST` | [`/users/:id/reset-password`](#post-usersidreset-password) | `users:reset-password` |
| `DELETE` | [`/users/:id`](#delete-usersid) | `users:delete` |
| `POST` | [`/roles`](#post-roles) | `roles:create` |
| `GET` | [`/roles`](#get-roles) | `roles:read` |
| `GET` | [`/roles/permissions`](#get-rolespermissions) | `roles:read` |
| `GET` | [`/roles/:id`](#get-rolesid) | `roles:read` |
| `PATCH` | [`/roles/:id`](#patch-rolesid) | `roles:update` |
| `DELETE` | [`/roles/:id`](#delete-rolesid) | `roles:delete` |
| `POST` | [`/areas`](#post-areas) | `areas:create` |
| `GET` | [`/areas`](#get-areas) | `areas:read` |
| `GET` | [`/areas/:id`](#get-areasid) | `areas:read` |
| `PATCH` | [`/areas/:id`](#patch-areasid) | `areas:update` |
| `DELETE` | [`/areas/:id`](#delete-areasid) | `areas:delete` |
| `GET` | [`/`](#get-) | Público |

---

## Autenticación

### `POST /auth/login`

**Público.** Inicia sesión con usuario y contraseña. El usuario no distingue mayúsculas ni espacios alrededor. Cada intento, exitoso o fallido, queda en el historial.

```json
{ "username": "admin", "password": "Admin123" }
```

**200 OK**

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOi...",
  "expiresIn": 900,
  "refreshToken": "Qm9c...x7",
  "refreshTokenExpiresAt": "2026-10-14T15:30:00.000Z",
  "mustChangePassword": true,
  "user": {
    "...": "campos de UsuarioResumen",
    "permissions": ["areas:read", "users:read"]
  }
}
```

| Código | Causa |
| --- | --- |
| `401` | Usuario o contraseña incorrectos (mismo mensaje si el usuario no existe). |
| `401` | Cuenta bloqueada por demasiados intentos fallidos, con los minutos restantes. |
| `401` | El usuario está inactivo (solo se informa si la contraseña era correcta). |

### `POST /auth/refresh`

**Público.** Entrega un access token nuevo y **rota** el refresh token: el enviado queda invalidado y se devuelve uno nuevo. Si alguien reutiliza un refresh token ya rotado, se cierran todas las sesiones de ese usuario como medida de seguridad.

```json
{ "refreshToken": "Qm9c...x7" }
```

**200 OK**

```json
{
  "tokenType": "Bearer",
  "accessToken": "eyJhbGciOi...",
  "expiresIn": 900,
  "refreshToken": "nuevo...",
  "refreshTokenExpiresAt": "2026-10-14T15:45:00.000Z"
}
```

`401` si la sesión es inválida o expiró.

### `POST /auth/logout`

**Autenticado** (permitido con cambio de contraseña pendiente). Cierra la sesión actual; su access token y su refresh token dejan de funcionar al instante. Sin body. Responde `204`.

### `POST /auth/logout-all`

**Autenticado** (permitido con cambio de contraseña pendiente). Cierra todas las sesiones del usuario en todos sus dispositivos, incluida la actual. Sin body. Responde `204`.

### `GET /auth/me`

**Autenticado** (permitido con cambio de contraseña pendiente). Devuelve un [UsuarioDetalle](#usuariodetalle) del usuario autenticado, con sus roles y permisos efectivos.

### `PUT /auth/me/password`

**Autenticado** (permitido con cambio de contraseña pendiente). Cambia la propia contraseña. Cierra todas las sesiones del usuario (también en otros dispositivos) y devuelve tokens nuevos: reemplace los que tenía guardados.

```json
{ "currentPassword": "Admin123", "newPassword": "NuevaClave2026" }
```

**200 OK:** mismos campos que [`/auth/refresh`](#post-authrefresh).

| Código | Causa |
| --- | --- |
| `400` | La contraseña actual es incorrecta. |
| `400` | La nueva contraseña no cumple la política o es igual a la actual. |

### `GET /auth/login-history`

**Permiso:** `audit:read`. Paginado. Historial de intentos de inicio de sesión, del más reciente al más antiguo.

| Query | Tipo | Descripción |
| --- | --- | --- |
| `userId` | uuid | Solo los intentos de ese usuario. |
| `success` | `true` \| `false` | Solo exitosos o solo fallidos. |
| `page`, `limit` | int | Paginación (por defecto 1 y 20). |

Cada item:

```json
{
  "id": "6f1c...",
  "userId": "a3b2...",
  "username": "jperez",
  "success": false,
  "failureReason": "INVALID_CREDENTIALS",
  "ip": "192.168.1.20",
  "userAgent": "Mozilla/5.0 ...",
  "createdAt": "2026-10-07T15:30:00.000Z"
}
```

`userId` es `null` si el usuario escrito no existe. `failureReason` es `null` en los intentos exitosos (ver [valores fijos](#valores-fijos)).

---

## Usuarios

### `POST /users`

**Permiso:** `users:create`. Crea un usuario activo. La contraseña enviada es temporal: el usuario deberá cambiarla en su primer ingreso.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `firstName` **\*** | string | Nombre(s). Máx. 100. |
| `paternalLastName` **\*** | string | Máx. 100. |
| `maternalLastName` | string | Opcional, para personas con un solo apellido. Máx. 100. |
| `ciNumber` **\*** | string | 4 a 12 dígitos, con complemento opcional: `1234567` o `1234567-1B`. Único. |
| `username` **\*** | string | 3 a 30 caracteres: letras, números, `.` `-` `_`. Se guarda en minúsculas. Único. |
| `email` **\*** | string | Correo válido, máx. 150. Se guarda en minúsculas. Único. |
| `password` **\*** | string | Según la [política de contraseñas](#flujo-de-autenticación). |
| `birthDate` **\*** | `YYYY-MM-DD` | No puede ser futura. |
| `phone` | string | 6 a 20 caracteres: dígitos, espacios, guiones y `+` inicial. |
| `position` | string | Cargo. Máx. 100. |
| `areaId` | uuid | Área activa. |
| `roleIds` | uuid[] | Roles activos. |

**\*** obligatorio.

```json
{
  "firstName": "Juan Carlos",
  "paternalLastName": "Pérez",
  "maternalLastName": "Gómez",
  "ciNumber": "1234567",
  "username": "jperez",
  "email": "juan.perez@example.com",
  "password": "Temporal123",
  "birthDate": "1990-05-21",
  "phone": "+591 71234567",
  "position": "Asistente contable",
  "areaId": "8d0e...",
  "roleIds": ["c41a..."]
}
```

**201 Created:** un [UsuarioDetalle](#usuariodetalle) con `mustChangePassword: true`.

| Código | Causa |
| --- | --- |
| `400` | Validación, contraseña débil o rol inactivo. |
| `404` | Área o rol inexistente, o área inactiva. |
| `409` | Usuario, correo o CI ya registrados. |

### `GET /users`

**Permiso:** `users:read`. Paginado. Lista usuarios ordenados por apellido paterno y nombre. No incluye los eliminados.

| Query | Tipo | Descripción |
| --- | --- | --- |
| `search` | string | Busca (sin distinguir mayúsculas) en nombre, apellidos, usuario, CI y correo. |
| `status` | `ACTIVE` \| `INACTIVE` | Filtra por estado. |
| `areaId` | uuid | Filtra por área. |
| `page`, `limit` | int | Paginación (por defecto 1 y 20, máx. 100). |

**200 OK:** `{ items: UsuarioResumen[], total, page, limit }`. Ver [UsuarioResumen](#usuarioresumen).

### `GET /users/:id`

**Permiso:** `users:read`. Devuelve un [UsuarioDetalle](#usuariodetalle) con roles, ajustes individuales de permisos y permisos efectivos. `404` si no existe.

### `PATCH /users/:id`

**Permiso:** `users:update`. Actualiza datos personales, usuario o área. Solo cambian los campos enviados; mismas reglas que en la creación.

- Campos: `firstName`, `paternalLastName`, `ciNumber`, `username`, `email`, `birthDate`.
- Anulables (envíe `null` para vaciarlos): `maternalLastName`, `phone`, `position`, `areaId`.
- La contraseña, el estado y los roles tienen endpoints propios.

```json
{ "position": "Contador", "areaId": null }
```

**200 OK:** el [UsuarioDetalle](#usuariodetalle) actualizado. Errores como en la creación.

### `PATCH /users/:id/status`

**Permiso:** `users:change-status`. Da de baja o reactiva a un usuario. Al darlo de baja pierde el acceso de inmediato. Al reactivarlo se borran el motivo, la fecha y las observaciones.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `status` **\*** | `ACTIVE` \| `INACTIVE` | |
| `reason` | enum | Obligatorio si `status` es `INACTIVE`. Ver [motivos de baja](#valores-fijos). |
| `date` | `YYYY-MM-DD` | Fecha de baja. Por defecto, hoy. |
| `notes` | string | Observaciones. Máx. 500. |

```json
{
  "status": "INACTIVE",
  "reason": "RESIGNATION",
  "date": "2026-10-07",
  "notes": "Renuncia presentada el 30/09"
}
```

**200 OK:** el [UsuarioDetalle](#usuariodetalle) actualizado. `400` si intenta darse de baja a sí mismo.

### `PUT /users/:id/roles`

**Permiso:** `users:assign-roles`. Reemplaza todos los roles del usuario. Una lista vacía le quita todos.

```json
{ "roleIds": ["c41a...", "77be..."] }
```

**200 OK:** el [UsuarioDetalle](#usuariodetalle) actualizado.

| Código | Causa |
| --- | --- |
| `400` | Algún rol está inactivo. |
| `400` | No puede quitarse a sí mismo el rol de Administrador. |
| `404` | Algún rol no existe (el mensaje lista cuáles). |

### `PUT /users/:id/permissions`

**Permiso:** `users:assign-permissions`. Reemplaza los ajustes individuales de permisos del usuario, que se suman o restan a lo que hereda de sus roles. Envíe ambas listas vacías para quitar todos los ajustes.

```json
{
  "grantedPermissionIds": ["<id de audit:read>"],
  "deniedPermissionIds": ["<id de users:delete>"]
}
```

**200 OK:** el [UsuarioDetalle](#usuariodetalle) actualizado.

| Código | Causa |
| --- | --- |
| `400` | El mismo permiso aparece en ambas listas. |
| `404` | Algún permiso no existe. |

### `POST /users/:id/reset-password`

**Permiso:** `users:reset-password`. Asigna una contraseña temporal, desbloquea la cuenta y obliga al usuario a cambiarla en su próximo ingreso. Todas sus sesiones abiertas se cierran.

```json
{ "newPassword": "Temporal123" }
```

Responde `204`. `400` si la contraseña no cumple la política.

### `DELETE /users/:id`

**Permiso:** `users:delete`. Elimina al usuario (borrado lógico). Su usuario, correo y CI quedan libres para un registro nuevo. Para retiros de personal, prefiera [dar de baja](#patch-usersidstatus), que conserva el motivo.

Responde `204`. `400` si intenta eliminarse a sí mismo.

---

## Roles y permisos

El rol **Administrador** (`isSystem: true`) lo crea el sistema: siempre tiene todos los permisos y no se puede renombrar, desactivar, eliminar ni cambiar sus permisos. Intentarlo devuelve `400`.

### `POST /roles`

**Permiso:** `roles:create`. Crea un rol activo, opcionalmente ligado a un área.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `name` **\*** | string | 3 a 100 caracteres. Único. |
| `description` | string | Máx. 255. |
| `areaId` | uuid | Área activa. |
| `permissionIds` | uuid[] | IDs de [`GET /roles/permissions`](#get-rolespermissions). |

```json
{
  "name": "Contador",
  "description": "Registro de asientos contables",
  "areaId": "8d0e...",
  "permissionIds": ["5a1f...", "9e33..."]
}
```

**201 Created:** un [Rol](#rol).

| Código | Causa |
| --- | --- |
| `404` | Área o permiso inexistente, o área inactiva. |
| `409` | Ya existe un rol con ese nombre. |

### `GET /roles`

**Permiso:** `roles:read`. Lista los roles ordenados por nombre, con sus permisos (sin paginación). Use `areaId` para mostrar solo los roles del área de un usuario al asignarle roles.

| Query | Tipo | Descripción |
| --- | --- | --- |
| `areaId` | uuid | Solo roles de esa área. |
| `isActive` | `true` \| `false` | Solo activos o solo inactivos. |

**200 OK:** [Rol](#rol)[].

### `GET /roles/permissions`

**Permiso:** `roles:read`. Catálogo completo de permisos, ordenado por módulo. Úselo para armar la pantalla de asignación agrupada por `module`.

```json
[
  { "id": "5a1f...", "code": "areas:create", "module": "Áreas", "description": "Crear áreas" }
]
```

### `GET /roles/:id`

**Permiso:** `roles:read`. Devuelve un [Rol](#rol). `404` si no existe.

### `PATCH /roles/:id`

**Permiso:** `roles:update`. Actualiza el rol. `permissionIds` reemplaza la lista completa de permisos. Los cambios rigen de inmediato para todos los usuarios con ese rol. Un rol inactivo deja de aportar permisos.

- Campos: `name`, `description`, `isActive`, `permissionIds`.
- Anulable: `areaId`.

```json
{ "isActive": false }
```

**200 OK:** el [Rol](#rol) actualizado.

| Código | Causa |
| --- | --- |
| `400` | Modificación no permitida sobre el rol Administrador. |
| `404` | Rol, área o permiso inexistente. |
| `409` | Nombre duplicado. |

### `DELETE /roles/:id`

**Permiso:** `roles:delete`. Elimina un rol que no esté asignado a ningún usuario.

| Código | Causa |
| --- | --- |
| `204` | Eliminado. |
| `400` | Es el rol Administrador. |
| `409` | Está asignado a usuarios: desactívelo o reasigne a los usuarios primero. |

---

## Áreas

### `POST /areas`

**Permiso:** `areas:create`.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `name` **\*** | string | 2 a 100 caracteres. Único. |
| `description` | string | Máx. 255. |

```json
{ "name": "Contabilidad", "description": "Contabilidad general" }
```

**201 Created:** un [Área](#área). `409` si el nombre ya existe.

### `GET /areas`

**Permiso:** `areas:read`. Lista las áreas ordenadas por nombre (sin paginación). Acepta `?isActive=true|false`.

**200 OK:** [Área](#área)[].

### `GET /areas/:id`

**Permiso:** `areas:read`. Devuelve un [Área](#área). `404` si no existe.

### `PATCH /areas/:id`

**Permiso:** `areas:update`. Campos: `name`, `description`, `isActive`. Un área inactiva no se puede asignar a usuarios ni roles nuevos; las asignaciones existentes se mantienen.

**200 OK:** el [Área](#área) actualizada. `409` si el nombre ya existe.

### `DELETE /areas/:id`

**Permiso:** `areas:delete`. Elimina un área sin usuarios ni roles asignados.

| Código | Causa |
| --- | --- |
| `204` | Eliminada. |
| `409` | Tiene usuarios o roles asignados (el mensaje indica cuántos). |

---

## Sistema

### `GET /`

**Público.** Comprobación de que el servidor responde. Devuelve el texto `Hello World!`.

---

## Modelos de respuesta

### UsuarioResumen

Se usa en listados y en la respuesta del login.

```jsonc
{
  "id": "a3b2...",
  "firstName": "Juan Carlos",
  "paternalLastName": "Pérez",
  "maternalLastName": "Gómez",                         // null
  "fullName": "Juan Carlos Pérez Gómez",
  "username": "jperez",
  "email": "juan.perez@example.com",                   // null en la cuenta admin
  "ciNumber": "1234567",                               // null en la cuenta admin
  "position": "Asistente contable",                    // null
  "area": { "id": "8d0e...", "name": "Contabilidad" }, // null
  "status": "ACTIVE",                                  // ACTIVE | INACTIVE
  "inactiveReason": null,                              // ver valores fijos
  "lastLoginAt": "2026-10-07T15:30:00.000Z",           // null si nunca ingresó
  "roles": [
    { "id": "c41a...", "name": "Contador", "isActive": true, "isSystem": false }
  ]
}
```

### UsuarioDetalle

UsuarioResumen más estos campos:

```jsonc
{
  "birthDate": "1990-05-21",
  "phone": "+591 71234567",
  "inactiveDate": null,                  // "YYYY-MM-DD" si está de baja
  "inactiveNotes": null,
  "mustChangePassword": false,
  "passwordChangedAt": "2026-10-07T15:31:00.000Z",
  "lockedUntil": null,                   // fecha si la cuenta está bloqueada
  "permissionOverrides": [
    {
      "effect": "GRANT",                 // GRANT | DENY
      "permission": { "id": "...", "code": "audit:read", "module": "Auditoría", "description": "..." }
    }
  ],
  "effectivePermissions": ["audit:read", "users:read", "users:update"],
  "createdAt": "2026-10-01T12:00:00.000Z",
  "createdBy": "<id del admin>",
  "updatedAt": "2026-10-07T15:31:00.000Z",
  "updatedBy": "<id del admin>"
}
```

### Rol

```jsonc
{
  "id": "c41a...",
  "name": "Contador",
  "description": "Registro de asientos contables",
  "area": { "id": "8d0e...", "name": "Contabilidad" }, // null
  "isActive": true,
  "isSystem": false,
  "permissions": [
    { "id": "...", "code": "users:read", "module": "Usuarios", "description": "..." }
  ],
  "createdAt": "...", "createdBy": "...",
  "updatedAt": "...", "updatedBy": "..."
}
```

### Área

```json
{
  "id": "8d0e...",
  "name": "Contabilidad",
  "description": "Contabilidad general",
  "isActive": true,
  "createdAt": "...", "createdBy": "...",
  "updatedAt": "...", "updatedBy": "..."
}
```

---

## Valores fijos

| Valor | Campo | Significado |
| --- | --- | --- |
| `ACTIVE` / `INACTIVE` | `status` | Usuario activo o dado de baja |
| `RESIGNATION` | `inactiveReason` | Renuncia |
| `DISMISSAL` | `inactiveReason` | Despido |
| `MEDICAL_LEAVE` | `inactiveReason` | Baja médica |
| `SUSPENSION` | `inactiveReason` | Suspensión |
| `OTHER` | `inactiveReason` | Otro motivo (detallar en observaciones) |
| `GRANT` / `DENY` | `permissionOverrides.effect` | Permiso otorgado o quitado individualmente |
| `INVALID_CREDENTIALS` | `failureReason` | Usuario o contraseña incorrectos |
| `ACCOUNT_LOCKED` | `failureReason` | Cuenta bloqueada por intentos fallidos |
| `USER_INACTIVE` | `failureReason` | Usuario dado de baja |
