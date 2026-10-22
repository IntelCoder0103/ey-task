# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci -w @atelier/server
COPY server server
RUN npm run build -w @atelier/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000 DATA_FILE=/data/db.json
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci -w @atelier/server --omit=dev && npm cache clean --force \
  && mkdir /data && chown node:node /data
COPY --from=build /app/server/dist server/dist
USER node
VOLUME /data
EXPOSE 4000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "server/dist/index.js"]
