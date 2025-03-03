FROM node:23.5-alpine3.20
RUN apk add tzdata
RUN apk add curl

USER node
WORKDIR /home/node

ADD --chown=node:node ./package.json .
RUN npm install
ADD --chown=node:node . .

RUN mkdir -p /home/node/data
VOLUME /home/node/data

ENV HTTP_PORT=80
ENV HTTPS_PORT=443
ENV SUMA_DIR=/home/node/data/
ENV SUMA_CONFIG=/home/node/data/config/
ENV SUMA_BACKUP=/home/node/data/backup/
ENV SUMA_DB=/home/node/data/SUMA.db
ENV KEYFILE=key.pem
ENV CERTFILE=cert.pem
ENV CRON_EVAL="0 0 10,22 * * *"
ENV CRON_BACKUP="0 0 23 * * *"

HEALTHCHECK --interval=5m --timeout=5s --retries=3 \
  CMD ["sh", "healthcheck.sh"]

CMD [ "node", "server.js" ]