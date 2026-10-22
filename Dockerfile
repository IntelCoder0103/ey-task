# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci
COPY . .
ARG VITE_API_URL=""
ARG VITE_DEMO_HINT="false"
ENV VITE_API_URL=$VITE_API_URL VITE_DEMO_HINT=$VITE_DEMO_HINT
RUN npx vite build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://api:4000/
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
