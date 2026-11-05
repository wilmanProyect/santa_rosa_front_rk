# syntax=docker/dockerfile:1

# ---------- Compilación: Node + pnpm (misma versión que el backend) ----------
FROM node:24-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@11.5.3 && npm cache clean --force

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src

# URL de la API que usa el navegador. Queda fija en el bundle al compilar.
# Con /api, nginx redirige las llamadas al backend (ver docker/nginx).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run build

# ---------- Imagen final: nginx sirviendo los archivos estáticos ----------
FROM nginx:1.29-alpine AS runner

# Backend al que nginx redirige /api. Se puede cambiar al levantar el contenedor.
ENV BACKEND_URL=http://host.docker.internal:3000

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
