FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run check && npm test && npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
# Obsidian's beta CLI is intentionally optional. Pin HEADLESS_VERSION when deploying.
ARG HEADLESS_VERSION=latest
RUN npm install --global obsidian-headless@${HEADLESS_VERSION}
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /data/vault /data/state /home/node/.config && chown -R node:node /data /home/node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 VAULT_PATH=/data/vault STATE_PATH=/data/state
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/main.ts"]
