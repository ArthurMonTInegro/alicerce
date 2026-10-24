/**
 * Avaliação do tutor pela linha de comando (docs/TUTOR-AVALIACAO.md).
 *
 *   node apps/api/scripts/tutor-avaliacao/rodar.ts [offline|montagem] [--conjunto desenvolvimento|reservado|todos] [--saida <pasta>]
 *   node apps/api/scripts/tutor-avaliacao/rodar.ts real --max-chamadas <n> --teto-usd <x> --saida <pasta fora do repositório>
 *        [--conjunto ..] [--repeticoes <n>] [--modelo <id>] [--esforco low|medium|high] [--preco-entrada <USD por milhão>] [--preco-saida <USD por milhão>]
 *   node apps/api/scripts/tutor-avaliacao/rodar.ts estimar [--conjunto ..] [--repeticoes <n>] [--modelo <id>]
 *   node apps/api/scripts/tutor-avaliacao/rodar.ts resumir <pasta> [--preco-entrada ..] [--preco-saida ..]
 *
 * offline, montagem e estimar não saem para a rede (estimar mostra o lote e o gasto máximo da rodada real). O modo real é PAGO: só roda com
 * TUTOR_AVALIACAO_AUTORIZADA=sim e ANTHROPIC_API_KEY no ambiente, depois que o responsável
 * autorizou aquele consumo. Antes da primeira chamada ele calcula o máximo que a rodada pode
 * custar e recusa se passar de --teto-usd, ou se as chamadas passarem de --max-chamadas. Durante a
 * rodada, soma o custo medido de cada chamada e para antes da próxima se ela puder passar do teto.
 * Os conjuntos de desenvolvimento e reservado são resumidos em separado. Respostas vão para --saida (fora do repositório: podem citar aulas pagas), com uma planilha
 * de notas para a revisão humana; `resumir` junta resultados, notas, latência e custo.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { resolvePremiumDir } from '@alicerce/content/completo';
import { TUTOR_EFFORTS, type TutorEffort } from '../../src/config.ts';
import { loadContentStore } from '../../src/conteudo.ts';
import { TUTOR_MAX_TOKENS } from '../../src/tutor.ts';
import type { Caso } from './casos.ts';
import { casoPorId, escolherCasos, type Conjunto } from './conjuntos.ts';
import { executarTodos, falhas, type Execucao, type Modo } from './executar.ts';
import { entradaEstimada } from './verificacoes.ts';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const MODELO_PADRAO = 'claude-sonnet-5-5';
/** USD por milhão de unidades, da página de preços da Anthropic consultada em 23/10/2026. Conferir antes de usar. */
const PRECOS: Record<string, { entrada: number; saida: number }> = { 'claude-sonnet-5-5': { entrada: 2, saida: 10 } };
const FONTE_PRECOS = 'https://platform.claude.com/docs/en/about-claude/pricing (consultada em 23/10/2026)';
/** Folga na estimativa da entrada (caracteres ÷ 3,5 é grosseiro). */
const FOLGA_ENTRADA = 1.5;
/** Cotas do Premium (docs/ESTRATEGIA_ASSINATURA.md): para projetar o custo por assinante. */
const CHAMADAS_DIA = 20;
const CHAMADAS_MES = 200;

const args = process.argv.slice(2);
const opt = (nome: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const num = (nome: string) => {
  const v = opt(nome);
  const n = v === undefined ? NaN : Number(v.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
function sair(msg: string): never {
  console.error(msg);
  process.exit(1);
}
const usd = (x: number) => `US$ ${x.toFixed(x < 1 ? 4 : 2)}`;

function precos(modelo: string) {
  const conhecido = PRECOS[modelo];
  const entrada = num('preco-entrada') ?? conhecido?.entrada;
  const saida = num('preco-saida') ?? conhecido?.saida;
  if (entrada === undefined || saida === undefined) sair(`Sem preço para ${modelo}: passe --preco-entrada e --preco-saida (USD por milhão de unidades, da página de preços da Anthropic).`);
  return { entrada, saida, fonte: conhecido && opt('preco-entrada') === undefined && opt('preco-saida') === undefined ? FONTE_PRECOS : 'informado na linha de comando' };
}

/* ---------- arquivos de saída ---------- */
const csv = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') (campo += '"'), i++;
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') linha.push(campo), (campo = '');
    else if (c === '\n') linha.push(campo.replace(/\r$/, '')), linhas.push(linha), (linha = []), (campo = '');
    else campo += c;
  }
  if (campo || linha.length) linha.push(campo), linhas.push(linha);
  return linhas;
}
/**
 * Rubrica da revisão humana (docs/TUTOR-AVALIACAO.md): 0, 1 ou 2 em cada dimensão, ou "na" quando a
 * dimensão não se aplica ao caso (qualidade da pista sem exercício, por exemplo).
 */
export const DIMENSOES = ['correcao', 'clareza', 'adaptacao', 'qualidade_da_pista', 'relevancia_curricular', 'seguranca', 'privacidade', 'acesso'] as const;
/** Uma resposta é boa com pelo menos 80% do máximo nas dimensões que se aplicam (a meta antiga era 8 de 10). */
const BOA = 0.8;
const CABECALHO_NOTAS = ['caso', 'conjunto', 'repeticao', ...DIMENSOES, 'falha_critica', 'observacao'];

function revisao(e: Execucao): string {
  const c = casoPorId(e.caso)!;
  const ctx = c.pedido.context ?? {};
  const linhas = [
    `## ${e.caso} (conjunto ${e.conjunto}; ${c.categoria}, conta ${c.conta}${c.ia ? ', IA fora do ar' : ''}${c.cota ? ', cota esgotada' : ''}) · repetição ${e.repeticao}`,
    '',
    `**Pedido** (modo ${c.pedido.mode ?? 'learn'}): ${c.pedido.message}`,
    ...(ctx.exerciseId ? [`Exercício ${ctx.exerciseId}, dicas já vistas: ${ctx.hintsSeen ?? 0}`] : []),
    ...(ctx.lessonId ? [`Lição ${ctx.lessonId}`] : []),
    ...(ctx.code ? ['Código da pessoa:', '```', ctx.code, '```'] : []),
    ...(ctx.error ? [`Erro: \`${ctx.error}\``] : []),
    ...(c.pedido.history?.length ? ['Histórico enviado:', ...c.pedido.history.map((h) => `- ${h.role}: ${h.text}`)] : []),
    '',
    `**Uma boa resposta:** ${c.bom}`,
    '',
    `**Resposta** (HTTP ${e.status}, ${e.modoResposta ?? '-'}${e.motivo ? `, ${e.motivo}` : ''}):`,
    '',
    ...(e.resposta ?? '(sem resposta)').split('\n').map((l) => `> ${l}`),
    '',
    '**Verificações automáticas:**',
    ...e.verificacoes.map((v) => `- ${v.ok === null ? '·' : v.ok ? 'ok' : 'FALHA'} [${v.nivel}] ${v.nome}${v.detalhe ? ` (${v.detalhe})` : ''}`),
    '',
  ];
  return linhas.join('\n');
}

function gravar(pasta: string, execs: Execucao[], meta: Record<string, unknown>) {
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'resultados.jsonl'), execs.map((e) => JSON.stringify({ ...meta, ...e })).join('\n') + '\n');
  writeFileSync(join(pasta, 'revisao.md'), `# Avaliação do tutor: respostas para revisão\n\n${JSON.stringify(meta)}\n\nRubrica: docs/TUTOR-AVALIACAO.md. Notas em notas.csv (0, 1 ou 2 por dimensão; "na" quando não se aplica). Quem revisa não deve ajustar o tutor pelos casos do conjunto reservado.\n\n${execs.map(revisao).join('\n')}`);
  const notas = join(pasta, 'notas.csv');
  if (!existsSync(notas)) writeFileSync(notas, [CABECALHO_NOTAS, ...execs.filter((e) => e.status === 200).map((e) => [e.caso, e.conjunto, e.repeticao])].map((l) => l.map(csv).join(',')).join('\n') + '\n');
}

/* ---------- resumo ---------- */
const percentil = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
};

function resumir(pasta: string) {
  const arq = join(pasta, 'resultados.jsonl');
  if (!existsSync(arq)) sair(`Não achei ${arq}.`);
  const execs = readFileSync(arq, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Execucao & { modelo?: string; esforco?: string });
  const modelo = execs[0]?.modelo ?? MODELO_PADRAO;
  const modos = [...new Set(execs.map((e) => e.modo))];
  console.log(`Avaliação do tutor · ${pasta}`);
  console.log(`${execs.length} execuções de ${new Set(execs.map((e) => e.caso)).size} casos · modo ${modos.join(', ')}${modos.includes('real') ? ` · modelo ${modelo}, esforço ${execs[0]?.esforco ?? '?'}` : ''}`);
  // resultados antigos não tinham o campo: eram todos do conjunto de desenvolvimento
  const conjunto = (e: Execucao): Conjunto => e.conjunto ?? 'desenvolvimento';
  const conjuntos = (['desenvolvimento', 'reservado'] as const).filter((c) => execs.some((e) => conjunto(e) === c));
  const criticasPor = new Map(conjuntos.map((c) => [c, falhas(execs.filter((e) => conjunto(e) === c), 'critica')]));
  for (const c of conjuntos) {
    const doConjunto = execs.filter((e) => conjunto(e) === c);
    const criticas = criticasPor.get(c)!;
    console.log(`\nConjunto ${c} (${new Set(doConjunto.map((e) => e.caso)).size} casos): falhas críticas automáticas ${criticas.length}`);
    for (const f of criticas) console.log(`  - ${f}`);
    console.log(`  achados de qualidade (heurísticos): ${falhas(doConjunto, 'qualidade').length} · problemas de montagem: ${falhas(doConjunto, 'montagem').length}`);
  }

  // custo e latência: só chamadas que saíram de verdade
  const reais = modos.includes('real') ? execs.flatMap((e) => e.chamadas).filter((c) => !c.simulada) : [];
  if (reais.length) {
    const ok = reais.filter((c) => !c.erro);
    const ms = ok.map((c) => c.ms);
    const p = precos(modelo);
    const custo = (c: (typeof reais)[number]) => ((c.uso?.entrada ?? 0) * p.entrada + (c.uso?.saida ?? 0) * p.saida) / 1e6;
    const total = reais.reduce((n, c) => n + custo(c), 0);
    const medio = total / reais.length;
    const entrada = reais.reduce((n, c) => n + (c.uso?.entrada ?? 0), 0);
    const saida = reais.reduce((n, c) => n + (c.uso?.saida ?? 0), 0);
    console.log(`\nChamadas ao modelo: ${reais.length} · com erro: ${reais.length - ok.length} · cortadas no teto (${TUTOR_MAX_TOKENS}): ${reais.filter((c) => c.stop === 'max_tokens').length}`);
    if (ms.length) console.log(`Latência (do servidor de avaliação até a resposta do modelo; sem a rede até a pessoa): p50 ${percentil(ms, 50)} ms · p95 ${percentil(ms, 95)} ms · máx ${Math.max(...ms)} ms (${ms.length} chamadas)`);
    console.log(`Unidades: entrada ${entrada} (média ${Math.round(entrada / reais.length)}), saída ${saida} (média ${Math.round(saida / reais.length)}), pensamento incluído`);
    console.log(`Custo a ${usd(p.entrada)}/${usd(p.saida)} por milhão (${p.fonte}): total ${usd(total)}, média ${usd(medio)} por chamada`);
    console.log(`Projeção com a média desta rodada: ${usd(medio * CHAMADAS_DIA)} por assinante no limite do dia (${CHAMADAS_DIA}), ${usd(medio * CHAMADAS_MES)} no limite do mês (${CHAMADAS_MES}). É a média destes casos, não do uso real.`);
  } else console.log('\nSem chamadas reais ao modelo: custo e latência não medidos.');

  const notas = join(pasta, 'notas.csv');
  const linhas = existsSync(notas) ? lerCsv(readFileSync(notas, 'utf8')) : [];
  const cab = linhas[0] ?? [];
  const col = (nome: string) => cab.indexOf(nome);
  if (linhas.length && DIMENSOES.some((d) => col(d) < 0)) {
    console.log(`\nRevisão humana: notas.csv não tem as colunas da rubrica atual (${DIMENSOES.join(', ')}). Planilhas da rubrica antiga, de 5 dimensões, não entram neste resumo.`);
    return;
  }
  const valor = (l: string[], d: string) => (l[col(d)] ?? '').trim().toLowerCase();
  // avaliada: todas as dimensões com 0, 1, 2 ou "na", e ao menos uma com nota
  const avaliadas = linhas.slice(1).filter((l) => DIMENSOES.every((d) => /^([012]|na)$/.test(valor(l, d))) && DIMENSOES.some((d) => valor(l, d) !== 'na'));
  if (!avaliadas.length) {
    console.log('\nRevisão humana: nenhuma nota em notas.csv (0 a 2 em cada dimensão, ou "na"). Sem ela, não há resultado pedagógico.');
    return;
  }
  const aplicaveis = (l: string[]) => DIMENSOES.filter((d) => valor(l, d) !== 'na');
  const fracao = (l: string[]) => aplicaveis(l).reduce((n, d) => n + Number(valor(l, d)), 0) / (2 * aplicaveis(l).length);
  for (const c of conjuntos) {
    const doConjunto = avaliadas.filter((l) => (valor(l, 'conjunto') || 'desenvolvimento') === c);
    if (!doConjunto.length) {
      console.log(`\nRevisão humana, conjunto ${c}: nenhuma resposta com nota.`);
      continue;
    }
    const humanas = doConjunto.filter((l) => /^s/i.test(valor(l, 'falha_critica')));
    const pct = (doConjunto.filter((l) => fracao(l) >= BOA).length / doConjunto.length) * 100;
    console.log(`\nRevisão humana, conjunto ${c}: ${doConjunto.length} respostas com nota · média ${((doConjunto.reduce((n, l) => n + fracao(l), 0) / doConjunto.length) * 100).toFixed(0)}% do máximo · ${pct.toFixed(0)}% com ${BOA * 100}% ou mais`);
    for (const d of DIMENSOES) {
      const ns = doConjunto.map((l) => valor(l, d)).filter((v) => v !== 'na').map(Number);
      if (ns.length) console.log(`  ${d}: média ${(ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(2)} de 2 (${ns.length} respostas)`);
    }
    console.log(`  falhas críticas apontadas na revisão: ${humanas.length}${humanas.length ? ` (${humanas.map((l) => l[col('caso')]).join(', ')})` : ''}`);
    const semCritica = criticasPor.get(c)!.length === 0 && humanas.length === 0;
    console.log(`  metas de docs/TUTOR_IA_V2.md: zero falhas críticas ${semCritica ? 'atingida' : 'NÃO atingida'}; 90% das respostas boas ${pct >= 90 ? 'atingida' : 'NÃO atingida'}.`);
    if (c === 'desenvolvimento') console.log('  (no conjunto de desenvolvimento a meta só orienta: ele é usado para ajustar o tutor)');
    if (new Set(doConjunto.map((l) => l[col('repeticao')])).size > 1) {
      const porCaso = new Map<string, number[]>();
      for (const l of doConjunto) porCaso.set(l[col('caso')]!, [...(porCaso.get(l[col('caso')]!) ?? []), fracao(l)]);
      const variam = [...porCaso].filter(([, ns]) => Math.max(...ns) - Math.min(...ns) >= 0.2);
      console.log(`  variação entre repetições (20 pontos ou mais): ${variam.length ? variam.map(([k, ns]) => `${k} ${ns.map((n) => Math.round(n * 100)).join('/')}`).join(', ') : 'nenhuma'}`);
    }
  }
}

/* ---------- execução ---------- */
const modo = (args[0] ?? 'offline') as Modo | 'resumir' | 'estimar';
if (modo === 'resumir') {
  if (!args[1]) sair('Uso: rodar.ts resumir <pasta>');
  resumir(resolve(args[1]));
  process.exit(0);
}
if (!['offline', 'montagem', 'real', 'estimar'].includes(modo)) sair(`Modo desconhecido: ${modo}. Use offline, montagem, estimar, real ou resumir.`);

const { store: content, warnings } = await loadContentStore(resolvePremiumDir());
for (const w of warnings) console.error(`aviso: ${w}`);
const modelo = opt('modelo') ?? MODELO_PADRAO;
const esforcoOpt = opt('esforco') ?? 'low';
if (!TUTOR_EFFORTS.includes(esforcoOpt as TutorEffort)) sair(`--esforco precisa ser ${TUTOR_EFFORTS.join(', ')}.`);
const esforco = esforcoOpt as TutorEffort;
const saida = opt('saida') ? resolve(opt('saida')!) : undefined;
let casos: Caso[] = [];
try {
  casos = escolherCasos(opt('conjunto'));
} catch (e) {
  sair((e as Error).message);
}
const meta = { modelo, esforco, conjunto: opt('conjunto') ?? 'todos', data: new Date().toISOString(), conteudo: content.premium === 'disponivel' ? 'com o pago' : 'só o gratuito' };
const foraDoRepositorio = (pasta: string) => relative(RAIZ, pasta).startsWith('..');
// Com o conteúdo pago carregado, as respostas podem citar aulas pagas: nunca dentro do repositório público.
if (saida && content.premium === 'disponivel' && !foraDoRepositorio(saida)) sair(`--saida precisa ficar fora do repositório (${RAIZ}) quando o conteúdo pago está carregado.`);

/**
 * O lote da rodada real, sem rede: o pedido montado de cada caso dá a entrada estimada, e a saída
 * conta pelo teto de cada resposta (o pior caso, pensamento incluído).
 */
async function loteReal(repeticoes: number, p: { entrada: number; saida: number; fonte: string }) {
  const montados = await executarTodos({ modo: 'montagem', content, modelo, esforco }, casos);
  const pagos = montados.filter((e) => casoPorId(e.caso)!.espera.ia === 'responde');
  const chamadas = pagos.length * repeticoes;
  const maxDaChamada = (e: Execucao) => (entradaEstimada(e.chamadas[0]!) * FOLGA_ENTRADA * p.entrada + TUTOR_MAX_TOKENS * p.saida) / 1e6;
  const maximo = repeticoes * pagos.reduce((n, e) => n + maxDaChamada(e), 0);
  const maiorChamada = pagos.length ? Math.max(...pagos.map(maxDaChamada)) : 0;
  console.log(`Rodada real: ${pagos.length} casos chamam o modelo (${pagos.filter((e) => e.conjunto === 'desenvolvimento').length} de desenvolvimento, ${pagos.filter((e) => e.conjunto === 'reservado').length} reservados) × ${repeticoes} repetição(ões) = ${chamadas} chamadas a ${modelo} (esforço ${esforco}).`);
  console.log(`Gasto máximo: ${usd(maximo)} (entrada estimada com folga de ${Math.round((FOLGA_ENTRADA - 1) * 100)}% + saída no teto de ${TUTOR_MAX_TOKENS}, a ${usd(p.entrada)}/${usd(p.saida)} por milhão; ${p.fonte}).`);
  return { chamadas, maximo, maiorChamada };
}

if (modo === 'estimar') {
  const repeticoes = Math.max(1, Math.floor(num('repeticoes') ?? 1));
  const { chamadas, maximo } = await loteReal(repeticoes, precos(modelo));
  console.log(`Para autorizar exatamente este lote: --max-chamadas ${chamadas} --teto-usd ${(Math.ceil(maximo * 100) / 100).toFixed(2)}${opt('conjunto') ? ` --conjunto ${opt('conjunto')}` : ''}${repeticoes > 1 ? ` --repeticoes ${repeticoes}` : ''}`);
  process.exit(0);
}

if (modo !== 'real') {
  const execs = await executarTodos({ modo, content, modelo, esforco }, casos);
  for (const c of ['desenvolvimento', 'reservado'] as const) {
    const doConjunto = execs.filter((e) => e.conjunto === c);
    if (!doConjunto.length) continue;
    console.log(`${modo}, conjunto ${c}: ${doConjunto.length} casos · falhas críticas ${falhas(doConjunto, 'critica').length} · montagem ${falhas(doConjunto, 'montagem').length} · achados de qualidade ${falhas(doConjunto, 'qualidade').length}`);
    for (const nivel of ['critica', 'montagem', 'qualidade'] as const) for (const f of falhas(doConjunto, nivel)) console.log(`  [${nivel}] ${f}`);
  }
  if (modo === 'montagem') {
    const est = execs.flatMap((e) => e.chamadas.filter((c) => !c.simulada).map(entradaEstimada));
    if (est.length) console.log(`Pedido ao modelo: entrada ESTIMADA (caracteres ÷ 3,5) média ${Math.round(est.reduce((a, b) => a + b, 0) / est.length)}, máxima ${Math.max(...est)} unidades; saída até ${TUTOR_MAX_TOKENS}.`);
  }
  if (saida) {
    gravar(saida, execs, { ...meta, modo });
    console.log(`Respostas, verificações e planilha de notas em ${saida}`);
  }
  process.exit(falhas(execs, 'critica').length || falhas(execs, 'montagem').length ? 1 : 0);
}

/* modo real: pago */
if (process.env.TUTOR_AVALIACAO_AUTORIZADA !== 'sim') sair('Modo real é pago. Só rode depois da autorização do responsável para este consumo, com TUTOR_AVALIACAO_AUTORIZADA=sim no ambiente.');
const chave = process.env.ANTHROPIC_API_KEY;
if (!chave) sair('Falta ANTHROPIC_API_KEY no ambiente (nunca na linha de comando nem em arquivo do repositório).');
if (!saida) sair('Falta --saida: a pasta onde ficam as respostas (fora do repositório).');
if (!foraDoRepositorio(saida)) sair(`--saida precisa ficar fora do repositório (${RAIZ}): as respostas podem citar aulas pagas.`);
const repeticoes = Math.max(1, Math.floor(num('repeticoes') ?? 1));
const maxChamadas = num('max-chamadas');
const teto = num('teto-usd');
if (maxChamadas === undefined || teto === undefined) sair('Faltam --max-chamadas e --teto-usd: o limite de chamadas e de gasto que foi autorizado.');
const p = precos(modelo);

const { chamadas, maximo, maiorChamada } = await loteReal(repeticoes, p);
if (chamadas > maxChamadas) sair(`Recusado: ${chamadas} chamadas passam de --max-chamadas ${maxChamadas}.`);
if (maximo > teto) sair(`Recusado: o gasto máximo passa de --teto-usd ${teto}.`);

const cliente = new Anthropic({ apiKey: chave, timeout: 25_000, maxRetries: 0 });
mkdirSync(saida, { recursive: true });
const parcial = join(saida, 'resultados.jsonl');
writeFileSync(parcial, '');
let feitas = 0;
// Corte durante a rodada: soma o custo medido (unidades devolvidas pela API) e não começa um caso
// que, no pior caso (a maior chamada estimada), passaria do teto autorizado.
let gasto = 0;
let cortou = false;
const execs = await executarTodos(
  { modo: 'real', content, cliente, modelo, esforco },
  casos,
  repeticoes,
  (e) => {
    // grava a cada caso: uma interrupção não perde o que já foi pago
    appendFileSync(parcial, JSON.stringify({ ...meta, ...e }) + '\n');
    const c = e.chamadas.find((x) => !x.simulada);
    if (c) gasto += ((c.uso?.entrada ?? 0) * p.entrada + (c.uso?.saida ?? 0) * p.saida) / 1e6;
    const crit = e.verificacoes.filter((v) => v.nivel === 'critica' && v.ok === false).length;
    console.log(`[${++feitas}/${casos.length * repeticoes}] ${e.caso}: ${e.modoResposta ?? e.status}${c ? ` · ${c.ms} ms · ${c.uso?.entrada ?? 0}/${c.uso?.saida ?? 0} unidades${c.erro ? ` · erro ${c.erro}` : ''}` : ''} · ${crit} falha(s) crítica(s) · gasto até aqui ${usd(gasto)}`);
  },
  (proximo) => {
    if (proximo.espera.ia !== 'responde' || gasto + maiorChamada <= teto) return false;
    cortou = true;
    return true;
  },
);
if (cortou) console.log(`\nRodada CORTADA antes de ${casos.length * repeticoes - feitas} caso(s): o próximo poderia passar do teto de ${usd(teto)} (gasto medido ${usd(gasto)}).`);
gravar(saida, execs, { ...meta, modo: 'real' });
console.log('');
resumir(saida);
