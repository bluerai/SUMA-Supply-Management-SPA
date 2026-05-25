FROM node:lts-alpine3.23
RUN apk add tzdata

USER node
WORKDIR /home/node

ADD --chown=node:node ./package.json .
RUN npm install
ADD --chown=node:node . .

RUN mkdir -p /home/node/data
VOLUME /home/node/data

ENV HTTP_PORT=80
ENV HTTPS_PORT=443
ENV SUMA_CONFIG=/home/node/data/config/
ENV SUMA_BACKUP=/home/node/data/backup/
ENV SUMA_DB=/home/node/data/SUMA.db
ENV SUMA_KEYFILE=key.pem
ENV SUMA_CERTFILE=cert.pem
ENV CRON_EVAL="0 0 10,22 * * *"
ENV CRON_BACKUP="0 0 23 * * *"

HEALTHCHECK --interval=60m --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

CMD [ "node", "server.js" ]