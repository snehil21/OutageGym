FROM node:22.23.3-alpine3.24 AS dependencies

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY services/notification-worker/package.json services/notification-worker/package.json

RUN npm ci --ignore-scripts

FROM dependencies AS build

COPY services/notification-worker/tsconfig.json services/notification-worker/tsconfig.json
COPY services/notification-worker/src services/notification-worker/src

RUN npm run build --workspace @outagegym/notification-worker

FROM node:22.23.3-alpine3.24 AS runtime

ENV NODE_ENV=production

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY services/notification-worker/package.json services/notification-worker/package.json

RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=build /workspace/services/notification-worker/dist services/notification-worker/dist

USER node

CMD ["node", "services/notification-worker/dist/main.js"]
