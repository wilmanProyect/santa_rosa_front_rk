# Guía de integración para el frontend

Cómo implementar en el frontend cada módulo del backend de Santa Rosa: pantallas, endpoints, tipos, validaciones y flujos.

El contrato completo de cada endpoint (todos los campos, todos los códigos de error) está en [API.md](API.md); esta guía no lo repite entero, se enfoca en **qué construir y cómo**. Swagger, con todos los endpoints para probarlos, está en `http://localhost:3000/docs`.

## Índice

1. [Puesta en marcha](#1-puesta-en-marcha)
2. [Cliente HTTP: tokens, refresh y errores](#2-cliente-http-tokens-refresh-y-errores)
3. [Permisos en la interfaz](#3-permisos-en-la-interfaz)
4. [Tipos TypeScript](#4-tipos-typescript)
5. [Etiquetas de los valores fijos](#5-etiquetas-de-los-valores-fijos)
6. [Módulo: Autenticación y perfil](#6-módulo-autenticación-y-perfil)
7. [Módulo: Usuarios](#7-módulo-usuarios)
8. [Módulo: Roles y permisos](#8-módulo-roles-y-permisos)
9. [Módulo: Áreas](#9-módulo-áreas)
10. [Módulo: Auditoría de accesos](#10-módulo-auditoría-de-accesos)
11. [Módulo: Catálogos de razas y colores](#11-módulo-catálogos-de-razas-y-colores)
12. [Módulo: Animales](#12-módulo-animales)
13. [Módulo: Fotos de animales](#13-módulo-fotos-de-animales)
14. [Módulo: Control de peso](#14-módulo-control-de-peso)
15. [Módulo: Registro sanitario y productos veterinarios](#15-módulo-registro-sanitario-y-productos-veterinarios)
16. [Recordatorios en el inicio](#16-recordatorios-en-el-inicio)
17. [Módulo: Copias de seguridad](#17-módulo-copias-de-seguridad)
18. [Orden sugerido de implementación](#18-orden-sugerido-de-implementación)

---

## 1. Puesta en marcha

| | |
| --- | --- |
| API local | `http://localhost:3000` |
| Swagger | `http://localhost:3000/docs` |
| Origen permitido por CORS | `http://localhost:5173` (cámbielo en `CORS_ORIGINS` del backend si usa otro puerto) |
| Usuario inicial | `admin` / `Admin123` (pide cambiar la contraseña en el primer ingreso) |
| Fotos y archivos | Se leen directo de Garage en `http://localhost:3900` con URL firmadas (ver [sección 13](#13-módulo-fotos-de-animales)) |

Defina la URL de la API como variable de entorno, nunca fija en el código:

```bash
# .env del frontend (Vite)
VITE_API_URL=http://localhost:3000
```

### Convenciones de la API

- **JSON** en todo, salvo la subida de archivos (`multipart/form-data`).
- **IDs:** UUID. Un ID mal formado en la URL devuelve `400`.
- **Fechas sin hora** (nacimiento, fecha de foto, fecha de baja): `"YYYY-MM-DD"`. Manéjelas como texto; no las convierta a `Date`, porque la zona horaria puede correrlas un día.
- **Fechas con hora** (`createdAt`, `uploadedAt`, `lastLoginAt`): ISO 8601 en UTC. Muéstrelas en la hora local del usuario.
- **Campos desconocidos se rechazan** con `400`. Envíe solo los campos del formulario; no reenvíe el objeto completo que devolvió el `GET` (con `id`, `createdAt`, etc.).
- **PATCH** cambia solo los campos enviados. En los campos *anulables*, enviar `null` vacía el valor; omitir el campo lo deja como estaba.
- **Paginación:** `?page=1&limit=20` (máx. 100). Respuesta: `{ items, total, page, limit }`.
- **Booleanos en query:** `?isActive=true` o `?isActive=false` (texto).

---

## 2. Cliente HTTP: tokens, refresh y errores

### Tokens

| Token | Duración | Uso |
| --- | --- | --- |
| `accessToken` | 15 min | Header `Authorization: Bearer <accessToken>` en cada petición. |
| `refreshToken` | 7 días | Solo para `POST /auth/refresh`. **Rota:** cada refresh devuelve uno nuevo y el anterior deja de servir. |

Reglas que el cliente debe cumplir:

1. **Reemplace ambos tokens** cada vez que llegan (login, refresh, cambio de contraseña).
2. **Un solo refresh a la vez.** Si varias peticiones reciben `401` juntas, solo una debe llamar a `/auth/refresh`; las demás esperan su resultado. Reusar un refresh token ya rotado **cierra todas las sesiones del usuario** por seguridad.
3. Si el refresh responde `401`, la sesión terminó: limpie los tokens y mande al login.
4. No reintente con refresh las peticiones a `/auth/login`, `/auth/refresh` ni `/auth/me/password`.

### Ejemplo de cliente (fetch, sin dependencias)

```ts
// api/client.ts
const API_URL = import.meta.env.VITE_API_URL;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

let tokens: Tokens | null = loadTokens();
let refreshing: Promise<Tokens | null> | null = null;
let onSessionExpired: () => void = () => {};

export function setTokens(next: Tokens | null) {
  tokens = next;
  if (next) localStorage.setItem('tokens', JSON.stringify(next));
  else localStorage.removeItem('tokens');
}
export function setOnSessionExpired(handler: () => void) {
  onSessionExpired = handler;
}
function loadTokens(): Tokens | null {
  try {
    return JSON.parse(localStorage.getItem('tokens') ?? 'null');
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody,
  ) {
    super(Array.isArray(body.message) ? body.message.join('\n') : body.message);
  }
  /** Código de negocio (DUPLICATE_IDENTIFIER, DUPLICATE_PHOTO, ...), si lo hay. */
  get code(): string | undefined {
    return this.body.code;
  }
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[]; // lista en errores de validación
  error?: string;
  code?: string;
  [extra: string]: unknown; // fields, conflicts, photoId...
}

const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/me/password'];

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const response = await send(path, options);

  if (response.status === 401 && tokens && !NO_REFRESH.includes(path)) {
    const renewed = await refreshOnce();
    if (!renewed) {
      onSessionExpired();
      throw await toError(response);
    }
    return parse<T>(await send(path, options));
  }
  return parse<T>(response);
}

function send(path: string, { json, headers, ...init }: RequestInit & { json?: unknown }) {
  const h = new Headers(headers);
  if (tokens) h.set('Authorization', `Bearer ${tokens.accessToken}`);
  if (json !== undefined) h.set('Content-Type', 'application/json');
  return fetch(API_URL + path, {
    ...init,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });
}

function refreshOnce(): Promise<Tokens | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens!.refreshToken }),
      });
      if (!res.ok) {
        setTokens(null);
        return null;
      }
      const data = await res.json();
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return tokens;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function toError(response: Response): Promise<ApiError> {
  let data: ApiErrorBody;
  try {
    data = await response.json();
  } catch {
    data = { statusCode: response.status, message: response.statusText };
  }
  return new ApiError(response.status, data);
}
```

Uso:

```ts
const animal = await api<AnimalDetail>(`/animals/${id}`);
await api(`/animals/${id}`, { method: 'PATCH', json: { name: 'Lucero' } });
```

### Errores

```json
{ "statusCode": 409, "message": "Ya existe un rol con el nombre \"Contador\"", "error": "Conflict" }
```

En errores de validación, `message` es una **lista** (un texto por campo). Los mensajes de reglas de negocio vienen en español y se pueden mostrar tal cual.

| Código | Qué hacer en la interfaz |
| --- | --- |
| `400` | Mostrar el mensaje junto al formulario. |
| `401` | El cliente intenta el refresh; si falla, mandar al login. En `/auth/login` significa credenciales incorrectas, cuenta bloqueada o usuario inactivo: mostrar el mensaje. |
| `403` | Falta un permiso (el mensaje dice cuál) **o** el usuario debe cambiar su contraseña. Ver [6.2](#62-cambio-de-contraseña-obligatorio). |
| `404` | El recurso no existe o fue eliminado. También cuando un área, raza o color elegido está inactivo. |
| `409` | Duplicado o conflicto. Algunos traen `code` para un flujo especial (ver tabla abajo). |
| `413` | Archivo demasiado grande. Valide el tamaño antes de subir. |

Códigos de negocio (`body.code`) que el frontend debe reconocer:

| `code` | Dónde | Flujo |
| --- | --- | --- |
| `DUPLICATE_IDENTIFIER` | Alta / edición de animal | Ofrecer el botón "Registrar como caso especial" ([12.4](#124-caso-especial-arete-o-absid-repetido)). |
| `DUPLICATE_EAR_TAG_AND_ABSID` | Alta / edición de animal | Error definitivo: **no** ofrecer el caso especial. |
| `DUPLICATE_PHOTO` | Subida de foto | Avisar que ya está; `body.photoId` es la foto existente ([13.3](#133-subir-fotos)). |
| `DUPLICATE_WEIGHING_TYPE` | Pesaje | El animal ya tiene peso al nacer o al destete: abrir ese pesaje para corregirlo. |
| `WITHDRAWAL_PERIOD` | Faena | En período de retiro: mostrar desde cuándo se puede faenar y, con permiso, ofrecer autorizar ([12.5](#125-registrar-salida-cambio-de-estado)). |

### Efecto inmediato

Cada petición se valida contra la base de datos. Si a un usuario lo dan de baja, le restablecen la contraseña o le cierran la sesión, su **siguiente petición** responde `401`. Si le cambian roles o permisos, rigen en la siguiente petición. El frontend no necesita hacer nada especial: el manejo de `401` y `403` ya lo cubre.

---

## 3. Permisos en la interfaz

El backend siempre valida los permisos; el frontend los usa para **ocultar o deshabilitar** lo que el usuario no puede hacer.

- Al iniciar sesión: `user.permissions` en la respuesta del login.
- Al recargar la aplicación: `GET /auth/me` → `effectivePermissions`. Llámelo al arrancar si hay tokens guardados.

Ya vienen calculados (roles activos + permisos otorgados − permisos denegados): úselos tal cual, no los recalcule.

```ts
// auth/permissions.ts
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_CHANGE_STATUS: 'users:change-status',
  USERS_ASSIGN_ROLES: 'users:assign-roles',
  USERS_ASSIGN_PERMISSIONS: 'users:assign-permissions',
  USERS_RESET_PASSWORD: 'users:reset-password',
  USERS_DELETE: 'users:delete',
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  AREAS_READ: 'areas:read',
  AREAS_CREATE: 'areas:create',
  AREAS_UPDATE: 'areas:update',
  AREAS_DELETE: 'areas:delete',
  ANIMALS_READ: 'animals:read',
  ANIMALS_CREATE: 'animals:create',
  ANIMALS_UPDATE: 'animals:update',
  ANIMALS_CHANGE_STATUS: 'animals:change-status',
  ANIMALS_DELETE: 'animals:delete',
  ANIMAL_CATALOGS_MANAGE: 'animal-catalogs:manage',
  ANIMAL_PHOTOS_UPLOAD: 'animal-photos:upload',
  ANIMAL_PHOTOS_DELETE: 'animal-photos:delete',
  WEIGHINGS_WRITE: 'weighings:write',
  HEALTH_READ: 'health:read',
  HEALTH_WRITE: 'health:write',
  HEALTH_OVERRIDE_WITHDRAWAL: 'health:override-withdrawal',
  VETERINARY_PRODUCTS_MANAGE: 'veterinary-products:manage',
  AUDIT_READ: 'audit:read',
  BACKUPS_CREATE: 'backups:create',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const can = (granted: string[], ...required: Permission[]) =>
  required.every((p) => granted.includes(p));
```

### Qué permiso pide cada pantalla y acción

| Pantalla / acción | Permiso |
| --- | --- |
| Menú **Usuarios** (listado y ficha) | `users:read` |
| Botón "Nuevo usuario" | `users:create` |
| Editar datos del usuario | `users:update` |
| Dar de baja / reactivar | `users:change-status` |
| Pestaña "Roles" del usuario | `users:assign-roles` (para listar los roles disponibles también necesita `roles:read`) |
| Pestaña "Permisos individuales" | `users:assign-permissions` (y `roles:read` para el catálogo) |
| Restablecer contraseña | `users:reset-password` |
| Eliminar usuario | `users:delete` |
| Menú **Roles** | `roles:read` · crear `roles:create` · editar `roles:update` · eliminar `roles:delete` |
| Menú **Áreas** | `areas:read` · crear `areas:create` · editar `areas:update` · eliminar `areas:delete` |
| Menú **Auditoría de accesos** | `audit:read` |
| Botón **Descargar copia de seguridad** | `backups:create` |
| Menú **Animales** (listado, ficha, genealogía, galería) | `animals:read` |
| Registrar animal | `animals:create` |
| Editar animal, subir/quitar certificado | `animals:update` |
| Registrar salida (muerte, venta...) | `animals:change-status` |
| Eliminar animal | `animals:delete` |
| Administrar razas y colores | `animal-catalogs:manage` (verlos solo pide `animals:read`) |
| Subir fotos, editarlas, elegir la principal | `animal-photos:upload` |
| Eliminar fotos | `animal-photos:delete` |
| Botón "Emitir certificado" (PDF del animal) | `animals:issue-certificate` |
| Ver pesajes (pestaña de la ficha) | `animals:read` |
| Registrar, corregir o eliminar pesajes; jornada de pesaje | `weighings:write` |
| Ver el registro sanitario y el catálogo de productos | `health:read` |
| Registrar, corregir o eliminar eventos sanitarios; aplicación masiva | `health:write` |
| Autorizar una faena en período de retiro | `health:override-withdrawal` |
| Administrar productos veterinarios | `veterinary-products:manage` |
| Recordatorios en el inicio | `animals:read` + `health:read` |

Proteja también las **rutas**, no solo los botones: si el usuario entra a una URL sin el permiso, muestre "No tiene acceso" en lugar de una pantalla vacía.

---

## 4. Tipos TypeScript

Cópielos al frontend (por ejemplo `src/api/types.ts`).

```ts
// ---------- Comunes ----------
export type Uuid = string;
/** "YYYY-MM-DD" */
export type DateOnly = string;
/** ISO 8601 UTC */
export type DateTime = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Audit {
  createdAt: DateTime;
  createdBy: Uuid | null;
  updatedAt: DateTime;
  updatedBy: Uuid | null;
}

// ---------- Autenticación ----------
export interface TokenResponse {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number; // segundos
  refreshToken: string;
  refreshTokenExpiresAt: DateTime;
}

export interface LoginResponse extends TokenResponse {
  mustChangePassword: boolean;
  user: UserSummary & { permissions: string[] };
}

export type LoginFailureReason = 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'USER_INACTIVE';

export interface LoginAttempt {
  id: Uuid;
  userId: Uuid | null; // null si el usuario escrito no existe
  username: string;
  success: boolean;
  failureReason: LoginFailureReason | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: DateTime;
}

// ---------- Usuarios ----------
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type InactiveReason = 'RESIGNATION' | 'DISMISSAL' | 'MEDICAL_LEAVE' | 'SUSPENSION' | 'OTHER';

export interface Ref {
  id: Uuid;
  name: string;
}

export interface RoleRef {
  id: Uuid;
  name: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface UserSummary {
  id: Uuid;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string | null;
  fullName: string;
  username: string;
  email: string | null;
  ciNumber: string | null;
  position: string | null;
  area: Ref | null;
  status: UserStatus;
  inactiveReason: InactiveReason | null;
  lastLoginAt: DateTime | null;
  roles: RoleRef[];
}

export interface PermissionItem {
  id: Uuid;
  code: string;
  module: string;
  description: string;
}

export interface UserDetail extends UserSummary, Audit {
  birthDate: DateOnly | null;
  phone: string | null;
  inactiveDate: DateOnly | null;
  inactiveNotes: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: DateTime | null;
  lockedUntil: DateTime | null;
  permissionOverrides: { effect: 'GRANT' | 'DENY'; permission: PermissionItem }[];
  effectivePermissions: string[];
}

// ---------- Roles y áreas ----------
export interface Role extends Audit {
  id: Uuid;
  name: string;
  description: string | null;
  area: Ref | null;
  isActive: boolean;
  isSystem: boolean; // true = Administrador, no editable
  permissions: PermissionItem[];
}

export interface Area extends Audit {
  id: Uuid;
  name: string;
  description: string | null;
  isActive: boolean;
}

// ---------- Animales ----------
export type Species = 'SHEEP' | 'GOAT';
export type Sex = 'MALE' | 'FEMALE';
export type AnimalStatus = 'ALIVE' | 'DEAD' | 'SOLD' | 'SLAUGHTERED' | 'GIFTED' | 'EXCHANGED' | 'LOST';
export type EntryOrigin = 'BORN_ON_FARM' | 'PURCHASE' | 'DONATION' | 'GIFT' | 'INITIAL_STOCK';
export type GeneticCategory = 'COMMERCIAL' | 'BASE' | 'G1' | 'G2' | 'G3' | 'G4' | 'PO';

export interface Breed extends Audit {
  id: Uuid;
  species: Species;
  name: string;
  isActive: boolean;
}

export interface AnimalColor extends Audit {
  id: Uuid;
  name: string;
  isActive: boolean;
}

export interface ParentRef {
  id: Uuid;
  earTag: string | null;
  name: string | null;
  isExternal: boolean;
}

export interface PrimaryPhoto {
  id: Uuid;
  thumbnailUrl: string;
  urlsExpireAt: DateTime;
}

export interface AnimalSummary {
  id: Uuid;
  isExternal: boolean;
  earTag: string | null;
  name: string | null;
  species: Species;
  breed: Ref;
  sex: Sex;
  color: Ref | null;
  geneticCategory: GeneticCategory | null;
  absidRegistry: string | null;
  identifierException: boolean;
  birthDate: DateOnly | null;
  status: AnimalStatus;
  dam: ParentRef | null;
  sire: ParentRef | null;
  primaryPhoto: PrimaryPhoto | null;
}

export interface AnimalDetail extends AnimalSummary, Audit {
  absidCertificateCode: string | null;
  certificateFile: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: DateTime;
  } | null;
  externalRegistry: string | null;
  identifierExceptionReason: string | null;
  /** Tomados del historial de pesajes (solo lectura). */
  birthWeightKg: number | null;
  weaningDate: DateOnly | null;
  weaningWeightKg: number | null;
  lastWeighing: { weighedAt: DateOnly; weightKg: number } | null;
  /** Período de retiro vigente hoy; null si no hay. */
  withdrawal: { meat: Withdrawal | null; milk: Withdrawal | null } | null;
  entryOrigin: EntryOrigin | null;
  entryDate: DateOnly | null;
  sourceFarm: string | null;
  statusDate: DateOnly | null;
  statusReason: string | null;
  notes: string | null;
}

/** Cuerpo de POST /animals. En PATCH, todos opcionales y varios anulables. */
export interface AnimalInput {
  isExternal?: boolean; // solo en el alta
  earTag?: string | null;
  name?: string | null;
  species: Species;
  breedId: Uuid;
  sex: Sex;
  colorId?: Uuid | null;
  geneticCategory?: GeneticCategory | null;
  absidRegistry?: string | null;
  absidCertificateCode?: string | null;
  externalRegistry?: string | null;
  identifierException?: boolean;
  identifierExceptionReason?: string | null;
  damId?: Uuid | null;
  sireId?: Uuid | null;
  birthDate?: DateOnly | null;
  entryOrigin?: EntryOrigin;
  entryDate?: DateOnly | null;
  sourceFarm?: string | null;
  notes?: string | null;
}

export interface DuplicateIdentifierError {
  statusCode: 409;
  code: 'DUPLICATE_IDENTIFIER' | 'DUPLICATE_EAR_TAG_AND_ABSID';
  message: string;
  fields: ('earTag' | 'absidRegistry')[];
  conflicts: {
    id: Uuid;
    earTag: string | null;
    name: string | null;
    absidRegistry: string | null;
    isExternal: boolean;
  }[];
}

// ---------- Fotos ----------
export interface AnimalPhoto {
  id: Uuid;
  animalId: Uuid;
  isPrimary: boolean;
  description: string | null;
  takenAt: DateOnly | null;
  takenAtSource: 'USER' | 'EXIF' | null;
  uploadedAt: DateTime;
  uploadedBy: { id: Uuid; username: string; fullName: string };
  file: {
    fileName: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
    width: number;
    height: number;
    checksumSha256: string;
  };
  url: string;
  downloadUrl: string;
  thumbnailUrl: string;
  urlsExpireAt: DateTime;
  updatedAt: DateTime;
  updatedBy: Uuid | null;
}

export interface Withdrawal {
  /** Desde esta fecha ya se puede faenar (o usar la leche). */
  endsOn: DateOnly;
  productName: string;
  appliedAt: DateOnly;
}

// ---------- Control de peso ----------
export type WeighingType = 'BIRTH' | 'WEANING' | 'ROUTINE' | 'SELECTION' | 'ENTRY' | 'SALE' | 'OTHER';

export interface Weighing extends Audit {
  id: Uuid;
  animalId: Uuid;
  weighedAt: DateOnly;
  weightKg: number;
  type: WeighingType;
  bodyConditionScore: number | null; // 1 a 5, pasos de 0,5
  isEstimated: boolean;
  nextWeighingAt: DateOnly | null;
  notes: string | null;
  /** Solo al crear o editar. */
  warnings?: string[];
  /** Solo en el historial. */
  ageDays?: number | null;
  changeKg?: number | null;
  dailyGainG?: number | null;
}

// ---------- Sanidad ----------
export type HealthCategory = 'SANITARY' | 'MANAGEMENT' | 'FACILITY';
export type HealthEventType =
  | 'VACCINATION' | 'INTERNAL_DEWORMING' | 'EXTERNAL_DEWORMING' | 'VITAMINS_MINERALS'
  | 'TREATMENT' | 'DIAGNOSIS' | 'SHEARING' | 'HOOF_TRIMMING' | 'OTHER_PROCEDURE'
  | 'CORRAL_CLEANING';
export type DoseUnit = 'ML' | 'G' | 'MG' | 'TABLET' | 'DOSE';
export type AdministrationRoute =
  | 'ORAL' | 'SUBCUTANEOUS' | 'INTRAMUSCULAR' | 'INTRAVENOUS' | 'TOPICAL' | 'INTRANASAL' | 'POUR_ON' | 'IMMERSION';
export type ProductCategory =
  | 'VACCINE' | 'INTERNAL_ANTIPARASITIC' | 'EXTERNAL_ANTIPARASITIC' | 'ANTIBIOTIC'
  | 'ANTI_INFLAMMATORY' | 'VITAMIN_MINERAL' | 'DISINFECTANT' | 'OTHER';

export interface VeterinaryProduct extends Audit {
  id: Uuid;
  name: string;
  category: ProductCategory;
  activeIngredient: string | null;
  concentration: string | null;
  manufacturer: string | null;
  presentation: string | null;
  doseUnit: DoseUnit | null;
  defaultRoute: AdministrationRoute | null;
  dosageInstructions: string | null;
  forSheep: boolean;
  forGoats: boolean;
  meatWithdrawalDays: number;
  milkWithdrawalDays: number | null;
  requiresPrescription: boolean;
  requiresRefrigeration: boolean;
  notes: string | null;
  isActive: boolean;
}

export interface HealthRecord extends Audit {
  id: Uuid;
  animalId: Uuid | null; // null en eventos generales
  category: HealthCategory;
  type: HealthEventType;
  appliedAt: DateOnly;
  isDateEstimated: boolean;
  product: Ref | null;
  productBatch: string | null;
  doseQuantity: number | null;
  doseUnit: DoseUnit | null;
  route: AdministrationRoute | null;
  targetCondition: string | null;
  appliedBy: string | null;
  location: string | null;
  meatWithdrawalDays: number;
  meatWithdrawalEndsOn: DateOnly | null;
  milkWithdrawalEndsOn: DateOnly | null;
  nextDoseAt: DateOnly | null;
  cost: number | null;
  notes: string | null;
}

export interface Reminders {
  weighings: {
    animalId: Uuid; earTag: string | null; name: string | null; nextWeighingAt: DateOnly;
    lastWeighedAt: DateOnly; lastWeightKg: number; overdue: boolean;
  }[];
  healthDoses: {
    recordId: Uuid; animalId: Uuid | null; earTag: string | null; name: string | null;
    type: HealthEventType; productName: string | null; targetCondition: string | null;
    location: string | null; lastAppliedAt: DateOnly; nextDoseAt: DateOnly; overdue: boolean;
  }[];
}
```

---

## 5. Etiquetas de los valores fijos

La API devuelve códigos en inglés; muestre siempre la etiqueta en español.

```ts
// api/labels.ts
export const SPECIES_LABEL: Record<Species, string> = { SHEEP: 'Ovino', GOAT: 'Caprino' };

export const SEX_LABEL: Record<Sex, string> = { MALE: 'Macho', FEMALE: 'Hembra' };

export const ANIMAL_STATUS_LABEL: Record<AnimalStatus, string> = {
  ALIVE: 'Vivo',
  DEAD: 'Muerto',
  SOLD: 'Vendido',
  SLAUGHTERED: 'Faenado',
  GIFTED: 'Regalado',
  EXCHANGED: 'Intercambiado',
  LOST: 'Perdido',
};

export const ENTRY_ORIGIN_LABEL: Record<EntryOrigin, string> = {
  BORN_ON_FARM: 'Nacido en la cabaña',
  PURCHASE: 'Compra',
  DONATION: 'Donación',
  GIFT: 'Regalo',
  INITIAL_STOCK: 'Inventario inicial',
};

export const WEIGHING_TYPE_LABEL: Record<WeighingType, string> = {
  BIRTH: 'Nacimiento',
  WEANING: 'Destete',
  ROUTINE: 'Control periódico',
  SELECTION: 'Selección',
  ENTRY: 'Ingreso (compra)',
  SALE: 'Venta',
  OTHER: 'Otro',
};

export const HEALTH_CATEGORY_LABEL: Record<HealthCategory, string> = {
  SANITARY: 'Sanitario',
  MANAGEMENT: 'Manejo',
  FACILITY: 'Instalaciones',
};

export const HEALTH_TYPE_LABEL: Record<HealthEventType, string> = {
  VACCINATION: 'Vacunación',
  INTERNAL_DEWORMING: 'Desparasitación interna',
  EXTERNAL_DEWORMING: 'Baño / desparasitación externa',
  VITAMINS_MINERALS: 'Vitaminas y minerales',
  TREATMENT: 'Tratamiento',
  DIAGNOSIS: 'Diagnóstico / examen',
  SHEARING: 'Esquila',
  HOOF_TRIMMING: 'Recorte de pezuñas',
  OTHER_PROCEDURE: 'Otro procedimiento',
  CORRAL_CLEANING: 'Limpieza de corral',
};

export const DOSE_UNIT_LABEL: Record<DoseUnit, string> = {
  ML: 'ml', G: 'g', MG: 'mg', TABLET: 'comprimido', DOSE: 'dosis',
};

export const ROUTE_LABEL: Record<AdministrationRoute, string> = {
  ORAL: 'Oral', SUBCUTANEOUS: 'Subcutánea', INTRAMUSCULAR: 'Intramuscular', INTRAVENOUS: 'Intravenosa',
  TOPICAL: 'Tópica', INTRANASAL: 'Intranasal', POUR_ON: 'Pour-on', IMMERSION: 'Baño / aspersión',
};

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  VACCINE: 'Vacuna', INTERNAL_ANTIPARASITIC: 'Antiparasitario interno',
  EXTERNAL_ANTIPARASITIC: 'Antiparasitario externo', ANTIBIOTIC: 'Antibiótico',
  ANTI_INFLAMMATORY: 'Antiinflamatorio', VITAMIN_MINERAL: 'Vitaminas y minerales',
  DISINFECTANT: 'Desinfectante', OTHER: 'Otro',
};

export const GENETIC_CATEGORY_LABEL: Record<GeneticCategory, string> = {
  COMMERCIAL: 'Comercial / General',
  BASE: 'Base',
  G1: 'Grado 1 (G1)',
  G2: 'Grado 2 (G2)',
  G3: 'Grado 3 (G3)',
  G4: 'Grado 4 (G4)',
  PO: 'Puro de origen (PO)',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: 'Activo', INACTIVE: 'De baja' };

export const INACTIVE_REASON_LABEL: Record<InactiveReason, string> = {
  RESIGNATION: 'Renuncia',
  DISMISSAL: 'Despido',
  MEDICAL_LEAVE: 'Baja médica',
  SUSPENSION: 'Suspensión',
  OTHER: 'Otro',
};

export const LOGIN_FAILURE_LABEL: Record<LoginFailureReason, string> = {
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos',
  ACCOUNT_LOCKED: 'Cuenta bloqueada',
  USER_INACTIVE: 'Usuario dado de baja',
};
```

---

## 6. Módulo: Autenticación y perfil

### 6.1 Login

Pantalla con usuario y contraseña → `POST /auth/login`.

```ts
const res = await api<LoginResponse>('/auth/login', {
  method: 'POST',
  json: { username, password },
});
setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
// guarde res.user y res.user.permissions en el estado global
if (res.mustChangePassword) navigate('/cambiar-contrasena');
else navigate('/');
```

- El usuario no distingue mayúsculas ni espacios alrededor.
- Un `401` puede ser credenciales incorrectas, **cuenta bloqueada** (5 intentos fallidos → 15 minutos; el mensaje dice cuánto falta) o usuario dado de baja. Muestre el `message` tal cual.

### 6.2 Cambio de contraseña obligatorio

Si `mustChangePassword` es `true`, el resto de la API responde `403` hasta que la cambie. Solo funcionan `GET /auth/me`, `PUT /auth/me/password` y los logout.

- Lleve al usuario a una pantalla de cambio de contraseña **sin menú**.
- Si en cualquier momento recibe un `403` y `GET /auth/me` devuelve `mustChangePassword: true`, redirija a esa pantalla. Pasa cuando un administrador le restablece la contraseña mientras está conectado.

```ts
const res = await api<TokenResponse>('/auth/me/password', {
  method: 'PUT',
  json: { currentPassword, newPassword },
});
setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken }); // ¡tokens nuevos!
```

Cambiar la contraseña **cierra todas las sesiones** (también en otros dispositivos) y devuelve tokens nuevos: reemplácelos o el usuario quedará deslogueado.

**Política de contraseñas** (valídela también en el formulario):

```ts
export const isValidPassword = (p: string) =>
  p.length >= 8 &&
  new TextEncoder().encode(p).length <= 72 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p);
// Mensaje: "Entre 8 y 72 caracteres, con al menos una mayúscula, una minúscula y un número"
```

La nueva tampoco puede ser igual a la actual (`400`).

### 6.3 Sesión al recargar

Si hay tokens guardados, llame a `GET /auth/me` al arrancar para obtener el usuario y sus `effectivePermissions`. Si responde `401` (y el refresh también falla), vaya al login.

### 6.4 Cerrar sesión

- **Cerrar sesión:** `POST /auth/logout` (204) y luego borre los tokens locales. Bórrelos aunque la petición falle.
- **Cerrar sesión en todos los dispositivos:** `POST /auth/logout-all` (204). Útil en "Mi perfil".

### 6.5 Mi perfil

`GET /auth/me` devuelve un `UserDetail`: muestre los datos, roles, último ingreso y el botón de cambiar contraseña. El usuario no edita sus propios datos personales desde aquí: eso lo hace un administrador con `users:update`.

---

## 7. Módulo: Usuarios

### 7.1 Listado

`GET /users?search=&status=&areaId=&page=&limit=` → `Paginated<UserSummary>`

- **Búsqueda** en nombre, apellidos, usuario, CI y correo. Use *debounce* de unos 300 ms.
- **Filtros:** estado (Activo / De baja) y área (opciones de `GET /areas`).
- **Columnas sugeridas:** nombre completo, usuario, CI, área, roles, estado, último ingreso.

### 7.2 Crear usuario

`POST /users` (`users:create`) → `UserDetail`

| Campo | Obligatorio | Validación en el formulario |
| --- | --- | --- |
| `firstName`, `paternalLastName` | Sí | Máx. 100 |
| `maternalLastName` | No | Máx. 100 |
| `ciNumber` | Sí | `/^\d{4,12}(-[0-9A-Za-z]{1,3})?$/` (ej. `1234567` o `1234567-1B`) |
| `username` | Sí | `/^[a-zA-Z0-9._-]{3,30}$/` (se guarda en minúsculas) |
| `email` | Sí | Correo válido, máx. 150 |
| `password` | Sí | Política de contraseñas. Es **temporal**: el usuario la cambia al entrar. |
| `birthDate` | Sí | `YYYY-MM-DD`, no futura |
| `phone` | No | `/^\+?[0-9\s-]{6,20}$/` |
| `position` | No | Cargo, máx. 100 |
| `areaId` | No | Select con áreas **activas** |
| `roleIds` | No | Multiselect con roles **activos** |

`409` = usuario, correo o CI ya registrados: muestre el mensaje.

### 7.3 Ficha y edición

- **Ver:** `GET /users/:id` → `UserDetail`.
- **Editar:** `PATCH /users/:id` (`users:update`). Envíe solo lo que cambió. Para vaciar `maternalLastName`, `phone`, `position` o `areaId`, envíe `null`.
- La contraseña, el estado, los roles y los permisos tienen acciones propias (siguientes apartados). Organícelas como pestañas o botones de la ficha.

### 7.4 Dar de baja / reactivar

`PATCH /users/:id/status` (`users:change-status`)

```json
{ "status": "INACTIVE", "reason": "RESIGNATION", "date": "2026-10-07", "notes": "Renuncia presentada el 30/09" }
```

- Al dar de baja: `reason` es obligatorio (select con `INACTIVE_REASON_LABEL`); `date` es opcional (por defecto hoy); `notes` hasta 500 caracteres.
- Para reactivar: `{ "status": "ACTIVE" }`. Se borran el motivo, la fecha y las notas.
- Un usuario no puede darse de baja a sí mismo (`400`): oculte el botón en su propia ficha.
- El usuario pierde el acceso al instante.

### 7.5 Roles del usuario

`PUT /users/:id/roles` (`users:assign-roles`) con `{ "roleIds": [...] }`. **Reemplaza la lista completa**: envíe siempre todos los roles que debe tener.

- Opciones: `GET /roles?isActive=true`. Para mostrar primero los del área del usuario: `GET /roles?areaId=<area>&isActive=true`.
- Un usuario no puede quitarse a sí mismo el rol Administrador (`400`).

### 7.6 Permisos individuales

`PUT /users/:id/permissions` (`users:assign-permissions`)

```json
{ "grantedPermissionIds": ["..."], "deniedPermissionIds": ["..."] }
```

UI sugerida: el catálogo (`GET /roles/permissions`) agrupado por `module`, y por cada permiso un selector de tres estados:

| Estado | Significado | Se envía en |
| --- | --- | --- |
| **Heredado** (por defecto) | Lo que digan sus roles | (ninguna lista) |
| **Otorgar** | Lo tiene aunque sus roles no lo den | `grantedPermissionIds` |
| **Denegar** | No lo tiene aunque sus roles lo den (la denegación gana) | `deniedPermissionIds` |

Estado inicial: `permissionOverrides` del `UserDetail`. Muestre al lado si el permiso le llega por algún rol (`roles[].permissions`, consultando `GET /roles`) y el resultado final (`effectivePermissions`). Un mismo permiso no puede estar en ambas listas (`400`). Para quitar todos los ajustes, envíe ambas listas vacías.

### 7.7 Restablecer contraseña

`POST /users/:id/reset-password` (`users:reset-password`) con `{ "newPassword": "Temporal123" }` → `204`.

Asigna una contraseña temporal, **desbloquea** la cuenta, cierra todas sus sesiones y obliga a cambiarla en el próximo ingreso. Es la forma de desbloquear una cuenta bloqueada por intentos fallidos: si `lockedUntil` no es `null`, muestre la cuenta como bloqueada y ofrezca este botón.

### 7.8 Eliminar

`DELETE /users/:id` (`users:delete`) → `204`. Es un borrado lógico y libera su usuario, correo y CI. Pida confirmación y sugiera "Dar de baja" para retiros de personal, porque conserva el motivo. No se puede eliminar a sí mismo.

---

## 8. Módulo: Roles y permisos

- **Listado:** `GET /roles?isActive=&areaId=` → `Role[]` (sin paginación).
- **Crear:** `POST /roles` (`roles:create`) con `name` (3–100, único), `description` (máx. 255), `areaId` y `permissionIds`.
- **Editar:** `PATCH /roles/:id` (`roles:update`). `permissionIds` **reemplaza la lista completa**. `areaId: null` lo desliga del área. `isActive: false` lo desactiva: deja de dar permisos, pero sigue asignado.
- **Eliminar:** `DELETE /roles/:id` (`roles:delete`). `409` si está asignado a usuarios: sugiera desactivarlo.

**Pantalla de permisos del rol:** checkboxes agrupados por `module` con el catálogo de `GET /roles/permissions`; use `description` como etiqueta.

**Rol Administrador** (`isSystem: true`): tiene todos los permisos y **no se puede editar, desactivar ni eliminar** (`400`). Muéstrelo en solo lectura, con una insignia "Sistema".

Los cambios en un rol rigen de inmediato para todos los usuarios que lo tienen.

---

## 9. Módulo: Áreas

CRUD simple, sin paginación.

| Acción | Endpoint | Permiso |
| --- | --- | --- |
| Listar | `GET /areas?isActive=` | `areas:read` |
| Crear | `POST /areas` con `{ name, description }` | `areas:create` |
| Ver | `GET /areas/:id` | `areas:read` |
| Editar | `PATCH /areas/:id` con `name`, `description`, `isActive` | `areas:update` |
| Eliminar | `DELETE /areas/:id` | `areas:delete` |

- `name`: 2–100 caracteres, único (`409`).
- Un área inactiva no se puede asignar a usuarios ni roles nuevos. En los selects de asignación muestre solo `?isActive=true`.
- Eliminar responde `409` si tiene usuarios o roles; el mensaje dice cuántos. Sugiera desactivarla.

---

## 10. Módulo: Auditoría de accesos

`GET /auth/login-history?userId=&success=&page=&limit=` (`audit:read`) → `Paginated<LoginAttempt>`, del más reciente al más antiguo.

- **Filtros:** usuario (select de `GET /users`), resultado (exitoso / fallido).
- **Columnas:** fecha y hora, usuario escrito, resultado, motivo de fallo (`LOGIN_FAILURE_LABEL`), IP, navegador (`userAgent`).
- `userId` es `null` cuando alguien escribió un usuario que no existe.
- También sirve en la ficha del usuario, como pestaña "Accesos" con `?userId=<id>`.

---

## 11. Módulo: Catálogos de razas y colores

Pantalla de administración (`animal-catalogs:manage`), por ejemplo con dos pestañas: **Razas** y **Colores**. Sin paginación.

### Razas

| Acción | Endpoint |
| --- | --- |
| Listar | `GET /breeds?species=SHEEP\|GOAT&isActive=true\|false` |
| Crear | `POST /breeds` con `{ "species": "SHEEP", "name": "Merino" }` |
| Editar | `PATCH /breeds/:id` con `species`, `name`, `isActive` |
| Eliminar | `DELETE /breeds/:id` |

Cada raza es de **una especie**: agrupe o filtre la lista por Ovino / Caprino. El mismo nombre puede existir en las dos especies.

### Colores

| Acción | Endpoint |
| --- | --- |
| Listar | `GET /animal-colors?isActive=` |
| Crear | `POST /animal-colors` con `{ "name": "Blanco" }` (máx. 50) |
| Editar | `PATCH /animal-colors/:id` con `name`, `isActive` |
| Eliminar | `DELETE /animal-colors/:id` |

### Reglas comunes

- Los nombres se comparan **sin distinguir mayúsculas** y sin espacios sobrantes: "MERINO" choca con "Merino" (`409`).
- Solo se puede **eliminar** si ningún animal lo usa (`409`); si no, ofrezca **desactivar**.
- Una raza en uso no puede cambiar de especie (`409`).

### En el formulario de animales

- **Raza:** `GET /breeds?species=<especie elegida>&isActive=true`. Recargue la lista al cambiar la especie y limpie la raza elegida.
- **Color:** `GET /animal-colors?isActive=true`.
- **Al editar** un animal cuya raza o color hoy está inactivo, el valor actual no aparece en la lista de activos: agréguelo como opción (viene en `animal.breed` / `animal.color`) para no perder el dato. El backend acepta conservarlo; solo exige que esté activo al **cambiarlo** por otro.
- Si el usuario tiene `animal-catalogs:manage`, un botón "+ Nuevo color" junto al select ahorra salir del formulario.

---

## 12. Módulo: Animales

### 12.1 Conceptos

| Tipo | `isExternal` | Qué es | Dónde aparece |
| --- | --- | --- | --- |
| **De la cabaña** | `false` | Animales del inventario. | `GET /animals` (por defecto) |
| **Externo** | `true` | Reproductores ajenos (donante de semen, carnero de otra cabaña). Solo existen para la genealogía. | `GET /animals?isExternal=true` |

- **Inventario actual** = `GET /animals?status=ALIVE`.
- `isExternal` **no se puede cambiar** después del alta: pregúntelo al inicio del formulario, por ejemplo con dos botones "Registrar animal" y "Registrar reproductor externo".
- Las salidas del inventario (muerte, venta, faena, regalo) **no son borrados**: son cambios de estado ([12.5](#125-registrar-salida-cambio-de-estado)).

### 12.2 Listado

`GET /animals` → `Paginated<AnimalSummary>`, ordenado por arete.

| Filtro (query) | Control sugerido |
| --- | --- |
| `search` | Buscador: arete, nombre, ABSID o registro externo (con *debounce*) |
| `status` | Estado; por defecto `ALIVE` ("Inventario actual") con opción "Todos" |
| `species` | Ovino / Caprino |
| `sex` | Macho / Hembra |
| `breedId` | Raza (dependiente de la especie elegida) |
| `colorId`, `geneticCategory` | Selects |
| `isExternal` | Pestaña aparte "Reproductores externos" |
| `identifierException=true` | Filtro "Casos especiales" (arete o ABSID repetido) |
| `parentId` | No es un filtro visible: se usa para la pestaña "Crías" ([12.7](#127-ficha-genealogía-y-crías)) |

**Columnas sugeridas:** foto (`primaryPhoto?.thumbnailUrl` o un avatar genérico), arete, nombre, especie, raza, sexo, edad (calculada con `birthDate`), categoría, estado. Muestre una insignia si `identifierException` es `true`.

La edad **no viene del backend**: calcúlela desde `birthDate`, en meses para animales jóvenes y en años y meses para los adultos.

### 12.3 Formulario de alta y edición

`POST /animals` (`animals:create`) · `PATCH /animals/:id` (`animals:update`) → `AnimalDetail`

Agrupe el formulario en secciones y muestre u oculte campos según el tipo y el origen:

#### Identificación

| Campo | De la cabaña | Externo |
| --- | --- | --- |
| `earTag` (arete, máx. 30) | **Obligatorio** (salvo caso especial "sin arete", ver [12.4](#124-caso-especial-arete-o-absid-repetido)) | Opcional |
| `name` (máx. 100) | Opcional | Opcional |
| `species` | **Obligatorio** | **Obligatorio** |
| `breedId` | **Obligatorio**, de la especie elegida | **Obligatorio** |
| `sex` | **Obligatorio** | **Obligatorio** |
| `colorId` | Opcional | Opcional |
| `geneticCategory` | Opcional (se completa después) | Opcional |

Un externo necesita **al menos uno** de: arete, nombre, registro ABSID o registro externo.

#### Registros

| Campo | Notas |
| --- | --- |
| `absidRegistry` (máx. 50) | Registro ABSID. |
| `absidCertificateCode` (máx. 50) | Código del certificado. El archivo escaneado se sube aparte ([12.6](#126-certificado-absid)). |
| `externalRegistry` (máx. 100) | Registro en otra entidad o código del reproductor en el centro de semen. Sobre todo para externos. |

El arete y los registros se guardan en mayúsculas y sin espacios alrededor; puede convertirlos ya al escribir.

#### Genealogía

| Campo | Opciones del selector |
| --- | --- |
| `damId` (madre) | `GET /animals?species=<especie>&sex=FEMALE&search=...` — hembras de la misma especie |
| `sireId` (padre) | `GET /animals?species=<especie>&sex=MALE&search=...` **y** `GET /animals?isExternal=true&species=<especie>&sex=MALE&search=...` — incluye los reproductores externos |

Use un autocompletado con búsqueda, porque pueden ser cientos de animales. Muestre "arete — nombre" y una etiqueta "Externo". Junto al selector del padre, un botón "+ Registrar reproductor externo" evita salir del formulario. Al editar, excluya al propio animal de las opciones.

Reglas que valida el backend: madre hembra, padre macho, misma especie, padres nacidos antes que la cría y sin ciclos (una cría no puede ser madre o padre de su ancestro).

#### Nacimiento

| Campo | Regla |
| --- | --- |
| `birthDate` | No futura. **Obligatoria si nació en la cabaña.** |

**Los pesos ya no van en el formulario del animal.** El peso al nacer y al destete se registran como pesajes de tipo `BIRTH` y `WEANING` ([sección 14](#14-módulo-control-de-peso)). En el alta de un nacimiento, el frontend puede pedir "Peso al nacer" en el mismo formulario y, después de crear el animal, llamar a `POST /animals/:id/weighings` con `type: 'BIRTH'`. La ficha muestra `birthWeightKg`, `weaningWeightKg` y `lastWeighing` tomados del historial.

#### Ingreso a la cabaña

Solo para animales de la cabaña. En los externos no se envía nada de esta sección salvo `sourceFarm`.

| `entryOrigin` | `entryDate` | `sourceFarm` | `birthDate` |
| --- | --- | --- | --- |
| `BORN_ON_FARM` (por defecto) | **No enviar** | **No enviar** | Obligatoria |
| `PURCHASE` / `DONATION` / `GIFT` | Opcional, si se conoce (no anterior al nacimiento) | Opcional (cabaña de procedencia, máx. 150) | Opcional |
| `INITIAL_STOCK` (inventario inicial: estaba antes del sistema) | Opcional | Opcional | Opcional |

En externos, `sourceFarm` sirve para la cabaña o el centro de semen de origen.

**Otros:** `notes` (observaciones, máx. 1000).

#### Edición (PATCH)

- Envíe solo los campos modificados. Para vaciar un campo opcional, envíe `null`.
- Si cambia la especie, envíe también un `breedId` de la nueva especie.
- `409` si cambia la especie o el sexo de un animal **con crías** registradas: avise que no se puede.
- `400` si la nueva fecha de nacimiento no es anterior a la de su cría más antigua.
- El estado, el certificado y las fotos tienen acciones propias.

### 12.4 Caso especial: arete o ABSID repetido

Por defecto el arete y el registro ABSID son **únicos dentro de cada especie** (un ovino y un caprino pueden compartirlos). Algunos animales de la cabaña tienen uno repetido, o no tienen arete registrado, y por política no se corrigen: se registran como **caso especial**. Para un animal sin arete, ofrezca la casilla "No tiene arete registrado", que envía `identifierException: true` con el motivo.

**Flujo (botón "Registrar como caso especial"):**

```ts
async function saveAnimal(input: AnimalInput) {
  try {
    return await api<AnimalDetail>('/animals', { method: 'POST', json: input });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'DUPLICATE_IDENTIFIER') {
      const err = e.body as unknown as DuplicateIdentifierError;
      // 1. Mostrar err.message y la lista err.conflicts (con enlace a cada animal)
      // 2. Resaltar los campos err.fields ("earTag" y/o "absidRegistry")
      // 3. Botón "Registrar como caso especial" → pedir el motivo → reintentar:
      const reason = await askReason(); // modal, obligatorio, máx. 500
      if (reason) {
        return api<AnimalDetail>('/animals', {
          method: 'POST',
          json: { ...input, identifierException: true, identifierExceptionReason: reason },
        });
      }
    }
    if (e instanceof ApiError && e.code === 'DUPLICATE_EAR_TAG_AND_ABSID') {
      // Mismo arete Y mismo ABSID que otro animal: es el mismo animal cargado dos veces.
      // Mostrar el error SIN ofrecer el caso especial.
    }
    throw e;
  }
}
```

- En la edición (`PATCH`) el flujo es el mismo. El backend solo revisa duplicados si cambia el arete, el ABSID o `identifierException`.
- En la ficha de un caso especial, muestre una insignia y `identifierExceptionReason`.
- Para quitar la marca: `PATCH` con `identifierException: false`. Si el dato sigue repetido, vuelve a responder `DUPLICATE_IDENTIFIER`.
- Lista de revisión: `GET /animals?identifierException=true`.

### 12.5 Registrar salida (cambio de estado)

`PATCH /animals/:id/status` (`animals:change-status`) → `AnimalDetail`

```json
{ "status": "SOLD", "date": "2026-10-20", "reason": "Vendido a Cabaña El Porvenir" }
```

- Botón "Registrar salida" en la ficha, con un modal: tipo (Muerte / Venta / Faena / Regalo / Intercambio), fecha (obligatoria, no futura ni anterior al nacimiento o al ingreso) y motivo o detalle (máx. 500: causa de muerte, comprador, etc.).
- Si el animal no está vivo, muestre el estado, la fecha y el motivo de forma destacada, y ofrezca "Corregir: volver a Vivo" (`{ "status": "ALIVE" }`), que borra la fecha y el motivo.
- **Período de retiro:**
  - **Faena** en retiro → `409` con `code: 'WITHDRAWAL_PERIOD'` y `body.withdrawal.endsOn`. Muestre "No se puede faenar hasta el …". Si el usuario tiene `health:override-withdrawal`, ofrezca "Autorizar de todos modos": pida el motivo y reenvíe con `overrideWithdrawal: true` y `overrideReason`.
  - **Venta** en retiro → se guarda; la respuesta trae `warnings`: muéstrelos.
  - Para avisar antes de abrir el modal, use `animal.withdrawal` de la ficha.
- No aplica a animales externos (`400`): oculte el botón.
- Los animales **importados de la planilla** pueden tener una salida sin fecha (`statusDate: null`): muestre "Fecha desconocida".

### 12.6 Certificado ABSID

| Acción | Endpoint | Permiso |
| --- | --- | --- |
| Subir o reemplazar | `PUT /animals/:id/certificate-file` (multipart, campo `file`) | `animals:update` |
| Ver | `GET /animals/:id/certificate-file` | `animals:read` |
| Quitar | `DELETE /animals/:id/certificate-file` | `animals:update` |

- Formatos: PDF, JPG, PNG o WEBP. Máx. **10 MB**. Valide antes de subir (`accept="application/pdf,image/jpeg,image/png,image/webp"`).
- Datos del archivo: `animal.certificateFile` (nombre, tipo, tamaño, fecha de subida) o `null`.
- **Para verlo** no sirve un `<a href>`, porque el endpoint exige el token. Descárguelo con `fetch` y ábralo como *blob*:

```ts
async function openCertificate(animalId: string) {
  const res = await fetch(`${API_URL}/animals/${animalId}/certificate-file`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) throw new Error('No se pudo abrir el certificado');
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
```

Quitar el archivo no borra el código `absidCertificateCode`.

### 12.6.1 Certificado del animal (PDF generado)

Es distinto del certificado ABSID: no se sube, lo **genera el backend** en el momento con toda la información del animal (identificación, foto principal, origen, estado, genealogía de tres generaciones, pesos y registro sanitario). Referencia completa en [API.md → `GET /animals/:id/certificate`](API.md#get-animalsidcertificate).

- **Dónde:** botón "Emitir certificado" en la ficha del animal, visible solo con el permiso `animals:issue-certificate` y **oculto en los animales externos**, que responden `400`.
- **Ver:** `GET /animals/:id/certificate`. **Descargar:** agregue `?download=true`.
- Igual que el certificado ABSID, exige el token: use `fetch` y un *blob*, no un `<a href>` directo.
- Cada clic emite un certificado nuevo, con número propio (header `X-Certificate-Number`) y los datos del momento. Muestre un indicador de carga, porque con foto puede tardar uno o dos segundos.

```ts
async function issueCertificate(animalId: string, download = false) {
  const res = await fetch(
    `${API_URL}/animals/${animalId}/certificate${download ? '?download=true' : ''}`,
    { headers: { Authorization: `Bearer ${getAccessToken()}` } },
  );
  if (!res.ok) throw new Error('No se pudo emitir el certificado');

  const number = res.headers.get('X-Certificate-Number'); // p. ej. SR-20261104-7F3A9C
  const fileName =
    /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ??
    'certificado.pdf';
  const url = URL.createObjectURL(await res.blob());

  if (download) {
    const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
    link.click();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return number;
}
```

Si usa el cliente HTTP de la [sección 2](#2-cliente-http-tokens-refresh-y-errores), recuerde que esta respuesta **no es JSON**: lea el cuerpo con `res.blob()`.

### 12.7 Ficha, genealogía y crías

Estructura sugerida de la ficha (`GET /animals/:id`):

- **Encabezado:** foto principal, arete, nombre, especie, raza, sexo, edad, estado e insignias (externo, caso especial).
- **Datos:** identificación, registros, nacimiento y destete, ingreso, observaciones.
- **Genealogía:** `dam` y `sire` enlazados a sus fichas. Para subir un nivel más (abuelos), pida la ficha de cada padre.
- **Crías:** `GET /animals?parentId=<id>`. Devuelve las crías de la cabaña donde el animal es madre o padre. Funciona igual para un reproductor externo.
- **Fotos:** galería ([sección 13](#13-módulo-fotos-de-animales)).
- **Certificado ABSID:** código y archivo.
- **Botón "Emitir certificado":** PDF con toda la ficha ([12.6.1](#1261-certificado-del-animal-pdf-generado)).
- **Auditoría:** creado y modificado (fecha y usuario).

### 12.8 Eliminar

`DELETE /animals/:id` (`animals:delete`) → `204`. **Solo para registros cargados por error**: en el diálogo de confirmación explique que para una muerte o venta se usa "Registrar salida". `409` si tiene crías registradas.

---

## 13. Módulo: Fotos de animales

Cada animal tiene un historial de fotos. Los archivos están en Garage (almacenamiento compatible con S3), en un bucket privado.

### 13.1 Conceptos

- **Se muestran con URL firmadas y temporales.** Cada foto trae `thumbnailUrl`, `url` y `downloadUrl`. Se usan directamente en `<img src>` o `<a href>`, **sin** token: la firma ya autoriza. Vencen en `urlsExpireAt` (unos 15 minutos).
- **Miniatura:** `thumbnailUrl` es una imagen WEBP de máx. 480 px, para galerías y listados. Use `url` solo para verla en grande, porque el original puede pesar varios MB.
- **Una foto no se reemplaza nunca:** de una foto existente solo se corrigen la descripción y la fecha.
- **Foto principal:** la primera que se sube pasa a ser la principal; aparece como `primaryPhoto` en el listado y la ficha del animal.
- **Fecha de la foto (`takenAt`):** si el usuario no la indica, el backend la toma del EXIF de la cámara (`takenAtSource: "EXIF"`).

### 13.2 Galería

`GET /animals/:animalId/photos?page=&limit=` → `Paginated<AnimalPhoto>`, de la más reciente a la más antigua.

- **Cuadrícula** de `thumbnailUrl`. Bajo cada foto: fecha (`takenAt`, o `uploadedAt` si no tiene), descripción y una estrella si es la principal.
- **Al abrir una foto (visor):** imagen grande con `url`, más estos datos:
  - Subida por **`uploadedBy.fullName`** el **`uploadedAt`** (hora local).
  - Fecha de la foto, con "según la cámara" si `takenAtSource === 'EXIF'`.
  - Dimensiones (`file.width` × `file.height`) y tamaño (`file.sizeBytes`, mostrado en MB).
  - Botones: Descargar (`downloadUrl`), Editar, Marcar como principal, Eliminar (según permisos).
- Use `file.width` y `file.height` para reservar el espacio de la imagen antes de que cargue (`aspect-ratio`).

**URL vencidas.** Si la galería queda abierta más de 15 minutos, las imágenes dan error de carga. Dos opciones:

```ts
// Opción A: refrescar la página de fotos un poco antes de que venzan
const msLeft = new Date(page.items[0].urlsExpireAt).getTime() - Date.now();
setTimeout(reloadPhotos, Math.max(msLeft - 60_000, 0));

// Opción B: al fallar una imagen, pedir la foto otra vez (trae URL nuevas)
<img src={photo.thumbnailUrl} onError={() => refetchPhoto(photo.id)} />
```

No guarde estas URL en `localStorage` ni en caché persistente: vencen.

### 13.3 Subir fotos

`POST /animals/:animalId/photos` (`animal-photos:upload`), `multipart/form-data`, **una foto por petición**:

| Campo | Obligatorio | Regla |
| --- | --- | --- |
| `file` | Sí | JPG, PNG o WEBP, máx. **15 MB** |
| `description` | No | Máx. 500 |
| `takenAt` | No | `YYYY-MM-DD`, no futura ni anterior al nacimiento. Si se omite, se usa la del EXIF. |

```ts
async function uploadPhoto(animalId: string, file: File, description?: string) {
  const form = new FormData();
  form.append('file', file);
  if (description) form.append('description', description);
  // No fije Content-Type: el navegador agrega el boundary del multipart.
  return api<AnimalPhoto>(`/animals/${animalId}/photos`, { method: 'POST', body: form });
}
```

**Varias fotos a la vez:** permita seleccionar varias (`<input type="file" multiple accept="image/jpeg,image/png,image/webp">`) y súbalas **una tras otra**, con el estado de cada una (pendiente, subiendo, lista o error). Que una falle no debe detener las demás.

**Validación antes de subir:**

- Tamaño ≤ 15 MB y tipo JPG/PNG/WEBP.
- **Fotos de iPhone (HEIC):** el backend las rechaza. Conviértalas a JPG en el navegador antes de subirlas, por ejemplo con la librería [`heic2any`](https://www.npmjs.com/package/heic2any), o pida a los usuarios configurar la cámara en "Más compatible".
- Opcional: reducir las fotos muy grandes en el navegador antes de subirlas, para ahorrar datos en conexiones lentas del campo.

**Barra de progreso:** `fetch` no informa el avance de la subida. Para una barra de progreso use `XMLHttpRequest` (evento `upload.onprogress`) o axios (`onUploadProgress`) solo para este endpoint.

**Errores:**

| Respuesta | Mensaje sugerido |
| --- | --- |
| `400` | El `message` del backend (formato no admitido, fecha inválida). |
| `409` `DUPLICATE_PHOTO` | "Esta foto ya está en el historial", con un enlace a `body.photoId`. |
| `413` | "La foto supera los 15 MB". |

### 13.4 Editar, foto principal y eliminar

| Acción | Endpoint | Permiso |
| --- | --- | --- |
| Corregir descripción o fecha | `PATCH /animals/:animalId/photos/:photoId` con `{ description?, takenAt? }` (`null` vacía) | `animal-photos:upload` |
| Marcar como principal | `PUT /animals/:animalId/photos/:photoId/primary` (sin body) | `animal-photos:upload` |
| Eliminar | `DELETE /animals/:animalId/photos/:photoId` → `204` | `animal-photos:delete` |

- Después de **marcar como principal** o **eliminar**, recargue la galería y la ficha del animal: cambia la principal y, al eliminar la principal, la más reciente pasa a serlo.
- Eliminar quita la foto del historial (el registro se conserva para auditoría). Pida confirmación.

---

## 14. Módulo: Control de peso

Pestaña **"Pesajes"** en la ficha del animal, y pantalla de **jornada de pesaje** para pesar un lote.

### 14.1 Historial y curva

`GET /animals/:animalId/weighings` (`animals:read`) → `Weighing[]`, del más antiguo al más reciente.

- **Tabla:** fecha, motivo (`WEIGHING_TYPE_LABEL`), peso, edad (`ageDays`; en meses si es grande), diferencia (`changeKg`), ganancia diaria (`dailyGainG`, g/día), condición corporal, "estimado" y observaciones.
- **Gráfico:** peso (eje Y) por fecha o por edad (eje X). Es la vista más útil para comparar el crecimiento.
- La ficha del animal ya trae `birthWeightKg`, `weaningWeightKg` y `lastWeighing` para el encabezado.

### 14.2 Registrar y corregir

`POST /animals/:animalId/weighings` · `PATCH /animals/:animalId/weighings/:id` · `DELETE …` (`weighings:write`)

| Campo | Regla en el formulario |
| --- | --- |
| `weighedAt` | Fecha, por defecto hoy. No futura. |
| `weightKg` | Número > 0, hasta 999.99, 2 decimales. |
| `type` | Select con `WEIGHING_TYPE_LABEL`. Oculte "Nacimiento" o "Destete" si el animal ya los tiene (el backend responde `409 DUPLICATE_WEIGHING_TYPE`). |
| `bodyConditionScore` | Opcional: 1, 1.5 … 5. |
| `isEstimated` | Casilla "Peso aproximado (sin balanza)". |
| `nextWeighingAt` | Opcional: "Próximo pesaje". Genera un recordatorio. |
| `notes` | Observaciones. |

**Advertencias:** si la respuesta trae `warnings` (p. ej. "Bajó 23 % desde el pesaje del…"), el pesaje **ya se guardó**. Muéstrelas con dos opciones: "Corregir" (abre la edición) o "Está bien".

### 14.3 Jornada de pesaje (lote)

`POST /weighings/batch` (`weighings:write`): una fecha y un motivo para todos, y una fila por animal (peso, condición corporal, nota). Hasta 500 animales.

- **Pantalla sugerida:** elegir fecha y motivo → buscar o filtrar animales (por ejemplo, los vivos nacidos en un rango, para un destete) → tabla editable con el peso de cada uno → "Guardar jornada".
- **Todo o nada:** si responde `400` con `errors: [{ animalId, message }]`, marque esas filas en rojo con su mensaje. No se guardó ninguna.
- Si responde `201`, muestre los `warnings` de cada fila.

---

## 15. Módulo: Registro sanitario y productos veterinarios

### 15.1 Catálogo de productos

Pantalla de administración (`veterinary-products:manage`). El listado lo ve quien tenga `health:read`.

- `GET /veterinary-products?search=&category=&isActive=true` alimenta los selects del registro sanitario (solo activos).
- **Formulario:** nombre, categoría (`PRODUCT_CATEGORY_LABEL`), principio activo, concentración, laboratorio, presentación, unidad de dosis, vía habitual, indicaciones, especies (ovinos / caprinos), **días de retiro de carne** y de leche, receta, refrigeración y notas.
- Destaque los **días de retiro**: de ellos depende el bloqueo de la faena.
- Eliminar solo funciona si el producto no se usó (`409`); ofrezca "Desactivar".

### 15.2 Historial sanitario del animal

Pestaña **"Sanidad"** en la ficha: `GET /health-records?animalId=<id>&page=&limit=` (`health:read`), del más reciente al más antiguo.

- **Columnas:** fecha (con "≈" si `isDateEstimated`), tipo (`HEALTH_TYPE_LABEL`), producto, dosis (`doseQuantity` + `DOSE_UNIT_LABEL`), vía, enfermedad / objetivo, responsable, retiro hasta (`meatWithdrawalEndsOn`) y próxima dosis.
- **Filtros:** categoría (Sanitario / Manejo), tipo y rango de fechas.
- Si `animal.withdrawal` no es `null`, muestre en el encabezado de la ficha la alerta **"En período de retiro hasta el …"**.

### 15.3 Registrar un evento

`POST /health-records` (`health:write`). El formulario cambia según la categoría del tipo elegido:

- **Sanitario:** producto (select de activos; al elegirlo, precargue la unidad y la vía del producto), dosis + unidad, vía, enfermedad / objetivo, responsable, lote y próxima dosis.
- **Manejo** (esquila, pezuñas, procedimiento): sin producto ni dosis, salvo que se use alguno.
- **Limpieza de corral:** **sin animal**. Lugar (corral), producto (desinfectante) y próxima limpieza. Regístrela desde una pantalla de "Eventos generales", no desde la ficha del animal.

Además:

- "La fecha no es exacta" es la casilla `isDateEstimated`.
- Si el producto tiene retiro, avise antes de guardar: "Este animal no podrá faenarse hasta el …" (`appliedAt` + `meatWithdrawalDays`).

### 15.4 Aplicación masiva

`POST /health-records/batch`: el mismo evento (vacuna, desparasitación, baño) para un grupo, con dosis opcional por animal. Hasta 500 animales; todo o nada, igual que la jornada de pesaje (`errors` por animal).

### 15.5 Eventos generales

`GET /health-records?general=true` lista las limpiezas de corral y los demás eventos de instalaciones que se agreguen.

---

## 16. Recordatorios en el inicio

`GET /reminders?until=YYYY-MM-DD` → `Reminders`. Por defecto trae lo de los próximos 7 días, más los atrasados.

- **Tarjeta "Próximos pesajes":** arete, nombre, fecha programada y último peso. En rojo los atrasados (`overdue`). Al tocar uno, abra el formulario de pesaje del animal.
- **Tarjeta "Próximas dosis":** tipo, producto, enfermedad, animal o corral, y fecha. Al tocar uno, abra el formulario del evento con los datos precargados.
- Un recordatorio desaparece solo cuando se registra un pesaje posterior, o un evento posterior del mismo tipo. No hay que marcarlo como hecho.
- Muestre un contador en el menú (p. ej. "3 atrasados") consultando este endpoint al cargar la aplicación.

---

## 17. Módulo: Copias de seguridad

`GET /backups/download` (`backups:create`) descarga un `.tar.gz` con **todo el sistema**: la base de datos completa y todas las fotos y certificados. Detalle en [API.md](API.md#get-backupsdownload).

- **Dónde:** una pantalla **Sistema → Copias de seguridad** (o un botón en la configuración), visible solo con `backups:create`.
- **Qué mostrar:** un botón "Descargar copia de seguridad" y un texto que diga que el archivo contiene **datos reales y confidenciales** (usuarios, animales, registro sanitario), y que se debe guardar en un lugar seguro, fuera del servidor.
- **Puede tardar:** la base se vuelca antes de que empiece la descarga. Mientras tanto, deshabilite el botón y muestre "Generando copia de seguridad...". Con muchas fotos, el archivo puede pesar cientos de MB.
- **`409`:** ya hay otra copia en curso. Muestre "Ya se está generando una copia de seguridad; espere a que termine".
- **Restaurar no está en la interfaz:** se hace por terminal en el servidor. No agregue un botón de restaurar.

El endpoint exige el token en la cabecera `Authorization`, así que se descarga con `fetch` + `Blob`, igual que el certificado ([12.6.1](#1261-certificado-del-animal-pdf-generado)). Para respaldos de cientos de MB funciona igual; solo ocupa esa memoria mientras dura la descarga.

```ts
async function downloadBackup() {
  const res = await fetch(`${API_URL}/backups/download`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (res.status === 409) {
    throw new Error('Ya se está generando una copia de seguridad. Espere a que termine.');
  }
  if (!res.ok) throw new Error('No se pudo generar la copia de seguridad');

  const fileName =
    /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ??
    'santa-rosa-respaldo.tar.gz';
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement('a'), { href: url, download: fileName }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
```

Si el token vence durante una descarga larga, no pasa nada: el token se valida solo al empezar.

---

## 18. Orden sugerido de implementación

1. **Base:** cliente HTTP con refresh ([sección 2](#2-cliente-http-tokens-refresh-y-errores)), tipos y etiquetas.
2. **Autenticación:** login, cambio de contraseña obligatorio, sesión al recargar, logout, guard de rutas.
3. **Permisos:** helper `can()`, menú y rutas condicionados.
4. **Áreas** (CRUD simple: sirve para fijar los patrones de listado, formulario y confirmación).
5. **Roles** con la pantalla de permisos agrupados.
6. **Usuarios:** listado, alta, edición, baja, roles, permisos individuales, restablecer contraseña.
7. **Auditoría de accesos.**
8. **Catálogos** de razas y colores.
9. **Animales:** listado, formulario con secciones condicionales, caso especial, ficha, salida, crías.
10. **Certificado ABSID.**
11. **Fotos:** galería, visor, subida múltiple, foto principal y avatar en los listados.
12. **Control de peso:** pestaña de pesajes con gráfico, registro con advertencias, jornada de pesaje.
13. **Productos veterinarios** (catálogo).
14. **Registro sanitario:** pestaña de sanidad, alta por categoría, aplicación masiva, eventos generales, alerta de retiro.
15. **Recordatorios** en el inicio.

### Checklist rápido

- [ ] Las peticiones con `401` hacen **un solo** refresh compartido y reemplazan ambos tokens.
- [ ] Un `403` con `mustChangePassword` lleva a la pantalla de cambio de contraseña.
- [ ] Los formularios envían solo los campos documentados (sin `id`, `createdAt`, etc.).
- [ ] Los `PATCH` envían solo lo modificado y usan `null` para vaciar.
- [ ] Las fechas `YYYY-MM-DD` se manejan como texto, sin conversión de zona horaria.
- [ ] Los selects de asignación muestran solo elementos activos, sin perder el valor actual inactivo al editar.
- [ ] El alta y la edición de animales manejan `DUPLICATE_IDENTIFIER` con el botón "Caso especial".
- [ ] Las fotos se muestran con `thumbnailUrl` y se refrescan cuando vencen las URL.
- [ ] El certificado ABSID se abre con `fetch` + blob, no con un enlace directo.
- [ ] Los pesos al nacer y al destete se registran como pesajes, no en el formulario del animal.
- [ ] Las advertencias de pesaje (`warnings`) se muestran; el pesaje ya está guardado.
- [ ] La faena maneja `WITHDRAWAL_PERIOD` (y la autorización con permiso); la venta muestra `warnings`.
- [ ] Los lotes (pesaje y aplicación masiva) marcan las filas de `errors` cuando responden `400`.
