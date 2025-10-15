# ==== BUILD STAGE ====
FROM node:slim AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==== RUNTIME STAGE ====
FROM node:slim AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/main.js"]