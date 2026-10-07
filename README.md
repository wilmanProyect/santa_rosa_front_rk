# Santa Rosa — Frontend

Frontend del sistema Santa Rosa. Consume la API de `../santa_rosa_backend` (referencia en `santa_rosa_backend/docs/API.md`).

**Stack:** React 19 · TypeScript · Vite · React Router · TanStack Query · pnpm.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env   # opcional: los valores por defecto sirven para desarrollo local
pnpm dev               # http://localhost:5173
```

El backend debe estar corriendo en `http://localhost:3000`. En desarrollo, el frontend llama a `/api/...` y Vite lo redirige al backend, así que no hace falta configurar CORS.

Usuario inicial: `admin` / `Admin123` (pide cambiar la contraseña en el primer ingreso).

| Script | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Chequeo de tipos y build de producción en `dist/` |
| `pnpm lint` | Lint con oxlint |
| `pnpm preview` | Sirve el build de producción |

## Arquitectura: Screaming Architecture

La estructura de carpetas "grita" de qué trata el sistema (usuarios, roles, áreas…), no qué framework usa. Cada dominio del negocio es una carpeta en `features/`, con todo lo que necesita adentro.

```
src/
├── app/                    Ensambla la aplicación
│   ├── App.tsx
│   ├── providers/          QueryClient, AuthProvider
│   ├── router/             Rutas y protección por permisos
│   ├── layouts/            Layout principal (menú lateral)
│   └── navigation.ts       Menú: módulos y permiso que exige cada uno
│
├── features/               Un módulo por dominio del negocio
│   ├── auth/               Login, sesión, cambio de contraseña, guards
│   ├── dashboard/          Página de inicio
│   ├── users/              Usuarios
│   ├── roles/              Roles y permisos
│   └── areas/              Áreas
│
└── shared/                 Código sin conocimiento del negocio
    ├── api/                Cliente HTTP (tokens, refresh) y ApiError
    ├── config/             Variables de entorno, códigos de permiso
    ├── hooks/              Hooks genéricos
    ├── lib/                Utilidades (formato, almacenamiento)
    ├── types/              Tipos comunes (paginación, auditoría)
    ├── ui/                 Componentes base (Button, TextField, Alert…)
    └── styles/             Estilos globales y tokens de diseño
```

### Estructura de una feature

```
features/users/
├── api/          Llamadas HTTP del dominio (users.api.ts)
├── components/   Componentes propios del dominio
├── hooks/        Hooks de React Query (useUsers…) y query keys
├── pages/        Pantallas
├── types/        Tipos del dominio, espejo de las respuestas de la API
├── routes.ts     Rutas del dominio
└── index.ts      API pública: lo único que se importa desde fuera
```

### Reglas de dependencias

1. `shared/` **no importa** de `features/` ni de `app/`.
2. Una feature **no importa** de `app/`.
3. Entre features, solo se importa desde su `index.ts` (`@/features/auth`), nunca de archivos internos (`@/features/auth/hooks/useAuth`).
4. `app/` puede importar de todo; es donde se conectan las piezas.

Ejemplo: el cliente HTTP vive en `shared/` y no sabe nada de la sesión. La feature `auth` le registra cómo obtener y renovar el token con `configureHttpAuth()`.

## Autenticación y permisos

- Los tokens se guardan en `localStorage`. Si una petición recibe `401`, el cliente HTTP renueva el access token con el refresh token y reintenta una vez; si no puede, cierra la sesión.
- `RequireAuth` protege las rutas privadas y lleva a `/cambiar-contrasena` si el usuario debe cambiarla.
- `RequirePermission` protege una ruta por permisos; `<Can permissions={[...]}>` oculta partes de la UI; `useAuth().can(...)` lo consulta en código.
- Los códigos de permiso están en `shared/config/permissions.ts` y deben coincidir con el catálogo del backend.

> La UI oculta lo que el usuario no puede usar, pero la seguridad real la aplica el backend en cada petición.

## Cómo agregar un módulo nuevo

1. Crear `src/features/<dominio>/` con la estructura de arriba.
2. Definir los tipos según `docs/API.md` del backend y las llamadas en `api/`.
3. Crear los hooks de React Query y las páginas.
4. Exportar lo necesario en `index.ts`.
5. Registrar la ruta en `app/router/router.tsx` (dentro de `RequirePermission`) y el ítem del menú en `app/navigation.ts`.
6. Si el backend agregó permisos, añadirlos a `shared/config/permissions.ts`.
