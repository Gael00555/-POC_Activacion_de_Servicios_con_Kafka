FROM node:22-alpine AS base
RUN npm install -g pnpm@12.8.1
WORKDIR /repo

# 1) Dependencias. Solo se copian los package.json y el lockfile, así esta
#    capa se reutiliza mientras no cambien las dependencias.
FROM base AS deps
ARG APP
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/contracts/package.json libs/contracts/
COPY libs/kafka-toolkit/package.json libs/kafka-toolkit/
COPY apps/activation-api/package.json apps/activation-api/
COPY apps/billing-service/package.json apps/billing-service/
COPY apps/provisioning-service/package.json apps/provisioning-service/
COPY apps/notification-service/package.json apps/notification-service/
COPY apps/crm-analytics-service/package.json apps/crm-analytics-service/
COPY apps/demo-ui/package.json apps/demo-ui/
COPY apps/loyalty-service/package.json apps/loyalty-service/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "${APP}..."

# 2) Compilación: primero las librerías y después el servicio. Al final se
#    arma una copia de producción: solo lo necesario para correr.
FROM deps AS build
ARG APP
COPY libs ./libs
COPY apps/${APP} ./apps/${APP}
RUN pnpm --filter @activation-poc/contracts run build \
 && pnpm --filter @activation-poc/kafka-toolkit run build \
 && pnpm --filter ${APP} run build \
 && pnpm --filter ${APP} deploy --prod /out

# 3) Imagen final, sin herramientas de desarrollo.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
USER node
CMD ["node", "dist/main"]