# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Build application
COPY . .
RUN npm run build

# Keep only production dependencies for runtime image
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy runtime artifacts only
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# SQLite file path can be overridden; default stays in /app
ENV DB_PATH=database.sqlite

EXPOSE 3000
CMD ["node", "dist/main"]
