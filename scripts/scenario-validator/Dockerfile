FROM node:22.23.3-alpine3.24

WORKDIR /tool

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts \
  && npm cache clean --force

COPY validate.mjs ./validate.mjs

USER node

ENTRYPOINT ["node", "/tool/validate.mjs"]
