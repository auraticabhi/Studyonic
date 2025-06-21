# user-service

FROM node:18-alpine AS base
WORKDIR /usr/src/app

FROM base AS deps
RUN apk add --no-cache curl 
COPY package.json package-lock.json ./
RUN npm install --omit=dev # Install only production dependencies

FROM base AS runner
RUN apk add --no-cache curl
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

EXPOSE 8001

CMD ["node", "server.js"]