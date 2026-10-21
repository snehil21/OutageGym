FROM node:22.23.3-alpine3.24 AS dependencies

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY packages/service-core/package.json packages/service-core/package.json
COPY services/order-api/package.json services/order-api/package.json

RUN npm ci --ignore-scripts

FROM dependencies AS build

COPY packages/service-core/tsconfig.json packages/service-core/tsconfig.json
COPY packages/service-core/src packages/service-core/src
COPY services/order-api/tsconfig.json services/order-api/tsconfig.json
COPY services/order-api/src services/order-api/src

RUN npm run build --workspace @outagegym/service-core \
  && npm run build --workspace @outagegym/order-api

FROM node:22.23.3-alpine3.24 AS runtime

ENV NODE_ENV=production

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY packages/service-core/package.json packages/service-core/package.json
COPY services/order-api/package.json services/order-api/package.json

RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=build /workspace/packages/service-core/dist packages/service-core/dist
COPY --from=build /workspace/services/order-api/dist services/order-api/dist

USER node

EXPOSE 3000

CMD ["node", "services/order-api/dist/main.js"]
