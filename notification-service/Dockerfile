FROM node:18-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache curl tini

COPY package*.json ./
RUN npm install --omit=dev
COPY . .
# This service has an API on 8004 and a worker
EXPOSE 8004 

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]