FROM node:23.5-alpine3.20
RUN apk add tzdata

USER node
WORKDIR /home/node

ADD --chown=node:node ./package.json .
RUN npm install
ADD --chown=node:node . .

RUN mkdir -p /home/node/data
VOLUME /home/node/data

ENV PORT=8080
ENV SUMA_DB=/home/node/data/SUMA.db

HEALTHCHECK --interval=5m --timeout=5s --retries=3 \
  CMD ["node", "healthcheck.js"]

CMD [ "node", "index.js" ]