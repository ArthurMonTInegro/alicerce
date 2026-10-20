# Conteúdo pago num repositório privado

Níveis 0 e 1 são gratuitos e ficam inteiros neste repositório. O conteúdo das
aulas dos níveis 2 a 14 (Premium) mora num repositório privado separado
(nome sugerido: `ArthurMonTInegro/alicerce-premium`) e só sai do servidor para
quem tem sessão válida **e** plano premium não vencido no banco, conferidos a
cada pedido.

**Limite importante:** a separação protege as próximas entregas. Tudo o que já
foi versionado neste repositório (o histórico do git, inclusive commits e
branches antigos) e o que já foi publicado (por exemplo, builds antigos no
branch `gh-pages`) continua lá. Apagar esse histórico exigiria reescrevê-lo e
forçar o envio, o que não foi feito; é uma decisão à parte.

O que já foi enviado ao GitHub (conferido em 15/10/2026 pelas referências
locais `origin/*` e pelo verificador de vazamento rodado sobre cada arquivo do
histórico, sem consultar o GitHub):

- O histórico da `main` (`8b29cc2`, de 13/10/2026), e a demonstração publicada a
  partir dela, trazem o corpo de todas as aulas pagas, inclusive as 20 lições
  de m7-1 a m9-3.
- O branch `integracao-codex` foi enviado ao GitHub em 14/10/2026, às 01:35 UTC,
  no commit `1a6f0b0`, antes da separação. Além do que a `main` já tinha, ele
  traz da cópia do Codex o aprofundamento teórico de 76 aulas pagas
  (`packages/content/src/theory/*.ts`, `theory-expansions.ts`) e a avaliação de
  autonomia de Python com as respostas (`autonomy.ts`), que nunca estiveram na
  `main`: cerca de 26 700 sequências de 8 palavras do texto pago que só esse
  envio expôs.
- Nenhum commit posterior a `1a6f0b0` traz trecho pago que já não estivesse
  nesses envios.
- Juntar `integracao-codex` à `main` com o histórico leva os commits da cópia
  para a `main`. Juntar como um commit só (squash) não leva, mas o branch já
  enviado continua no GitHub até ser apagado lá. As duas decisões são do Arthur.

## O que fica onde

| Público (este repositório) | Privado |
|---|---|
| Código do site, da API, do motor e das ferramentas | Arquivos de lição dos níveis 2 a 14 (`src/levels/...`), inclusive as 20 lições de m7-1 a m9-3 |
| Níveis 0 e 1 completos (`packages/content/src/levels/n00-*.ts`, `n01-*.ts`), com aprofundamento e avaliação de autonomia | Aprofundamento teórico das aulas pagas (`src/aprofundamento/`) |
| Mapa do currículo inteiro: níveis, módulos, roteiros, habilidades, títulos, resumos, minutos, referências, etapas, ids e tipo de cada exercício, número de cartões, título do aprofundamento (`packages/content/src/catalogo-pago.ts`, gerado) | Avaliação de autonomia das aulas pagas (`src/autonomia.ts`) |
| Termos PT → EN das lições pagas, porque o glossário é recurso aberto (`paidTerms` em `catalogo-pago.ts`) | Enunciados, soluções, dicas, testes, explicações, objetivos, cartões |
| Projetos, glossário, laboratório, diagnóstico, referências, pesquisa | Workflow de CI com as verificações completas |

O corpo de cada lição paga só existe no privado. A base do tutor das aulas pagas
não é arquivo: o servidor a monta na inicialização a partir do conteúdo privado
(`buildTutorKnowledge`).

Os ids (lições, exercícios, cartões, módulos, níveis, habilidades) ficam no mapa
público: o progresso dos alunos guarda esses ids, e o teste
`nenhum id de antes da separação sumiu do mapa público` confere os 1194 ids de
antes da separação (`packages/content/src/ids-antes-da-separacao.json`).

## Como o privado é encontrado

`packages/content/src/privado.ts`, nesta ordem:

1. `ALICERCE_PREMIUM_DIR` (caminho absoluto ou relativo ao diretório atual; vazio
   ou `0` desliga);
2. `<raiz do repositório>/premium`, se existir (`/premium` está no `.gitignore`).

`ALICERCE_EXIGIR_PREMIUM=1` transforma a ausência (ou falha de carga) em erro:
use no CI do repositório privado e no servidor de produção, quando ele não deve
subir sem o conteúdo pago.

O privado exporta `FORMATO` (versão do contrato, hoje 1) e `levels` (níveis 2 a 14
já montados). Os arquivos dele importam só `'@alicerce/content/autoria'` (tipos,
helpers e montagem); quando o diretório fica fora desta árvore, um gancho de
resolução do Node (e, no Vitest, um alias) aponta esse import para cá.

## Servidor

Na inicialização, `apps/api/src/conteudo.ts` carrega o privado. Sem ele (ou se a
carga falhar e `ALICERCE_EXIGIR_PREMIUM` não estiver ligado), o servidor sobe só
com os níveis gratuitos e registra um aviso; `/api/health` diz
`conteudoPago: "indisponivel"`.

Rotas que entregam conteúdo pago, sempre com `Cache-Control: private, no-store` e
`Vary: Cookie`:

| Rota | Visitante | Conta gratuita | Premium ativo | Premium sem o privado |
|---|---|---|---|---|
| `GET /api/content/lessons/:id` (aula paga) | 401 | 403 | 200 com a aula | 503 "conteúdo do Premium indisponível" |
| `GET /api/content/lessons/:id` (aula gratuita) | 200 | 200 | 200 | 200 |
| `GET /api/content/cards` | 401 | 403 | 200, cartões de todas as aulas | 503 |
| `POST /api/tutor` com lição ou exercício pago | 401 | 403 | 200, com enunciado, dicas e base da aula | 503 |

Plano e sessão vêm do banco em cada pedido (`getEntitlements`). Plano vencido
volta a gratuito no pedido seguinte. Nada que venha do cliente (cabeçalho,
parâmetro, progresso, desbloqueio pedagógico, importação) autoriza.

Docker: a imagem não inclui o privado (`premium` está no `.dockerignore`). Monte o
clone em `/premium`, só leitura:

```sh
docker run -p 3001:3001 -v alicerce-data:/data -v /srv/alicerce-premium:/premium:ro -e ALICERCE_EXIGIR_PREMIUM=1 alicerce
```

## Site

O build (servidor e estático) só lê o pacote público: gera o corpo das 15 lições
gratuitas e o mapa do resto. Sai idêntico byte a byte com e sem o privado por perto
(conferido nos dois modos, servidor e estático). As páginas das aulas pagas saem como
prévia; para assinantes, o navegador pede o corpo a `/api/content/lessons/:id`.
`node scripts/verify-access-build.ts` audita a estrutura do build.

## Ferramentas

Com o privado disponível, percorrem o currículo inteiro; sem ele, só os níveis 0 e
1, e a primeira linha da saída diz qual foi o caso.

```sh
npm run typecheck          # inclui os tipos do privado (scripts/premium/typecheck.ts)
npm test                   # testes de conteúdo usam loadCurriculum()
npm run test:solutions     # com o privado: 290 exercícios executáveis
node scripts/check-lessons.ts premium/src/levels/modulos/m7-1.ts m7-1
node scripts/premium/metadados.ts            # regenera catalogo-pago.ts a partir do privado
node scripts/premium/metadados.ts --conferir # só confere (o CI do privado usa)
node scripts/premium/verificar-vazamento.ts  # ver abaixo
```

Mudou no privado título, resumo, minutos, habilidades, referências, etapas, ids ou
tipo de exercício, quantidade de cartões ou termos? Rode
`node scripts/premium/metadados.ts` e faça commit de `catalogo-pago.ts` aqui. Com o
privado presente, os testes falham enquanto o mapa estiver desatualizado, e o
servidor avisa no log.

## Verificador de vazamento

`node scripts/premium/verificar-vazamento.ts [--git] [--dist <dir>]...` precisa do
privado. Extrai o texto de todas as aulas pagas (corpo, objetivos, enunciados,
soluções e explicações, dicas, testes, cartões, aprofundamento, autonomia),
quebra em sequências de 5 a 8 palavras normalizadas e procura cada uma em todos
os arquivos versionados (`git ls-files`) e em cada build (HTML, JS, JSON,
sourcemaps), depois de decodificar escapes de JS/JSON e entidades HTML.
Sequências que também existem em dados legitimamente públicos (aulas gratuitas,
mapa, glossário, referências, projetos...) são descartadas e contadas à parte.

Antes de procurar, o script prova que acusa conteúdo pago em JSON, HTML escapado,
JS com `\u` e num arquivo-fonte do privado. Coincidências revisadas por uma pessoa
(o YAML padrão do GitHub Actions, cabeçalhos de segurança, exemplos do
laboratório público...) ficam em `scripts/premium/vazamento-revisado.json`, só
como hash, cada grupo com o motivo. `--detalhar` mostra o texto delas no terminal;
`--rascunho <arquivo>` grava ocorrências novas no formato da lista, para revisão.
Num vazamento grande, a saída lista as 40 primeiras ocorrências de cada alvo e
resume o resto por arquivo, categoria e aula; a lista inteira vai para `--json`.

O próprio verificador tem teste (`scripts/premium/verificar-vazamento.test.ts`), que
roda também no CI público: ele cria um repositório privado falso, com texto
inventado, e confere que um build limpo passa e que dica, cartão e corpo da aula
copiados para JS (com `\u`), HTML (com entidades) ou JSON reprovam, inclusive um
vazamento de centenas de milhares de ocorrências.

Sem o privado, o CI público tem ainda uma guarda estrutural
(`packages/content/src/sem-conteudo-pago.test.ts`): nenhum arquivo da árvore pode
definir lição, exercício, cartão, aprofundamento ou avaliação de autonomia de aula
paga (`id`, `lessonId` ou chave de avaliação com um id pago do mapa), fora o mapa
gerado `catalogo-pago.ts`. Ela não lê texto, então não substitui o verificador; pega
o caso de um arquivo de lição (ou parte dele) copiado de volta para cá, e também um
clone do privado esquecido dentro da árvore fora de `premium/`.

## Separação (como foi feita e como refazer)

`scripts/premium/separar.ts` gera o diretório privado a partir das fontes de uma
revisão git e prova, antes de terminar, que o privado carregado pelo mesmo caminho
do servidor é idêntico (lição por lição, campo por campo) ao currículo daquela
revisão. Foi rodado assim:

```sh
node scripts/premium/separar.ts --revisao ac1f4ac --saida <privado> --aplicar   # retirou o pago desta árvore (commit cfcbf16)
node scripts/premium/separar.ts --revisao ac1f4ac --saida <privado> --substituir # regenera o privado (mantém .git)
```

`ac1f4ac` é a última revisão com o conteúdo pago neste repositório; o conteúdo
dela é o mesmo de `integracao-codex` (1a6f0b0). Daqui em diante, o conteúdo pago se
edita no repositório privado, não mais por este script.

## CI

- **Público** (`.github/workflows/ci.yml`): roda sem o privado (typecheck, testes,
  soluções e build dos níveis gratuitos, auditoria do build, e2e). Os testes e2e
  não dependem de conteúdo pago.
- **Privado** (`.github/workflows/ci.yml` lá): baixa este repositório (público, sem
  token), põe o privado em `premium/` e roda tudo com `ALICERCE_EXIGIR_PREMIUM=1`:
  mapa em dia, typecheck, testes, as 290 soluções, os dois builds com auditoria e
  o verificador de vazamento sobre os arquivos versionados e os dois builds.

Dar ao CI público um token de leitura do privado é decisão do Arthur. Ponto contra:
os logs do CI de um repositório público são públicos, e uma falha de teste ou do
verificador imprime trechos do conteúdo pago.
