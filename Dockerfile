FROM node:20-bookworm-slim

RUN apt-get -y update \
    && apt-get -y install tini python3 make g++ \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV APP_DIR="/srv/app"

WORKDIR ${APP_DIR}
RUN chown node:node ${APP_DIR}

USER "node"

COPY --chown=node:node package.json package-lock.json tsconfig.json ./
COPY --chown=node:node src ./src

RUN npm install
RUN npm run build

ENV NODE_ENV="production"

EXPOSE 3000/tcp

CMD ["tini", "--", "node", "./dist/server.js"]
