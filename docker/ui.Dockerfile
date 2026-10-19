FROM node:22-alpine AS build
RUN npm install -g pnpm@12.8.1
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/contracts/package.json libs/contracts/
COPY libs/kafka-toolkit/package.json libs/kafka-toolkit/
COPY apps/activation-api/package.json apps/activation-api/
COPY apps/billing-service/package.json apps/billing-service/
COPY apps/provisioning-service/package.json apps/provisioning-service/
COPY apps/notification-service/package.json apps/notification-service/
COPY apps/crm-analytics-service/package.json apps/crm-analytics-service/
COPY apps/demo-ui/package.json apps/demo-ui/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "demo-ui..."

# Dirección de la API tal como la ve el navegador (no el contenedor).
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

COPY apps/demo-ui ./apps/demo-ui
RUN pnpm --filter demo-ui run build

FROM nginx:alpine
COPY --from=build /repo/apps/demo-ui/dist /usr/share/nginx/html
EXPOSE 80