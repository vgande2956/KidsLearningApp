# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# ---- production dependencies ----
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
  && npm ci --omit=dev

# ---- run stage ----
FROM node:20-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY server.js auth.js ./
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
