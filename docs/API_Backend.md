# Santa Rosa API

Referencia de los endpoints del backend. Todo el tráfico es JSON, salvo la subida y descarga del [certificado ABSID](#put-animalsidcertificate-file).

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
- [Razas y colores](#razas-y-colores)
- [Animales](#animales)
- [Fotos de animales](#fotos-de-animales)
- [Control de peso](#control-de-peso)
- [Productos veterinarios](#productos-veterinarios)
- [Registro sanitario](#registro-sanitario)
- [Recordatorios](#recordatorios)
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
| `404` | El recurso no existe, o el área, raza o color indicado está inactivo. |
| `409` | Duplicado (usuario, correo, CI, nombre de rol, área, raza, color o producto veterinario, arete / registro ABSID de un animal, o un segundo pesaje de nacimiento o destete), recurso en uso que no se puede eliminar, cambio que rompería la genealogía o faena en período de retiro. |
| `413` | El archivo subido supera el tamaño máximo. |

Algunos errores traen además un campo `code` para que el frontend los reconozca sin leer el mensaje:

| `code` | Estado | Cuándo |
| --- | --- | --- |
| `DUPLICATE_IDENTIFIER` | `409` | Arete o ABSID repetido; se puede reintentar como [caso especial](#arete-y-registro-absid-caso-especial). |
| `DUPLICATE_EAR_TAG_AND_ABSID` | `409` | Misma combinación arete + ABSID que otro animal. |
| `DUPLICATE_PHOTO` | `409` | La misma foto ya está en el historial del animal. |
| `DUPLICATE_WEIGHING_TYPE` | `409` | El animal ya tiene un pesaje de nacimiento o de destete. |
| `WITHDRAWAL_PERIOD` | `409` | Faena de un animal en [período de retiro](#período-de-retiro). Trae `withdrawal`. |

En los lotes (`/weighings/batch`, `/health-records/batch`), el `400` trae `errors: [{ animalId, message }]` con cada animal que falló.

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
| `animals:read` | Animales | Ver animales, su genealogía y los catálogos de razas y colores |
| `animals:create` | Animales | Registrar animales |
| `animals:update` | Animales | Editar los datos de los animales y su certificado ABSID |
| `animals:change-status` | Animales | Registrar la salida de animales (muerte, venta, faena, regalo) |
| `animals:delete` | Animales | Eliminar animales registrados por error |
| `animal-catalogs:manage` | Animales | Administrar los catálogos de razas y colores |
| `animal-photos:upload` | Animales | Subir fotos de animales, corregir su descripción y fecha, y elegir la foto principal |
| `animal-photos:delete` | Animales | Eliminar fotos del historial de los animales |
| `animals:issue-certificate` | Animales | Emitir el certificado (PDF) con toda la información del animal |
| `weighings:write` | Control de peso | Registrar, corregir y eliminar pesajes (verlos solo requiere `animals:read`) |
| `health:read` | Sanidad | Ver el registro sanitario, los eventos generales y el catálogo de productos veterinarios |
| `health:write` | Sanidad | Registrar, corregir y eliminar eventos sanitarios y de manejo |
| `health:override-withdrawal` | Sanidad | Autorizar la faena de un animal en período de retiro |
| `veterinary-products:manage` | Sanidad | Administrar el catálogo de productos veterinarios |
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
| `POST` | [`/breeds`](#razas-breeds) | `animal-catalogs:manage` |
| `GET` | [`/breeds`](#razas-breeds) | `animals:read` |
| `GET` | [`/breeds/:id`](#razas-breeds) | `animals:read` |
| `PATCH` | [`/breeds/:id`](#razas-breeds) | `animal-catalogs:manage` |
| `DELETE` | [`/breeds/:id`](#razas-breeds) | `animal-catalogs:manage` |
| `POST` | [`/animal-colors`](#colores-animal-colors) | `animal-catalogs:manage` |
| `GET` | [`/animal-colors`](#colores-animal-colors) | `animals:read` |
| `GET` | [`/animal-colors/:id`](#colores-animal-colors) | `animals:read` |
| `PATCH` | [`/animal-colors/:id`](#colores-animal-colors) | `animal-catalogs:manage` |
| `DELETE` | [`/animal-colors/:id`](#colores-animal-colors) | `animal-catalogs:manage` |
| `POST` | [`/animals`](#post-animals) | `animals:create` |
| `GET` | [`/animals`](#get-animals) | `animals:read` |
| `GET` | [`/animals/:id`](#get-animalsid) | `animals:read` |
| `PATCH` | [`/animals/:id`](#patch-animalsid) | `animals:update` |
| `PATCH` | [`/animals/:id/status`](#patch-animalsidstatus) | `animals:change-status` |
| `DELETE` | [`/animals/:id`](#delete-animalsid) | `animals:delete` |
| `PUT` | [`/animals/:id/certificate-file`](#put-animalsidcertificate-file) | `animals:update` |
| `GET` | [`/animals/:id/certificate-file`](#get-animalsidcertificate-file) | `animals:read` |
| `DELETE` | [`/animals/:id/certificate-file`](#delete-animalsidcertificate-file) | `animals:update` |
| `GET` | [`/animals/:id/certificate`](#get-animalsidcertificate) | `animals:issue-certificate` |
| `POST` | [`/animals/:animalId/photos`](#post-animalsanimalidphotos) | `animal-photos:upload` |
| `GET` | [`/animals/:animalId/photos`](#get-animalsanimalidphotos) | `animals:read` |
| `GET` | [`/animals/:animalId/photos/:photoId`](#get-animalsanimalidphotosphotoid) | `animals:read` |
| `PATCH` | [`/animals/:animalId/photos/:photoId`](#patch-animalsanimalidphotosphotoid) | `animal-photos:upload` |
| `PUT` | [`/animals/:animalId/photos/:photoId/primary`](#put-animalsanimalidphotosphotoidprimary) | `animal-photos:upload` |
| `DELETE` | [`/animals/:animalId/photos/:photoId`](#delete-animalsanimalidphotosphotoid) | `animal-photos:delete` |
| `GET` | [`/animals/:animalId/weighings`](#get-animalsanimalidweighings) | `animals:read` |
| `POST` | [`/animals/:animalId/weighings`](#post-animalsanimalidweighings) | `weighings:write` |
| `PATCH` | [`/animals/:animalId/weighings/:id`](#patch--delete-animalsanimalidweighingsid) | `weighings:write` |
| `DELETE` | [`/animals/:animalId/weighings/:id`](#patch--delete-animalsanimalidweighingsid) | `weighings:write` |
| `POST` | [`/weighings/batch`](#post-weighingsbatch) | `weighings:write` |
| `POST` | [`/veterinary-products`](#productos-veterinarios) | `veterinary-products:manage` |
| `GET` | [`/veterinary-products`](#productos-veterinarios) | `health:read` |
| `GET` | [`/veterinary-products/:id`](#productos-veterinarios) | `health:read` |
| `PATCH` | [`/veterinary-products/:id`](#productos-veterinarios) | `veterinary-products:manage` |
| `DELETE` | [`/veterinary-products/:id`](#productos-veterinarios) | `veterinary-products:manage` |
| `POST` | [`/health-records`](#post-health-records) | `health:write` |
| `POST` | [`/health-records/batch`](#post-health-recordsbatch) | `health:write` |
| `GET` | [`/health-records`](#get-health-records) | `health:read` |
| `GET` | [`/health-records/:id`](#get--patch--delete-health-recordsid) | `health:read` |
| `PATCH` | [`/health-records/:id`](#get--patch--delete-health-recordsid) | `health:write` |
| `DELETE` | [`/health-records/:id`](#get--patch--delete-health-recordsid) | `health:write` |
| `GET` | [`/reminders`](#recordatorios) | `animals:read` + `health:read` |
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

## Razas y colores

Catálogos que se usan al registrar animales. Ambos funcionan igual que las áreas: sin paginación, ordenados por nombre, y con `?isActive=true|false`. Un elemento inactivo no se puede asignar a animales nuevos, pero los que ya lo tienen lo conservan. Solo se puede eliminar si ningún animal lo usa; si no, desactívelo.

Los nombres se comparan **sin distinguir mayúsculas** y se guardan sin espacios sobrantes: `" merino "` y `"MERINO"` chocan con `"Merino"`.

### Razas (`/breeds`)

Cada raza pertenece a una especie. El mismo nombre puede existir en las dos especies.

| Método | Ruta | Body / Query | Permiso |
| --- | --- | --- | --- |
| `POST` | `/breeds` | `{ "species": "SHEEP", "name": "Merino" }` | `animal-catalogs:manage` |
| `GET` | `/breeds` | `?species=SHEEP\|GOAT&isActive=true\|false` | `animals:read` |
| `GET` | `/breeds/:id` | | `animals:read` |
| `PATCH` | `/breeds/:id` | `species`, `name`, `isActive` | `animal-catalogs:manage` |
| `DELETE` | `/breeds/:id` | | `animal-catalogs:manage` |

Respuesta: [Raza](#raza). `409` si el nombre ya existe en esa especie, si se intenta cambiar la especie de una raza en uso o si se elimina una raza en uso.

### Colores (`/animal-colors`)

Lista común a ovinos y caprinos, ampliable por el usuario.

| Método | Ruta | Body / Query | Permiso |
| --- | --- | --- | --- |
| `POST` | `/animal-colors` | `{ "name": "Blanco" }` (máx. 50) | `animal-catalogs:manage` |
| `GET` | `/animal-colors` | `?isActive=true\|false` | `animals:read` |
| `GET` | `/animal-colors/:id` | | `animals:read` |
| `PATCH` | `/animal-colors/:id` | `name`, `isActive` | `animal-catalogs:manage` |
| `DELETE` | `/animal-colors/:id` | | `animal-catalogs:manage` |

Respuesta: [Color](#color). `409` si el nombre ya existe o si el color está en uso al eliminarlo.

---

## Animales

Inventario de ovinos y caprinos. Hay dos tipos de registro:

- **Animales de la cabaña** (`isExternal: false`): los del inventario. Exigen origen de ingreso y arete; un animal sin arete registrado se carga como [caso especial](#arete-y-registro-absid-caso-especial). La categoría genética es opcional: se puede completar después.
- **Animales externos** (`isExternal: true`): reproductores ajenos, como un donante de semen o un carnero de otra cabaña. Se registran **solo para la genealogía**, para poder ponerlos como padre o madre. No requieren arete, no tienen datos de ingreso ni estado y no aparecen en el listado por defecto. Deben tener al menos un dato que los identifique: arete, nombre, registro ABSID o registro externo. `isExternal` no se puede cambiar después del alta.

### Arete y registro ABSID: caso especial

Se guardan sin espacios alrededor y en mayúsculas.

- **Por defecto son únicos dentro de cada especie.** Ovinos y caprinos tienen numeración y registro propios, así que un ovino y un caprino pueden tener el mismo arete o ABSID. Dentro de una especie, ningún animal normal puede repetir el arete ni el ABSID de otro animal normal. El arete solo se compara entre animales de la cabaña, porque un animal externo puede traer el arete de su cabaña de origen.
- **Caso especial.** Algunos animales existen en la cabaña con un arete o un ABSID repetido, o sin arete registrado, y, por política, no se corrigen. Se registran con `identifierException: true` y un `identifierExceptionReason` obligatorio. Un caso especial puede repetir el arete, el ABSID o ambos por separado. Nunca bloquea al animal original con el que los comparte.
- **Nunca se repite la combinación arete + ABSID**, ni siquiera como caso especial, porque sería el mismo animal cargado dos veces.

**Flujo sugerido en el frontend (botón "Caso especial"):**

1. Guarde el animal normalmente, sin `identifierException`.
2. Si responde `409` con `code: "DUPLICATE_IDENTIFIER"`, muestre el mensaje y los animales de `conflicts`, y ofrezca el botón **"Registrar como caso especial"**.
3. Al confirmarlo, pida el motivo y reenvíe la misma solicitud con `identifierException: true` e `identifierExceptionReason`.
4. Si responde `409` con `code: "DUPLICATE_EAR_TAG_AND_ABSID"`, **no** ofrezca el botón: ese caso no se permite.

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "DUPLICATE_IDENTIFIER",
  "message": "Ya hay otro animal con el arete \"SR-1\": SR-1 AB-1. Si el animal está registrado así en la cabaña, regístrelo como caso especial indicando el motivo.",
  "fields": ["earTag"],
  "conflicts": [
    { "id": "4c9a...", "earTag": "SR-1", "name": null, "absidRegistry": "AB-1", "isExternal": false }
  ]
}
```

`fields` indica qué se repite: `earTag`, `absidRegistry` o ambos. Para revisar todos los casos especiales use `GET /animals?identifierException=true`.

**Inventario actual** = `GET /animals?status=ALIVE`.

### `POST /animals`

**Permiso:** `animals:create`.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `isExternal` | boolean | Por defecto `false`. |
| `earTag` | string | Arete. Máx. 30. **Obligatorio** en animales de la cabaña, salvo como caso especial (`identifierException`) si no tiene arete registrado. |
| `name` | string | Máx. 100. |
| `species` **\*** | enum | `SHEEP` \| `GOAT`. |
| `breedId` **\*** | uuid | Raza **activa de la misma especie**. |
| `sex` **\*** | enum | `MALE` \| `FEMALE`. |
| `colorId` | uuid | Color activo. |
| `geneticCategory` | enum | Ver [valores fijos](#valores-fijos). Opcional. |
| `absidRegistry` | string | Registro ABSID. Máx. 50. |
| `absidCertificateCode` | string | Código del certificado ABSID. Máx. 50. El archivo escaneado se sube aparte. |
| `externalRegistry` | string | Registro en otra entidad o código del reproductor en el centro de semen. Máx. 100. |
| `identifierException` | boolean | Por defecto `false`. `true` registra un [caso especial](#arete-y-registro-absid-caso-especial) con arete o ABSID repetido. |
| `identifierExceptionReason` | string | Motivo del caso especial. **Obligatorio** si `identifierException` es `true`. Máx. 500. |
| `damId` | uuid | Madre: hembra de la misma especie, nacida antes que la cría. |
| `sireId` | uuid | Padre: macho de la misma especie, nacido antes que la cría. Puede ser un animal externo. |
| `birthDate` | `YYYY-MM-DD` | No futura. **Obligatoria** si `entryOrigin` es `BORN_ON_FARM`. |
| `entryOrigin` | enum | Por defecto `BORN_ON_FARM`. No se envía en animales externos. |
| `entryDate` | `YYYY-MM-DD` | Fecha de ingreso, si se conoce. No anterior al nacimiento. Prohibida si nació en la cabaña. |
| `sourceFarm` | string | Cabaña de procedencia (o centro de semen, en externos). Máx. 150. Prohibida si nació en la cabaña. |
| `notes` | string | Observaciones. Máx. 1000. |

**\*** obligatorio.

Cría nacida en la cabaña, hija de un donante externo:

```json
{
  "earTag": "SR-0154",
  "name": "Lucero",
  "species": "SHEEP",
  "breedId": "<id de Merino>",
  "sex": "FEMALE",
  "colorId": "<id de Blanco>",
  "geneticCategory": "G1",
  "damId": "<id de la madre>",
  "sireId": "<id del donante>",
  "birthDate": "2025-08-14"
}
```

Animal comprado a otra cabaña:

```json
{
  "earTag": "SR-0200",
  "species": "GOAT",
  "breedId": "<id de Saanen>",
  "sex": "MALE",
  "geneticCategory": "PO",
  "absidRegistry": "ABSID-2024-0153",
  "entryOrigin": "PURCHASE",
  "entryDate": "2026-03-02",
  "sourceFarm": "Cabaña San Isidro"
}
```

Donante de semen (externo):

```json
{
  "isExternal": true,
  "name": "Donante 55120",
  "species": "SHEEP",
  "breedId": "<id de Merino>",
  "sex": "MALE",
  "externalRegistry": "AUS-MER-55120",
  "sourceFarm": "Centro de semen XYZ"
}
```

**201 Created:** un [AnimalDetalle](#animaldetalle).

| Código | Causa |
| --- | --- |
| `400` | Validación o regla de negocio: raza de otra especie, padre hembra, madre de otra especie, fechas fuera de orden, falta la fecha de ingreso, etc. El mensaje indica cuál. |
| `404` | Raza, color, madre o padre inexistente, o raza/color inactivo. |
| `409` | `DUPLICATE_IDENTIFIER`: arete o ABSID repetido. Se puede reintentar como caso especial. |
| `409` | `DUPLICATE_EAR_TAG_AND_ABSID`: misma combinación arete + ABSID que otro animal. No se permite. |

### `GET /animals`

**Permiso:** `animals:read`. Paginado. Ordenado por arete y luego por nombre. Sin filtros devuelve los **animales de la cabaña**, con todos sus estados.

| Query | Tipo | Descripción |
| --- | --- | --- |
| `search` | string | Busca (sin distinguir mayúsculas) en arete, nombre, registro ABSID y registro externo. |
| `isExternal` | `true` \| `false` | Por defecto `false`. `true` lista los animales externos. |
| `status` | enum | `ALIVE` para el inventario actual. |
| `species` | `SHEEP` \| `GOAT` | |
| `sex` | `MALE` \| `FEMALE` | |
| `geneticCategory` | enum | |
| `breedId`, `colorId` | uuid | |
| `parentId` | uuid | Crías de ese animal, como madre o como padre. |
| `identifierException` | `true` \| `false` | `true`: solo los casos especiales (arete o ABSID repetido). |
| `page`, `limit` | int | Paginación (por defecto 1 y 20, máx. 100). |

**200 OK:** `{ items: AnimalResumen[], total, page, limit }`. Ver [AnimalResumen](#animalresumen).

### `GET /animals/:id`

**Permiso:** `animals:read`. Devuelve un [AnimalDetalle](#animaldetalle). `404` si no existe.

### `PATCH /animals/:id`

**Permiso:** `animals:update`. Solo cambian los campos enviados, con las mismas reglas que en el alta. Se valida el animal completo resultante.

- Campos: `species`, `breedId`, `sex`, `entryOrigin`, `identifierException`. Poner `identifierException: false` borra el motivo y vuelve a validar que el arete y el ABSID no estén repetidos.
- Anulables (envíe `null` para vaciarlos): `earTag`, `name`, `colorId`, `geneticCategory`, `absidRegistry`, `absidCertificateCode`, `externalRegistry`, `identifierExceptionReason`, `damId`, `sireId`, `birthDate`, `entryDate`, `sourceFarm`, `notes`. Vaciar un campo obligatorio, como el arete de un animal de la cabaña, devuelve `400`.
- Si cambia `species`, envíe también un `breedId` de la nueva especie.
- `isExternal` no se puede cambiar. El estado y el certificado tienen endpoints propios.

```json
{ "entryOrigin": "PURCHASE", "entryDate": "2026-03-02", "sourceFarm": "Cabaña San Isidro" }
```

**200 OK:** el [AnimalDetalle](#animaldetalle) actualizado.

| Código | Causa |
| --- | --- |
| `400` | Regla de negocio violada, o la nueva fecha de nacimiento no es anterior a la de su cría más antigua. |
| `404` | Raza, color, madre o padre inexistente, o raza/color inactivo. |
| `409` | La madre o el padre indicado es descendiente del animal (ciclo en la genealogía). |
| `409` | Se intenta cambiar la especie o el sexo de un animal que ya tiene crías. |
| `409` | Arete o ABSID repetido (`DUPLICATE_IDENTIFIER` o `DUPLICATE_EAR_TAG_AND_ABSID`). Solo se valida si cambia el arete, el ABSID o `identifierException`. |

### `PATCH /animals/:id/status`

**Permiso:** `animals:change-status`. Registra la salida del animal del inventario. Volver a `ALIVE` (para corregir un error) borra la fecha y el motivo. No aplica a animales externos (`400`).

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `status` **\*** | enum | `ALIVE` \| `DEAD` \| `SOLD` \| `SLAUGHTERED` \| `GIFTED` \| `EXCHANGED`. |
| `date` | `YYYY-MM-DD` | **Obligatoria** si el estado no es `ALIVE`. No futura ni anterior al nacimiento o al ingreso. |
| `reason` | string | Motivo o detalle (causa de muerte, comprador, etc.). Máx. 500. |
| `overrideWithdrawal` | boolean | Faenar aunque el animal esté en [período de retiro](#período-de-retiro). Requiere el permiso `health:override-withdrawal`. |
| `overrideReason` | string | Motivo de la autorización. **Obligatorio** si `overrideWithdrawal` es `true`. Máx. 300. |

```json
{ "status": "SOLD", "date": "2026-10-20", "reason": "Vendido a Cabaña El Porvenir" }
```

**200 OK:** el [AnimalDetalle](#animaldetalle) actualizado, más `warnings: string[]` (avisos que no impidieron el cambio, p. ej. una venta en período de retiro).

| Código | Causa |
| --- | --- |
| `409` | `code: "WITHDRAWAL_PERIOD"`: faena de un animal en período de retiro. La respuesta trae `withdrawal` (`endsOn`, `productName`, `appliedAt`). |
| `403` | `overrideWithdrawal` sin el permiso `health:override-withdrawal`. |

> **Datos históricos.** Los animales importados de la planilla pueden tener una salida sin fecha (`statusDate: null`) o una compra sin fecha de ingreso. La API exige la fecha en cada salida nueva.

### `DELETE /animals/:id`

**Permiso:** `animals:delete`. Borrado lógico, **solo para registros cargados por error**. Para muertes, ventas, etc., use el [cambio de estado](#patch-animalsidstatus), que conserva la historia.

Responde `204`. `409` si el animal tiene crías registradas.

### `PUT /animals/:id/certificate-file`

**Permiso:** `animals:update`. Adjunta el certificado ABSID escaneado o reemplaza el anterior, que se borra. Se envía como `multipart/form-data` con el archivo en el campo `file`.

- Formatos: PDF, JPG, PNG o WEBP. El tipo se detecta por el **contenido** del archivo, no por su extensión.
- Tamaño máximo: 10 MB.

```bash
curl -X PUT http://localhost:3000/animals/<id>/certificate-file \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@certificado.pdf"
```

**200 OK:** el [AnimalDetalle](#animaldetalle) con `certificateFile` actualizado.

| Código | Causa |
| --- | --- |
| `400` | No se envió el campo `file`, o el archivo no es PDF ni imagen. |
| `413` | El archivo supera los 10 MB. |

### `GET /animals/:id/certificate-file`

**Permiso:** `animals:read`. Devuelve el archivo con su `Content-Type` original y `Content-Disposition: inline`, así el navegador lo muestra en vez de descargarlo. Como exige el token, el frontend debe pedirlo con `fetch` y mostrarlo con un `blob:` URL (no sirve un `<a href>` directo). `404` si el animal no tiene certificado adjunto.

### `DELETE /animals/:id/certificate-file`

**Permiso:** `animals:update`. Quita el archivo del certificado. El código `absidCertificateCode` se conserva. Responde `204`, o `404` si no había archivo.

### `GET /animals/:id/certificate`

**Permiso:** `animals:issue-certificate`. Genera el **certificado del animal**: un PDF (A4) con toda su información, armado en el momento con los datos vigentes. No confundir con el [certificado ABSID escaneado](#put-animalsidcertificate-file) (`/certificate-file`), que es un archivo que se sube.

| Query | Tipo | Descripción |
| --- | --- | --- |
| `download` | `true` \| `false` | Por defecto `false`: el navegador lo muestra (`Content-Disposition: inline`). `true` fuerza la descarga (`attachment`). |

**Contenido del PDF:**

| Sección | Datos |
| --- | --- |
| Encabezado | Nombre de la cabaña, número de certificado y fecha y hora de emisión. |
| Identificación | Foto principal (si tiene), arete, nombre, especie, raza, sexo, color, categoría genética, fecha de nacimiento y edad, registro ABSID, código del certificado ABSID, registro externo. Si es [caso especial](#arete-y-registro-absid-caso-especial), un aviso con el motivo. |
| Origen y estado | Origen de ingreso, fecha, cabaña de procedencia y estado. Si ya salió de la cabaña, también la fecha y el motivo. |
| Genealogía | Tres generaciones: padre, madre y los cuatro abuelos, con raza, ABSID, nacimiento y categoría. Cantidad de crías registradas. |
| Pesos | Al nacer, al destete y el último, más los 15 pesajes más recientes. |
| Registro sanitario y de manejo | Aviso si hay un período de retiro de carne o leche vigente, más los 15 eventos más recientes (fecha, tipo, producto, dosis y vía, motivo). |
| Observaciones | Las notas del animal. |
| Pie de cada página | Quién lo emitió (nombre y usuario), fecha y hora, número de certificado y paginación. |

**Número de certificado:** cada emisión genera uno nuevo, con el formato `SR-AAAAMMDD-XXXXXX` (fecha de emisión + 6 caracteres aleatorios). Va impreso en el PDF y en el header `X-Certificate-Number`. El certificado **no se guarda**: si se pide otra vez, sale con un número nuevo y los datos actualizados.

**Respuesta `200`:**

| Header | Valor |
| --- | --- |
| `Content-Type` | `application/pdf` |
| `Content-Disposition` | `inline; filename="certificado-<arete>.pdf"` (o `attachment` con `download=true`). |
| `X-Certificate-Number` | Número del certificado emitido. |
| `Cache-Control` | `no-store` |

CORS expone `Content-Disposition` y `X-Certificate-Number`, así que el frontend puede leerlos.

| Código | Causa |
| --- | --- |
| `400` | El animal es externo: no pertenece a la cabaña y no se le emite certificado. |
| `403` | Falta el permiso `animals:issue-certificate`. |
| `404` | El animal no existe o fue eliminado. |

La fecha y hora de emisión se muestran en la zona horaria `FARM_TIME_ZONE` (por defecto `America/La_Paz`) y el nombre de la cabaña sale de `FARM_NAME` (por defecto "Cabaña Santa Rosa").

---

## Fotos de animales

Cada animal tiene un historial de fotos. Los archivos se guardan en **Garage** (almacenamiento compatible con S3), en un bucket privado. La base de datos registra quién subió cada foto y cuándo, sus datos técnicos y quién la modificó o eliminó.

- **Formatos:** JPG, PNG o WEBP, máx. 15 MB. El formato se detecta por el **contenido**, no por la extensión. Las fotos HEIC de iPhone se rechazan: el frontend debe convertirlas a JPG antes de subirlas.
- **El archivo no se reemplaza nunca.** Una foto nueva es siempre un registro nuevo; de una foto existente solo se corrigen la descripción y la fecha.
- **Miniatura:** por cada foto se genera una miniatura WEBP de máx. 480 px por lado, bien orientada y sin metadatos (EXIF, GPS). Úsela en galerías y listados; el original es solo para verla en grande o descargarla.
- **Fecha de la foto (`takenAt`):** si no se indica, se toma del EXIF de la cámara. `takenAtSource` dice de dónde salió: `USER` o `EXIF`. No puede ser futura ni anterior al nacimiento del animal; una fecha EXIF imposible (reloj de la cámara mal configurado) se ignora.
- **Foto principal:** la primera foto de un animal pasa a ser la principal. Solo hay una por animal. Si se elimina, la más reciente que queda la reemplaza.
- **Duplicados:** la misma imagen (mismo contenido, aunque cambie el nombre) no se puede subir dos veces al mismo animal.
- **Eliminar es un borrado lógico:** la foto desaparece del historial, pero el registro (quién la subió y quién la eliminó) y los archivos se conservan.

### URL temporales

Las respuestas incluyen URL firmadas para que el navegador lea las imágenes **directamente del almacenamiento**, sin pasar por la API ni enviar el token:

| Campo | Uso |
| --- | --- |
| `thumbnailUrl` | Miniatura, para `<img>` en galerías. |
| `url` | Original, para verlo en el navegador. |
| `downloadUrl` | Original, forzando la descarga con su nombre de archivo. |
| `urlsExpireAt` | Momento en que las URL dejan de funcionar (por defecto 15 minutos, `S3_PRESIGNED_URL_TTL_SECONDS`). |

Cuando una URL vence, el almacenamiento responde `403`: vuelva a pedir el listado o la foto para obtener URL nuevas. No guarde estas URL en la base de datos ni en el almacenamiento local del navegador.

### `POST /animals/:animalId/photos`

**Permiso:** `animal-photos:upload`. Se envía como `multipart/form-data`, **una foto por petición**. Para subir varias, envíe una petición por cada una.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `file` **\*** | archivo | JPG, PNG o WEBP, máx. 15 MB. |
| `description` | string | Máx. 500. |
| `takenAt` | `YYYY-MM-DD` | Fecha en que se tomó. Si se omite, se usa la del EXIF (si existe). |

```bash
curl -X POST http://localhost:3000/animals/<animalId>/photos \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@IMG_2041.jpg" \
  -F "description=Al destete, vista lateral"
```

**201 Created:** una [Foto](#foto).

| Código | Causa |
| --- | --- |
| `400` | Falta el campo `file`, el archivo no es JPG/PNG/WEBP, o la fecha es futura o anterior al nacimiento. |
| `404` | El animal no existe. |
| `409` | `code: "DUPLICATE_PHOTO"`: esa imagen ya está en el historial del animal. La respuesta trae `photoId` con la foto existente. |
| `413` | El archivo supera los 15 MB. |

### `GET /animals/:animalId/photos`

**Permiso:** `animals:read`. Historial paginado (`page`, `limit`), de la más reciente a la más antigua: ordena por `takenAt` y, si una foto no la tiene, por su fecha de subida.

**200 OK:** `{ items: Foto[], total, page, limit }`.

### `GET /animals/:animalId/photos/:photoId`

**Permiso:** `animals:read`. Una [Foto](#foto) con URL temporales nuevas. `404` si no existe, fue eliminada o pertenece a otro animal.

### `PATCH /animals/:animalId/photos/:photoId`

**Permiso:** `animal-photos:upload`. Corrige `description` y/o `takenAt`. Envíe `null` para vaciarlos. Corregir la fecha la marca como `takenAtSource: "USER"`.

```json
{ "description": "Perfil izquierdo", "takenAt": "2025-12-01" }
```

**200 OK:** la [Foto](#foto) actualizada.

### `PUT /animals/:animalId/photos/:photoId/primary`

**Permiso:** `animal-photos:upload`. Marca la foto como principal; la anterior deja de serlo. Sin body. **200 OK:** la [Foto](#foto).

### `DELETE /animals/:animalId/photos/:photoId`

**Permiso:** `animal-photos:delete`. Borrado lógico. Si era la principal, la foto más reciente que queda pasa a serlo. Responde `204`.

---

## Control de peso

Historial de pesajes de cada animal. Es la **única fuente de los pesos**: el peso al nacer y el peso al destete que muestra la ficha del animal salen de aquí (pesajes de tipo `BIRTH` y `WEANING`).

- **Motivo (`type`):** `BIRTH` (nacimiento), `WEANING` (destete), `ROUTINE` (control periódico), `SELECTION` (selección), `ENTRY` (ingreso por compra), `SALE` (venta), `OTHER`. `BIRTH` y `WEANING` se registran **una sola vez** por animal (`409`, `code: "DUPLICATE_WEIGHING_TYPE"`): para cambiarlos, corrija el pesaje existente.
- **Fecha:** no futura, no anterior al nacimiento ni posterior a la salida del animal (el mismo día de la salida sí, para el pesaje de venta). El peso al nacer, dentro de los 7 días del nacimiento. No se pesan animales externos.
- **Peso:** kg, mayor a 0, hasta 999.99, máx. 2 decimales.
- **Condición corporal** (`bodyConditionScore`, opcional): de 1 a 5 en pasos de 0,5.
- **Peso estimado** (`isEstimated`): sin balanza (cinta, a ojo).
- **Próximo pesaje** (`nextWeighingAt`, opcional): posterior a la fecha del pesaje. Aparece en los [recordatorios](#recordatorios) hasta que el animal se vuelve a pesar.
- **Advertencias:** al crear o editar, la respuesta trae `warnings` si el dato parece un error (baja de más del 15 % o ganancia de más de 600 g/día respecto del pesaje anterior). **No impiden guardar**; muéstrelas para que el usuario confirme o corrija.

### `GET /animals/:animalId/weighings`

**Permiso:** `animals:read`. Todos los pesajes, del más antiguo al más reciente (para la curva de crecimiento). Cada uno incluye lo que calcula el sistema:

| Campo | Significado |
| --- | --- |
| `ageDays` | Edad del animal el día del pesaje (`null` si no se conoce su nacimiento). |
| `changeKg` | Diferencia con el pesaje anterior. |
| `dailyGainG` | Ganancia diaria en gramos desde el pesaje anterior. |

### `POST /animals/:animalId/weighings`

**Permiso:** `weighings:write`.

```json
{
  "weighedAt": "2025-02-11",
  "weightKg": 18.7,
  "type": "WEANING",
  "bodyConditionScore": 3.5,
  "nextWeighingAt": "2025-05-11",
  "notes": "Destete"
}
```

**201 Created:** un [Pesaje](#pesaje) con `warnings`.

### `PATCH` / `DELETE /animals/:animalId/weighings/:id`

**Permiso:** `weighings:write`. `PATCH` corrige los campos enviados (`null` vacía `bodyConditionScore`, `nextWeighingAt` y `notes`) y responde el pesaje con `warnings`. `DELETE` es borrado lógico (`204`).

### `POST /weighings/batch`

**Permiso:** `weighings:write`. Jornada de pesaje: varios animales con la misma fecha y motivo, hasta 500. **Todo o nada**: si un animal no cumple las reglas, no se guarda ninguno y la respuesta `400` trae `errors: [{ animalId, message }]` con cada problema.

```json
{
  "weighedAt": "2025-02-11",
  "type": "WEANING",
  "nextWeighingAt": "2025-05-11",
  "notes": "Destete lote 3",
  "items": [
    { "animalId": "4c9a...", "weightKg": 18.7 },
    { "animalId": "7d21...", "weightKg": 10.5, "notes": "Bajo de peso" }
  ]
}
```

**201 Created:** la lista de [Pesajes](#pesaje), cada uno con sus `warnings`. Las notas común y del animal se unen con ` · `.

---

## Productos veterinarios

Catálogo de productos (`/veterinary-products`), base del futuro inventario veterinario (lotes, vencimientos y stock). Sin paginación, ordenado por nombre.

| Método | Ruta | Permiso |
| --- | --- | --- |
| `POST` | `/veterinary-products` | `veterinary-products:manage` |
| `GET` | `/veterinary-products?search=&category=&isActive=` | `health:read` |
| `GET` | `/veterinary-products/:id` | `health:read` |
| `PATCH` | `/veterinary-products/:id` (también `isActive`) | `veterinary-products:manage` |
| `DELETE` | `/veterinary-products/:id` | `veterinary-products:manage` |

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `name` **\*** | string | Nombre comercial, máx. 150. Único sin distinguir mayúsculas (`409`). |
| `category` **\*** | enum | `VACCINE`, `INTERNAL_ANTIPARASITIC`, `EXTERNAL_ANTIPARASITIC`, `ANTIBIOTIC`, `ANTI_INFLAMMATORY`, `VITAMIN_MINERAL`, `DISINFECTANT`, `OTHER`. |
| `activeIngredient`, `concentration`, `manufacturer`, `presentation` | string | Principio activo, concentración ("1 %"), laboratorio, presentación ("Frasco 500 ml"). |
| `doseUnit` | enum | `ML`, `G`, `MG`, `TABLET`, `DOSE`. Se usa por defecto al registrar una aplicación. |
| `defaultRoute` | enum | `ORAL`, `SUBCUTANEOUS`, `INTRAMUSCULAR`, `INTRAVENOUS`, `TOPICAL`, `INTRANASAL`, `POUR_ON`, `IMMERSION`. |
| `dosageInstructions` | string | Indicaciones, p. ej. "1 ml cada 50 kg". Máx. 500. |
| `forSheep`, `forGoats` | boolean | Especies autorizadas (por defecto ambas; al menos una). |
| `meatWithdrawalDays` | int | **Días de retiro de carne** (0 a 365, por defecto 0). |
| `milkWithdrawalDays` | int | Días de retiro de leche (caprinos), opcional. |
| `requiresPrescription`, `requiresRefrigeration` | boolean | |
| `notes` | string | Máx. 1000. |

**Respuesta:** un [Producto veterinario](#producto-veterinario) (o una lista, en el `GET` sin `:id`).

Un producto inactivo no se puede usar en aplicaciones nuevas. Solo se elimina si no figura en ningún registro sanitario (`409`); si no, desactívelo.

---

## Registro sanitario

Eventos sanitarios y de manejo de cada animal, y eventos generales de instalaciones (`/health-records`).

| Categoría | `type` | Qué es |
| --- | --- | --- |
| Sanitario (`SANITARY`) | `VACCINATION` | Vacunación |
| | `INTERNAL_DEWORMING` | Desparasitación interna |
| | `EXTERNAL_DEWORMING` | Baño / desparasitación externa |
| | `VITAMINS_MINERALS` | Vitaminas y minerales |
| | `TREATMENT` | Tratamiento de una enfermedad |
| | `DIAGNOSIS` | Diagnóstico o examen (ecografía, palpación, laboratorio) |
| Manejo (`MANAGEMENT`) | `SHEARING` | Esquila |
| | `HOOF_TRIMMING` | Recorte de pezuñas |
| | `OTHER_PROCEDURE` | Otro procedimiento (castración, descorne, curación) |
| Instalaciones (`FACILITY`) | `CORRAL_CLEANING` | Limpieza de corral: **evento general, sin animal** |

### Período de retiro

Si el producto aplicado tiene días de retiro, el evento calcula `meatWithdrawalEndsOn` (y `milkWithdrawalEndsOn`): **la fecha desde la que ya se puede faenar** (o usar la leche). Los días se copian del producto al aplicarlo, así que editar el catálogo después no cambia el historial.

- La ficha del animal muestra el retiro vigente en `withdrawal`.
- **Faena** (`PATCH /animals/:id/status` con `SLAUGHTERED`): **se bloquea** (`409`, `code: "WITHDRAWAL_PERIOD"`). Un usuario con el permiso `health:override-withdrawal` puede forzarla con `overrideWithdrawal: true` y `overrideReason`. La autorización queda escrita en el motivo del estado.
- **Venta** (`SOLD`): se permite y la respuesta trae un aviso en `warnings` (puede venderse en pie para reproducción).

### `POST /health-records`

**Permiso:** `health:write`.

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `animalId` | uuid | **Obligatorio**, salvo en `CORRAL_CLEANING` (que no lleva animal). Animal de la cabaña (no externo). |
| `type` **\*** | enum | Ver la tabla anterior. |
| `appliedAt` **\*** | `YYYY-MM-DD` | No futura, no anterior al nacimiento ni posterior a la salida del animal. |
| `isDateEstimated` | boolean | La fecha no es exacta (p. ej. no se anotó en la planilla). |
| `productId` | uuid | Producto activo del catálogo, autorizado para la especie del animal. |
| `productBatch` | string | Lote del producto. Máx. 50. |
| `doseQuantity` + `doseUnit` | number + enum | Van juntos. Si hay producto y se omite la unidad, se usa la del producto. |
| `route` | enum | Vía. Si se omite, se usa la habitual del producto. |
| `targetCondition` | string | Enfermedad que se previene o se trata (Clostridiosis, neumonía…). Máx. 150. |
| `appliedBy` | string | Veterinario o responsable. Máx. 150. |
| `location` | string | Corral o lugar (sobre todo en eventos generales). Máx. 100. |
| `nextDoseAt` | `YYYY-MM-DD` | Próxima dosis o refuerzo, posterior a `appliedAt`. Aparece en los [recordatorios](#recordatorios). |
| `cost` | number | Costo, opcional. |
| `notes` | string | Máx. 1000. |

```json
{
  "animalId": "4c9a...",
  "type": "VACCINATION",
  "appliedAt": "2026-05-10",
  "productId": "<id de la vacuna>",
  "doseQuantity": 2,
  "targetCondition": "Clostridiosis",
  "appliedBy": "Dr. Orlando",
  "nextDoseAt": "2026-11-10"
}
```

**201 Created:** un [Evento sanitario](#evento-sanitario).

### `POST /health-records/batch`

**Permiso:** `health:write`. Aplicación masiva (vacunación, desparasitación de un lote): los mismos campos que el alta, menos `animalId`, más `items: [{ animalId, doseQuantity?, notes? }]` (hasta 500; la dosis de cada animal reemplaza a la común). **Todo o nada**, como el pesaje por lote.

### `GET /health-records`

**Permiso:** `health:read`. Paginado, del más reciente al más antiguo.

| Query | Descripción |
| --- | --- |
| `animalId` | Historial sanitario de un animal. |
| `general=true` | Solo eventos generales (sin animal). |
| `type` / `category` | Por tipo o por categoría (`SANITARY`, `MANAGEMENT`, `FACILITY`). |
| `productId` | Eventos con ese producto. |
| `targetCondition` | Enfermedad / objetivo (búsqueda parcial). |
| `from`, `to` | Rango de fechas (`YYYY-MM-DD`). |

### `GET` / `PATCH` / `DELETE /health-records/:id`

`GET` (`health:read`) devuelve el evento. `PATCH` (`health:write`) corrige los campos enviados (el animal no se cambia; `null` vacía los opcionales, `productId: null` quita el producto). `DELETE` (`health:write`) es borrado lógico (`204`).

---

## Recordatorios

### `GET /reminders`

**Permisos:** `animals:read` y `health:read`. Lo programado hasta `?until=YYYY-MM-DD` (por defecto, dentro de 7 días), **incluidos los atrasados** (`overdue: true`). Pensado para mostrar alertas en la pantalla de inicio.

```jsonc
{
  "weighings": [
    // Animales vivos cuyo último pesaje programó uno nuevo que aún no se hizo.
    { "animalId": "...", "earTag": "CSR-27", "name": null, "nextWeighingAt": "2026-11-05",
      "lastWeighedAt": "2026-08-05", "lastWeightKg": 32.4, "overdue": false }
  ],
  "healthDoses": [
    // Próximas dosis o refuerzos que aún no se aplicaron (sin un evento posterior del mismo tipo).
    { "recordId": "...", "animalId": "...", "earTag": "10", "name": null, "type": "VACCINATION",
      "productName": "Vacuna clostridial", "targetCondition": "Clostridiosis", "location": null,
      "lastAppliedAt": "2026-05-10", "nextDoseAt": "2026-11-10", "overdue": false }
  ]
}
```

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

### Raza

```json
{
  "id": "b71c...",
  "species": "SHEEP",
  "name": "Merino",
  "isActive": true,
  "createdAt": "...", "createdBy": "...",
  "updatedAt": "...", "updatedBy": "..."
}
```

### Color

```json
{
  "id": "e02d...",
  "name": "Blanco",
  "isActive": true,
  "createdAt": "...", "createdBy": "...",
  "updatedAt": "...", "updatedBy": "..."
}
```

### AnimalResumen

Se usa en los listados.

```jsonc
{
  "id": "4c9a...",
  "isExternal": false,
  "earTag": "SR-0154",                                 // null en externos y en casos especiales sin arete
  "name": "Lucero",                                    // null
  "species": "SHEEP",                                  // SHEEP | GOAT
  "breed": { "id": "b71c...", "name": "Merino" },
  "sex": "FEMALE",                                     // MALE | FEMALE
  "color": { "id": "e02d...", "name": "Blanco" },      // null
  "geneticCategory": "G1",                             // null si aún no se clasificó
  "absidRegistry": "ABSID-2025-0311",                  // null
  "identifierException": false,                        // true: caso especial (arete o ABSID repetido)
  "birthDate": "2025-08-14",                           // null si se desconoce
  "status": "ALIVE",                                   // ver valores fijos
  "dam":  { "id": "...", "earTag": "SR-0098", "name": "Estrella", "isExternal": false }, // null
  "sire": { "id": "...", "earTag": null, "name": "Donante 55120", "isExternal": true },  // null
  "primaryPhoto": {                                    // null si no tiene fotos
    "id": "5e1f...",
    "thumbnailUrl": "http://localhost:3900/santa-rosa/animals/...?X-Amz-Signature=...",
    "urlsExpireAt": "2026-10-24T12:45:00.000Z"
  }
}
```

`primaryPhoto.thumbnailUrl` es una miniatura para usar como avatar en listados y fichas. Ver [URL temporales](#url-temporales).

### AnimalDetalle

AnimalResumen más estos campos:

```jsonc
{
  "absidCertificateCode": "CERT-88412",   // null
  "certificateFile": {                    // null si no hay archivo adjunto
    "fileName": "certificado.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 245120,
    "uploadedAt": "2026-10-20T15:30:00.000Z"
  },
  "externalRegistry": null,
  "identifierExceptionReason": null,      // motivo, si es caso especial
  // Pesos: tomados del historial de pesajes (no se envían al crear o editar el animal).
  "birthWeightKg": 4.35,                  // pesaje BIRTH, null
  "weaningDate": "2025-11-20",            // pesaje WEANING, null
  "weaningWeightKg": 22.5,                // pesaje WEANING, null
  "lastWeighing": { "weighedAt": "2026-01-15", "weightKg": 35 },  // null
  "withdrawal": {                         // período de retiro vigente hoy; null si no hay
    "meat": { "endsOn": "2026-12-01", "productName": "Ivomec", "appliedAt": "2026-11-03" },  // null
    "milk": null
  },
  "entryOrigin": "BORN_ON_FARM",          // null solo en externos
  "entryDate": null,                      // "YYYY-MM-DD" si no nació en la cabaña
  "sourceFarm": null,
  "statusDate": null,                     // "YYYY-MM-DD" si no está ALIVE
  "statusReason": null,
  "notes": null,
  "createdAt": "...", "createdBy": "...",
  "updatedAt": "...", "updatedBy": "..."
}
```

### Foto

```jsonc
{
  "id": "5e1f...",
  "animalId": "4c9a...",
  "isPrimary": true,
  "description": "Al destete, vista lateral",      // null
  "takenAt": "2025-06-10",                         // null si no se conoce
  "takenAtSource": "EXIF",                         // USER | EXIF | null
  "uploadedAt": "2026-10-24T12:30:06.000Z",
  "uploadedBy": { "id": "8b74...", "username": "jperez", "fullName": "Juan Pérez Gómez" },
  "file": {
    "fileName": "IMG_2041.jpg",                    // nombre original
    "mimeType": "image/jpeg",                      // image/jpeg | image/png | image/webp
    "sizeBytes": 3482115,
    "width": 3024,                                 // px, ya corregidos según la orientación
    "height": 4032,
    "checksumSha256": "8a8c43a7..."                // huella del archivo original
  },
  "url": "http://localhost:3900/santa-rosa/animals/...?X-Amz-...",
  "downloadUrl": "http://localhost:3900/santa-rosa/animals/...?X-Amz-...",
  "thumbnailUrl": "http://localhost:3900/santa-rosa/animals/...?X-Amz-...",
  "urlsExpireAt": "2026-10-24T12:45:06.000Z",
  "updatedAt": "...",
  "updatedBy": "..."                               // último usuario que la modificó
}
```

### Pesaje

```jsonc
{
  "id": "...",
  "animalId": "...",
  "weighedAt": "2025-02-11",
  "weightKg": 18.7,
  "type": "WEANING",
  "bodyConditionScore": 3.5,        // null
  "isEstimated": false,
  "nextWeighingAt": "2025-05-11",   // null
  "notes": "Destete",               // null
  "warnings": [],                   // solo al crear o editar
  "ageDays": 230, "changeKg": 15.2, "dailyGainG": 185,  // solo en el historial
  "createdAt": "...", "createdBy": "...", "updatedAt": "...", "updatedBy": "..."
}
```

### Producto veterinario

```jsonc
{
  "id": "...",
  "name": "Ivomec",
  "category": "INTERNAL_ANTIPARASITIC",
  "activeIngredient": "Ivermectina",       // null
  "concentration": "1 %",                  // null
  "manufacturer": null,
  "presentation": "Frasco 500 ml",         // null
  "doseUnit": "ML",                        // null
  "defaultRoute": "SUBCUTANEOUS",          // null
  "dosageInstructions": "1 ml cada 50 kg", // null
  "forSheep": true,
  "forGoats": true,
  "meatWithdrawalDays": 28,
  "milkWithdrawalDays": null,
  "requiresPrescription": false,
  "requiresRefrigeration": false,
  "notes": null,
  "isActive": true,
  "createdAt": "...", "createdBy": "...", "updatedAt": "...", "updatedBy": "..."
}
```

### Evento sanitario

```jsonc
{
  "id": "...",
  "animalId": "...",                       // null en eventos generales
  "category": "SANITARY",                  // SANITARY | MANAGEMENT | FACILITY
  "type": "INTERNAL_DEWORMING",
  "appliedAt": "2026-05-05",
  "isDateEstimated": false,
  "product": { "id": "...", "name": "Ivomec" },  // null
  "productBatch": null,
  "doseQuantity": 2, "doseUnit": "ML",     // null
  "route": "SUBCUTANEOUS",                 // null
  "targetCondition": null,
  "appliedBy": "Dr. Orlando",
  "location": null,
  "meatWithdrawalDays": 28,
  "meatWithdrawalEndsOn": "2026-06-02",    // desde esta fecha se puede faenar; null si no hay retiro
  "milkWithdrawalEndsOn": null,
  "nextDoseAt": null,
  "cost": null,
  "notes": null,
  "createdAt": "...", "createdBy": "...", "updatedAt": "...", "updatedBy": "..."
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
| `SHEEP` / `GOAT` | `species` | Ovino / Caprino |
| `MALE` / `FEMALE` | `sex` | Macho / Hembra |
| `ALIVE` | `status` (animal) | Vivo, en la cabaña (inventario actual) |
| `DEAD` | `status` (animal) | Muerto |
| `SOLD` | `status` (animal) | Vendido |
| `SLAUGHTERED` | `status` (animal) | Faenado |
| `GIFTED` | `status` (animal) | Regalado |
| `EXCHANGED` | `status` (animal) | Intercambiado por otro animal |
| `BORN_ON_FARM` | `entryOrigin` | Nacido en la cabaña |
| `PURCHASE` | `entryOrigin` | Comprado a otra cabaña |
| `DONATION` | `entryOrigin` | Recibido en donación |
| `GIFT` | `entryOrigin` | Recibido como regalo |
| `INITIAL_STOCK` | `entryOrigin` | Inventario inicial: ya estaba en la cabaña al empezar a usar el sistema; no se sabe si nació en ella |
| `COMMERCIAL` | `geneticCategory` | Comercial / General |
| `BASE` | `geneticCategory` | Base |
| `G1` … `G4` | `geneticCategory` | Grado 1 a Grado 4 |
| `PO` | `geneticCategory` | Puro de origen |
| `BIRTH` | `type` (pesaje) | Nacimiento (uno por animal) |
| `WEANING` | `type` (pesaje) | Destete (uno por animal) |
| `ROUTINE` | `type` (pesaje) | Control periódico |
| `SELECTION` | `type` (pesaje) | Selección |
| `ENTRY` | `type` (pesaje) | Ingreso por compra |
| `SALE` | `type` (pesaje) | Venta |
| `OTHER` | `type` (pesaje) | Otro |
| `SANITARY` / `MANAGEMENT` / `FACILITY` | `category` (evento sanitario) | Sanitario / Manejo / Instalaciones |
| `VACCINATION` | `type` (evento sanitario) | Vacunación |
| `INTERNAL_DEWORMING` | `type` (evento sanitario) | Desparasitación interna |
| `EXTERNAL_DEWORMING` | `type` (evento sanitario) | Baño / desparasitación externa |
| `VITAMINS_MINERALS` | `type` (evento sanitario) | Vitaminas y minerales |
| `TREATMENT` | `type` (evento sanitario) | Tratamiento |
| `DIAGNOSIS` | `type` (evento sanitario) | Diagnóstico o examen |
| `SHEARING` | `type` (evento sanitario) | Esquila |
| `HOOF_TRIMMING` | `type` (evento sanitario) | Recorte de pezuñas |
| `OTHER_PROCEDURE` | `type` (evento sanitario) | Otro procedimiento |
| `CORRAL_CLEANING` | `type` (evento sanitario) | Limpieza de corral (sin animal) |
| `VACCINE` | `category` (producto) | Vacuna |
| `INTERNAL_ANTIPARASITIC` | `category` (producto) | Antiparasitario interno |
| `EXTERNAL_ANTIPARASITIC` | `category` (producto) | Antiparasitario externo |
| `ANTIBIOTIC` | `category` (producto) | Antibiótico |
| `ANTI_INFLAMMATORY` | `category` (producto) | Antiinflamatorio |
| `VITAMIN_MINERAL` | `category` (producto) | Vitaminas y minerales |
| `DISINFECTANT` | `category` (producto) | Desinfectante |
| `OTHER` | `category` (producto) | Otro |
| `ML` / `G` / `MG` / `TABLET` / `DOSE` | `doseUnit` | ml / g / mg / comprimido / dosis |
| `ORAL` | `route`, `defaultRoute` | Oral |
| `SUBCUTANEOUS` | `route`, `defaultRoute` | Subcutánea |
| `INTRAMUSCULAR` | `route`, `defaultRoute` | Intramuscular |
| `INTRAVENOUS` | `route`, `defaultRoute` | Intravenosa |
| `TOPICAL` | `route`, `defaultRoute` | Tópica |
| `INTRANASAL` | `route`, `defaultRoute` | Intranasal |
| `POUR_ON` | `route`, `defaultRoute` | Pour-on (sobre el lomo) |
| `IMMERSION` | `route`, `defaultRoute` | Inmersión (baño) |
