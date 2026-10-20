# syntax=docker/dockerfile:1
# Imagem de produção: compila o front-end (pré-renderizado) e roda a API Node
# como usuário sem privilégios. Node 22.18+ executa TypeScript direto (type stripping).

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
RUN npm ci --no-audit --no-fund
COPY . .
ARG SITE_URL=https://alicerce.example
ENV SITE_URL=$SITE_URL
RUN npm run typecheck && npm test && npm run build

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
RUN npm ci --omit=dev --no-audit --no-fund --workspace @alicerce/api --include-workspace-root=false

FROM node:22-slim
# Conteúdo pago (níveis 2 a 14): NÃO entra na imagem (premium/ está no .dockerignore).
# Monte o clone do repositório privado em /premium, só leitura:
#   docker run -v /srv/alicerce-premium:/premium:ro ...
# Sem ele o servidor sobe só com os níveis gratuitos e responde 503 ao Premium.
# ALICERCE_EXIGIR_PREMIUM=1 faz a inicialização falhar se o conteúdo pago não carregar.
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/data/alicerce.db WEB_DIST=/app/apps/web/dist ALICERCE_PREMIUM_DIR=/premium
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY --from=build /app/apps/web/dist ./apps/web/dist
RUN mkdir -p /data && chown node:node /data
# Backups (apps/api/scripts/backup.ts e o automático antes de migrações) ficam no
# mesmo volume, em /data/backups. É o mesmo disco do banco: copie-os para fora
# da máquina (docs/OPERACAO.md).
ENV BACKUP_DIR=/data/backups
USER node
VOLUME ["/data"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "apps/api/src/main.ts"]
