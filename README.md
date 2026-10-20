> Estratégia vigente: [Acesso e planos v3](docs/ESTRATEGIA_ASSINATURA.md). Níveis 0–1 gratuitos; 2–14 Premium. Cobrança ainda não ativa.

# Alicerce

A demonstração publicada é estática: não possui contas de aluno, sincronização ou IA conectada. Acompanhe entregas em `/evolucao`.

Plataforma interativa de formação em computação, do zero ao avançado, em português com o inglês técnico ao lado de cada termo (**variável → variable**).

São 15 níveis (0 a 14), 59 módulos, 111 lições e 484 exercícios corrigidos automaticamente. O código roda no próprio navegador: Python via Pyodide (WebAssembly), JavaScript num worker e SQL num SQLite em memória. Há árvore de habilidades com pré-requisitos, teste diagnóstico, revisão espaçada (FSRS), visualizações interativas, tutor guiado por pistas progressivas, área de carreira e referências comentadas.

## Rodando localmente

Requisitos: Node.js 22.18 ou mais novo (o projeto usa TypeScript executado direto pelo Node, sem etapa de compilação no servidor) e npm.

```bash
npm ci
npm run build      # gera apps/web/dist com as 215 páginas pré-renderizadas
npm start          # API + site em http://localhost:3001
```

Para desenvolver o front-end com recarga automática, rode `npm run dev:api` num terminal e `npm run dev` em outro (o Vite encaminha `/api` para a porta 3001).

Depois de cada `npm run build`, reinicie o servidor: os arquivos estáticos são indexados na inicialização.

### Variáveis de ambiente

Todas são opcionais. Para não repeti-las a cada comando, copie `.env.example` para `.env` na raiz do repositório: `npm start` e `npm run dev:api` carregam esse arquivo se ele existir (opção `--env-file-if-exists` do Node, nos scripts de `apps/api`; sem o arquivo, o Node avisa `../../.env not found. Continuing without it.` e segue normalmente). Uma variável já definida no ambiente prevalece sobre o `.env`. O servidor roda com o diretório de trabalho em `apps/api`, então um caminho relativo no `.env` (como `DATABASE_PATH`) é lido a partir de lá; prefira caminhos absolutos. `npm run backup` e `npm run restore` (abaixo) também carregam o `.env`, a partir da mesma pasta, para agir sobre o mesmo `DATABASE_PATH` e o mesmo `BACKUP_DIR` do servidor. O build (`npm run build`, que usa `SITE_URL`), a imagem Docker e os scripts de administração rodados direto com `node` (`metricas.ts`, `plano.ts`) não leem o `.env`: passe as variáveis no próprio comando.

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` / `HOST` | `3001` / `127.0.0.1` (`0.0.0.0` em produção) | Onde o servidor escuta |
| `DATABASE_PATH` | `apps/api/data/alicerce.db` | Arquivo SQLite (contas e progresso) |
| `BACKUP_DIR` | pasta `backups/` ao lado do banco | Onde ficam os backups (manuais e o automático antes de migrações) |
| `ANTHROPIC_API_KEY` | vazio | Liga o tutor com IA. Sem ela, o tutor usa o modo offline de pistas guiadas |
| `TUTOR_MODEL` | `claude-sonnet-5-5` | Modelo usado pelo tutor |
| `TUTOR_DAILY_LIMIT` | `20` | Teto diário de IA Premium (não aumenta o máximo de 20); 200/mês calendário UTC. Gratuito: sem IA externa. |
| `TRUST_PROXY` | `false` | Ative só atrás de um proxy reverso conhecido |
| `COOKIE_SECURE` | ligado só com `NODE_ENV=production` | Cookie de sessão com atributo `Secure` (exige HTTPS). Com valor, prevalece em qualquer modo: `true`, `1`, `yes` ou `sim` liga; outro valor desliga; vazia vale como não definida |
| `SITE_URL` | vazio | Usado no build para canonical, sitemap e robots.txt |
| `ALICERCE_PREMIUM_DIR` | `<raiz>/premium`, se existir | Clone do repositório privado com o conteúdo pago (níveis 2 a 14). Sem ele, o servidor sobe só com os níveis gratuitos e responde 503 ao Premium. Ver [docs/PREMIUM.md](docs/PREMIUM.md) |
| `ALICERCE_EXIGIR_PREMIUM` | desligado | `1` faz o servidor e as ferramentas falharem se o conteúdo pago não carregar |

### Versão de demonstração (GitHub Pages)

A cada push na main, o CI (`.github/workflows/ci.yml`) roda typecheck, testes, `test:solutions`, build e e2e e, em paralelo, gera uma versão só com o site estático (`BASE_PATH=/alicerce/`, `VITE_STATIC=1`) e a confere com a auditoria de acesso (`scripts/verify-access-build.ts`). Só quando tudo passa nesse mesmo commit o job `pages-publicar` publica esse build no branch `gh-pages`, como um commit novo sobre o anterior (sem force push, com o histórico preservado). Nela tudo roda no navegador; contas, sincronização e o tutor com IA ficam desligados, e o tutor usa o modo offline.

Para voltar a uma versão anterior: Actions → **Pages (rollback)** → Run workflow, com `anterior` (ou `listar` para ver o histórico). Como funciona, segurança e limitações: [docs/PUBLICACAO.md](docs/PUBLICACAO.md).

### Administração

```bash
node apps/api/scripts/metricas.ts            # retenção, funil e pontos difíceis (agregados, sem dados pessoais)
node apps/api/scripts/plano.ts <email> premium 30   # muda o plano de uma conta (cortesia, teste)
```

Backup e restauração do banco (rotina, restauração passo a passo e resposta a incidente em [Operação](docs/OPERACAO.md)):

```bash
npm run backup -w @alicerce/api -- --manter <N>    # cópia consistente com o servidor rodando, com .sha256 e verificação de integridade
npm run restore -w @alicerce/api -- <backup.db>    # com o servidor parado; o banco atual fica guardado ao lado
```

Antes de aplicar uma migração num banco que já tem dados, o servidor faz um backup automático e não sobe se ele falhar.

### Docker

```bash
docker build -t alicerce .
docker run -p 3001:3001 -v alicerce-data:/data -v /srv/alicerce-premium:/premium:ro -e ANTHROPIC_API_KEY=... alicerce
```

O conteúdo pago não entra na imagem: monte o clone do repositório privado em `/premium` (só leitura).

O build da imagem roda typecheck e testes antes de empacotar. A imagem final roda como usuário sem privilégios e tem `HEALTHCHECK` em `/api/health`. Ela usa `NODE_ENV=production`, então o cookie de sessão leva `Secure` e o navegador só o guarda por HTTPS (Chrome e Firefox abrem exceção para `http://localhost`); acessada por `http://ip-da-rede:3001`, a entrada na conta não se mantém. Para testar na rede local sem HTTPS, passe `-e COOKIE_SECURE=false`; em produção, sirva por HTTPS.

No container, banco e backups ficam no volume `/data` (`/data/alicerce.db` e `/data/backups/`). O volume está no mesmo disco do banco, então copie os backups para fora da máquina:

```bash
docker exec <container> node --disable-warning=ExperimentalWarning apps/api/scripts/backup.ts --manter <N>
```

## Verificações

```bash
npm run typecheck        # 4 projetos TypeScript
npm test                 # testes unitários (motor, conteúdo, API)
npm run test:solutions   # executa a solução oficial de cada exercício contra os próprios testes
npm run test:e2e         # Playwright: fluxos, acessibilidade (axe, WCAG 2.2 AA), desktop e celular
node scripts/verify-access-build.ts         # auditoria do build: só as lições gratuitas saem com corpo
node scripts/premium/verificar-vazamento.ts # precisa do privado: nenhum texto pago no repositório nem no build
```

Sem o repositório privado, typecheck, testes e verificação de soluções cobrem os níveis 0 e 1 e o mapa público do currículo; com ele (`premium/` ou `ALICERCE_PREMIUM_DIR`), o currículo inteiro. Veja [docs/PREMIUM.md](docs/PREMIUM.md).

Em ambientes com Chromium já instalado, aponte o Playwright para ele com `PW_CHROMIUM_PATH=/caminho/do/chromium`.

## Estrutura

```
packages/engine    lógica pura: domínio (mastery), FSRS, grafo de pré-requisitos, diagnóstico, tutor offline, saneamento de progresso
packages/content   níveis 0 e 1 completos, mapa público do currículo inteiro, glossário, projetos, entrevistas, referências, pesquisa
                   (o conteúdo das aulas dos níveis 2 a 14 fica no repositório privado; ver docs/PREMIUM.md)
apps/web           React 19 + Vite, editor CodeMirror, executores em workers, visualizações, pré-renderização
apps/api           Fastify + SQLite nativo do Node: contas, sincronização, tutor, cabeçalhos de segurança, site estático
e2e                testes de ponta a ponta
docs               documentação do projeto
```

## Documentação

- [Arquitetura](docs/ARQUITETURA.md): stack, pastas, banco, API, navegação e componentes
- [Pedagogia](docs/PEDAGOGIA.md): a metodologia de cada lição e o porquê de cada decisão
- [Pesquisa](docs/PESQUISA.md): currículos e evidências consultados
- [Currículo](docs/CURRICULO.md): todos os níveis, módulos e lições (gerado com `npm run docs`)
- [Testes](docs/TESTES.md)
- [Segurança](docs/SEGURANCA.md)
- [Conteúdo pago no repositório privado](docs/PREMIUM.md)
- [Operação](docs/OPERACAO.md): backup, restauração, volta de versão e resposta a incidente
- [Roadmap](docs/ROADMAP.md)
- [Transição de acesso](docs/TRANSICAO-ACESSO.md): a promessa anterior de trilha inteira gratuita, quem pode ter sido afetado e o que falta decidir
- [Autoauditoria](docs/AUDITORIA.md): o que está bom, o que é fraco e o que falta

## Licença do conteúdo

Texto, exercícios e código são originais deste projeto. As referências externas são apenas apontadas por link; nenhum material de curso foi copiado.
