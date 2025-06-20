FROM node:18-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache curl tini

COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8003

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]