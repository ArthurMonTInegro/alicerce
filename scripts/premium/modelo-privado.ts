/**
 * Arquivos fixos do repositório privado (README, package.json, tsconfig, CI).
 * O separar.ts os escreve junto com o conteúdo; edite aqui para mudar o modelo.
 */
import { readFileSync } from 'node:fs';

const PUBLIC_REPO = 'ArthurMonTInegro/alicerce';
/** Mesmas opções do tsconfig.base.json público, copiadas (o privado pode estar fora da árvore pública). */
const baseOptions = (JSON.parse(readFileSync(new URL('../../tsconfig.base.json', import.meta.url), 'utf8')) as { compilerOptions: object }).compilerOptions;

const README = `# Alicerce Premium (repositório privado)

Conteúdo pago do Alicerce: níveis 2 a 14. Lições completas (explicações, exemplos,
código), exercícios com enunciado, dicas, testes e soluções, cartões de revisão,
aprofundamento teórico e avaliação de autonomia. **Repositório privado: não
redistribuir, não copiar para o repositório público, não publicar em build estático.**

O repositório público (${PUBLIC_REPO}) tem o código, os níveis 0 e 1 completos
e só o mapa dos níveis pagos (títulos, resumos, habilidades, etapas, ids de
exercícios e de cartões), em \`packages/content/src/catalogo-pago.ts\`.

## Como o conteúdo é usado

- **Servidor** (\`apps/api\` do público): com \`ALICERCE_PREMIUM_DIR\` apontando para
  este diretório, carrega os níveis na inicialização e entrega cada aula, cartão e
  dica por \`/api/content/...\` e \`/api/tutor\` só depois de conferir, a cada pedido,
  sessão válida e plano premium não vencido no banco. Sem o diretório, o servidor
  sobe e responde 503 ("conteúdo pago indisponível") para quem tem Premium.
- **Ferramentas** do público (\`npm run test:solutions\`, \`npm test\`,
  \`scripts/check-lessons.ts\`, \`scripts/premium/*\`): usam este diretório quando
  ele está em \`<público>/premium\` ou em \`ALICERCE_PREMIUM_DIR\`, e então
  percorrem o currículo inteiro.
- **Site** (build estático e build do servidor): nunca lê este diretório.

## Estrutura

- \`src/index.ts\`: exporta \`FORMATO\` (contrato com o público) e \`levels\` (níveis 2 a 14 montados).
- \`src/levels/\`: arquivos de lição, na mesma organização de antes da separação
  (\`n02-python.ts\` ... \`n11-n14.ts\`, \`aprofundamento-a.ts\`, \`aprofundamento-b.ts\`, \`modulos/m*.ts\`).
- \`src/aprofundamento/\`: aprofundamento teórico das aulas pagas.
- \`src/autonomia.ts\`: avaliação de autonomia das aulas pagas.
- Os arquivos importam só \`'@alicerce/content/autoria'\` (tipos, helpers e montagem do pacote público).

## Fluxo de trabalho

\`\`\`sh
git clone https://github.com/${PUBLIC_REPO}.git alicerce
cd alicerce
git clone https://github.com/ArthurMonTInegro/alicerce-premium.git premium   # /premium está no .gitignore do público
npm ci
# editar premium/src/levels/...
node scripts/check-lessons.ts premium/src/levels/modulos/m7-1.ts m7-1
node scripts/premium/metadados.ts            # regenera o mapa público; commit no repositório PÚBLICO
ALICERCE_EXIGIR_PREMIUM=1 npm run typecheck && ALICERCE_EXIGIR_PREMIUM=1 npm test && npm run test:solutions
\`\`\`

Mudou título, resumo, minutos, habilidades, referências, etapas, ids ou tipo de
exercício, quantidade de cartões ou termos PT → EN? Rode \`node scripts/premium/metadados.ts\`
e faça commit do \`catalogo-pago.ts\` no repositório público. O CI deste repositório
falha enquanto o mapa público estiver desatualizado.

Ids de lições, exercícios e cartões são permanentes: o progresso dos alunos
guarda esses ids. Nunca renomeie nem reaproveite um id.

## CI

\`.github/workflows/ci.yml\` baixa o repositório público (que é público, então não
precisa de token), coloca este em \`premium/\` e roda, com \`ALICERCE_EXIGIR_PREMIUM=1\`:
mapa público em dia, typecheck, testes, verificação de todas as soluções, os dois
builds (servidor e estático) com a auditoria de acesso e o verificador de vazamento
sobre os arquivos versionados do público e os dois builds. Os logs ficam neste
repositório privado (uma falha pode imprimir trechos do conteúdo pago).

Revisão do público usada: entrada \`ref_publico\` (execução manual), senão a
variável \`ALICERCE_REF_PUBLICO\`, senão \`main\`. Enquanto a separação não estiver na
main do público, defina \`ALICERCE_REF_PUBLICO=premium/separacao\`.
`;

const CI = `# Verificações completas do currículo (público + este repositório).
# O repositório público é baixado sem token porque é público. Se um dia ele ficar
# privado, crie um token de leitura e passe em \`token:\` no primeiro checkout.
# Qual revisão do público: entrada ref_publico (execução manual), senão a variável
# do repositório ALICERCE_REF_PUBLICO (Settings → Secrets and variables → Actions →
# Variables), senão main. Enquanto a separação não estiver na main do público, use
# ALICERCE_REF_PUBLICO=premium/separacao.
name: Verificações completas
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
    inputs:
      ref_publico:
        description: Branch, tag ou commit do repositório público
        required: false
        default: ''
  schedule:
    - cron: '17 6 * * 1' # semanal: pega mudanças do repositório público
permissions:
  contents: read
jobs:
  verificar:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    env:
      ALICERCE_PREMIUM_DIR: \${{ github.workspace }}/premium
      ALICERCE_EXIGIR_PREMIUM: '1'
    steps:
      - name: Repositório público
        uses: actions/checkout@v4
        with:
          repository: ${PUBLIC_REPO}
          ref: \${{ inputs.ref_publico || vars.ALICERCE_REF_PUBLICO || 'main' }}
      - name: Este repositório em premium/
        uses: actions/checkout@v4
        with:
          path: premium
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Mapa público em dia com o conteúdo pago
        run: node scripts/premium/metadados.ts --conferir
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:solutions
      - name: Build do servidor
        run: |
          npm run build
          node scripts/verify-access-build.ts
          cp -r apps/web/dist "$RUNNER_TEMP/dist-servidor"
      - name: Build estático (GitHub Pages)
        env:
          VITE_STATIC: '1'
          BASE_PATH: /alicerce/
        run: |
          npm run build
          node scripts/verify-access-build.ts
      - name: Nada pago no repositório público nem nos builds
        run: node scripts/premium/verificar-vazamento.ts --git --dist "$RUNNER_TEMP/dist-servidor" --dist apps/web/dist
`;

export const PRIVATE_FILES: Record<string, string> = {
  'README.md': README,
  '.github/workflows/ci.yml': CI,
  '.gitignore': 'node_modules\n.DS_Store\n',
  'package.json':
    JSON.stringify(
      {
        name: '@alicerce/premium',
        private: true,
        version: '0.1.0',
        description: 'Conteúdo pago do Alicerce (níveis 2 a 14). Repositório privado: não redistribuir.',
        type: 'module',
        exports: { '.': './src/index.ts' },
      },
      null,
      2,
    ) + '\n',
  // Autônomo: com este diretório em <público>/premium, '@alicerce/content' resolve pelo node_modules do
  // público; fora dele, o público usa scripts/premium/typecheck.ts (que mapeia o import).
  'tsconfig.json': JSON.stringify({ compilerOptions: baseOptions, include: ['src'] }, null, 2) + '\n',
};
