# Build - La imagen de alpine 3.21 es la que tiene menor número de vulnerabilidades críticas
FROM node:18-alpine3.21 AS builder

WORKDIR /app

# Copio solo las dependencias y las instalo
COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# Prod
FROM node:18-alpine3.21 

# Creo un grupo "academia_novit", un usuario no-root "pamguevara" y lo agrego al grupo
RUN addgroup -S academia_novit && adduser -S pam_guevara -G academia_novit

WORKDIR /app

# Copio solo lo necesario
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# SOLUCIÓN: Crear directorio de logs y asignar permisos, sino genera error al levantar la app
RUN mkdir -p /app/logs && \
    chown -R pam_guevara:academia_novit /app/logs && \
    chmod 755 /app/logs

USER pam_guevara

EXPOSE 3000

CMD ["node", "dist/app.js"]
