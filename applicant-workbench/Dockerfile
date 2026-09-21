FROM node:22.17.0-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev
FROM node:22.17.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3200 HOST=0.0.0.0 DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY server ./server
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 3200
CMD ["node", "--experimental-sqlite", "server/index.mjs"]
