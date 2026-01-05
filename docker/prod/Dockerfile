# ==== BUILD STAGE ====
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Install deps for build (includes dev deps)
COPY package*.json ./
RUN npm ci

# Copy only what is needed to build
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
COPY db ./db

# Build the application
RUN npm run build

# ==== RUNTIME STAGE ====
FROM node:20-slim AS production
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/src/main.js"]
