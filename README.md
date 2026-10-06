# Alicerce

Plataforma interativa de formação em computação, do zero ao avançado, em português com o inglês técnico ao lado de cada termo (**variável → variable**).

São 15 níveis (0 a 14), 59 módulos, 69 lições e 237 exercícios corrigidos automaticamente. O código roda no próprio navegador: Python via Pyodide (WebAssembly), JavaScript num worker isolado e SQL num SQLite em memória. Há árvore de habilidades com pré-requisitos, teste diagnóstico, revisão espaçada (FSRS), visualizações interativas, tutor que dá pistas e nunca entrega a resposta, área de carreira e referências verificadas.

## Rodando localmente

Requisitos: Node.js 22.18 ou mais novo (o projeto usa TypeScript executado direto pelo Node, sem etapa de compilação no servidor) e npm.

```bash
npm ci
npm run build      # gera apps/web/dist com as 168 páginas pré-renderizadas
npm start          # API + site em http://localhost:3001
```

Para desenvolver o front-end com recarga automática, rode `npm run dev:api` num terminal e `npm run dev` em outro (o Vite encaminha `/api` para a porta 3001).

Depois de cada `npm run build`, reinicie o servidor: os arquivos estáticos são indexados na inicialização.

### Variáveis de ambiente

Todas são opcionais; veja `.env.example`.

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` / `HOST` | `3001` / `127.0.0.1` (`0.0.0.0` em produção) | Onde o servidor escuta |
| `DATABASE_PATH` | `apps/api/data/alicerce.db` | Arquivo SQLite (contas e progresso) |
| `ANTHROPIC_API_KEY` | vazio | Liga o tutor com IA. Sem ela, o tutor usa o modo offline de pistas guiadas |
| `TUTOR_MODEL` | `claude-sonnet-5-5` | Modelo usado pelo tutor |
| `TUTOR_DAILY_LIMIT` | `60` | Perguntas por dia, por conta, ao tutor com IA |
| `TRUST_PROXY` | `false` | Ative só atrás de um proxy reverso conhecido |
| `COOKIE_SECURE` | ligado em produção | Cookie de sessão com atributo `Secure` (exige HTTPS) |
| `SITE_URL` | vazio | Usado no build para canonical, sitemap e robots.txt |

### Versão de demonstração (GitHub Pages)

O workflow `.github/workflows/pages.yml` gera, a cada push na main, uma versão só com o site estático (`BASE_PATH=/alicerce/`, `VITE_STATIC=1`) e a publica no branch `gh-pages`. Nela tudo roda no navegador; contas, sincronização e o tutor com IA ficam desligados, e o tutor usa o modo offline.

### Administração

```bash
node apps/api/scripts/metricas.ts            # retenção, funil e pontos difíceis (agregados, sem dados pessoais)
node apps/api/scripts/plano.ts <email> premium 30   # muda o plano de uma conta (cortesia, teste)
```

### Docker

```bash
docker build -t alicerce .
docker run -p 3001:3001 -v alicerce-data:/data -e ANTHROPIC_API_KEY=... alicerce
```

O build da imagem roda typecheck e testes antes de empacotar. A imagem final roda como usuário sem privilégios e tem `HEALTHCHECK` em `/api/health`.

## Verificações

```bash
npm run typecheck        # 4 projetos TypeScript
npm test                 # testes unitários (motor, conteúdo, API)
npm run test:solutions   # executa a solução oficial de cada exercício contra os próprios testes
npm run test:e2e         # Playwright: fluxos, acessibilidade (axe, WCAG 2.2 AA), desktop e celular
```

Em ambientes com Chromium já instalado, aponte o Playwright para ele com `PW_CHROMIUM_PATH=/caminho/do/chromium`.

## Estrutura

```
packages/engine    lógica pura: domínio (mastery), FSRS, grafo de pré-requisitos, diagnóstico, tutor offline, saneamento de progresso
packages/content   todo o conteúdo: níveis, lições, exercícios, cartões, glossário, projetos, entrevistas, referências, pesquisa
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
- [Roadmap](docs/ROADMAP.md)
- [Autoauditoria](docs/AUDITORIA.md): o que está bom, o que é fraco e o que falta

## Licença do conteúdo

Texto, exercícios e código são originais deste projeto. As referências externas são apenas apontadas por link; nenhum material de curso foi copiado.
