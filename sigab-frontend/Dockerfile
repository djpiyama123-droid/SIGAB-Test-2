# ================================================================
# SIGAH Frontend — Dockerfile multi-stage
# Stage 1: build de producción con Vite
# Stage 2: servir el build estático con nginx:alpine
# ================================================================

# ── Stage 1: build ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias primero (capa cacheada mientras no cambie package.json)
COPY package*.json ./
RUN npm ci --silent

# Copiar fuentes y construir
COPY . .
RUN npm run build

# ── Stage 2: serve ──────────────────────────────────────────────
FROM nginx:alpine AS serve

# Copiar el build de Vite al directorio raíz de nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración nginx para SPA React (handles client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
