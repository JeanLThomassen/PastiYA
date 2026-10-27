# --- Compilación ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Ejecución ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Montar un volumen persistente en /data: ahí vive la base (db.json).
ENV DATA_DIR=/data
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/server/server/index.js"]
