FROM node:20-alpine

WORKDIR /app

# Instalar dependencias de Baileys (sharp, canvas no necesarios en Alpine)
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# El directorio de auth persiste en volumen externo
VOLUME ["/app/auth_sigah"]

ENV NODE_ENV=production
ENV BOT_PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
