/**
 * Levantamento das contas afetadas pela troca da promessa "trilha inteira
 * gratuita para sempre" (publicada em 07/10/2026) pela estratégia nova (níveis
 * 0 e 1 gratuitos, 2 a 14 por assinatura).
 *
 * Só lê o banco. O relatório não traz e-mail, nome nem id de conta: cada conta
 * vira um número de ordem. Os contatos só saem por `contatosDosAfetados`, que o
 * script chama apenas com a opção explícita de exportar.
 *
 * O nível de cada atividade vem dos metadados (ids de lição, módulo e
 * exercício) e, na falta deles, do padrão dos ids; o texto das aulas pagas não
 * é necessário. Progresso é dado do cliente: serve para avisar, nunca para
 * conceder acesso ou benefício por si só.
 */
import type { DatabaseSync } from 'node:sqlite';
import { atividadeNosNiveisPagos, effectivePlan, indiceDeNiveis, sanitizeProgress, type EstruturaDeNiveis, type IndiceDeNiveis, type PlanId } from '@alicerce/engine';

/**
 * Formato mínimo de um nível do pacote de conteúdo: só ids. Serve o mapa público
 * (`levels` de '@alicerce/content', cujas lições trazem `exercises` com os ids,
 * inclusive das aulas pagas) e o currículo completo (lições com `sections`).
 */
export interface NivelDoConteudo {
  number: number;
  modules: Array<{
    id: string;
    lessons: Array<{ id: string; exercises?: Array<{ id: string }>; sections?: Array<{ blocks: Array<{ type: string; exercise?: { id: string } }> }> }>;
  }>;
}

export function indiceDoConteudo(levels: readonly NivelDoConteudo[]): IndiceDeNiveis {
  const estrutura: EstruturaDeNiveis[] = levels.map((l) => ({
    number: l.number,
    modules: l.modules.map((m) => ({
      id: m.id,
      lessons: m.lessons.map((s) => ({
        id: s.id,
        exerciseIds: s.exercises
          ? s.exercises.map((e) => e.id)
          : (s.sections ?? []).flatMap((sec) => sec.blocks.flatMap((b) => (b.type === 'exercise' && b.exercise ? [b.exercise.id] : []))),
      })),
    })),
  }));
  return indiceDeNiveis(estrutura);
}

export interface ContaNaTransicao {
  /** Número de ordem por data de criação. Não identifica a pessoa. */
  ordem: number;
  criadaEm: number;
  /** Plano gravado em users.plan e plano em vigor (premium vencido conta como free). */
  planoGravado: string;
  planoEmVigor: PlanId;
  planoVenceEm: number | null;
  afetada: boolean;
  niveis: number[];
  primeiraEm: number | null;
  ultimaEm: number | null;
  datadas: number;
  visitasSemData: number;
  depoisDoCorte: number;
  porConvencao: number;
  progressoIlegivel: boolean;
}

export interface RelatorioTransicao {
  geradoEm: number;
  corte: number | null;
  contas: number;
  comProgresso: number;
  afetadas: number;
  /** Afetadas cuja única evidência é visita a lição paga (visitas não têm data). */
  afetadasSoPorVisitas: number;
  primeiraAtividadePaga: number | null;
  ultimaAtividadePaga: number | null;
  /** Por plano em vigor. */
  porPlano: Record<string, { contas: number; afetadas: number }>;
  /** Quantas contas afetadas têm atividade em cada nível. */
  porNivel: Record<string, number>;
  contasAfetadas: ContaNaTransicao[];
  avisos: string[];
}

export interface OpcoesLevantamento {
  corte?: number | null;
  agora?: number;
}

interface Linha {
  id: string;
  created_at: number;
  plan: string;
  plan_expires_at: number | null;
  data: string | null;
  email?: string;
  name?: string;
}

function colunas(db: DatabaseSync, tabela: string): Set<string> {
  return new Set((db.prepare(`PRAGMA table_info(${tabela})`).all() as Array<{ name: string }>).map((c) => c.name));
}

function lerContas(db: DatabaseSync, contato: boolean, avisos: string[]): Linha[] {
  const users = colunas(db, 'users');
  if (!users.size) throw new Error('O banco não tem a tabela users: não parece um banco do servidor da Alicerce.');
  const temProgresso = colunas(db, 'progress').size > 0;
  const temPlano = users.has('plan');
  if (!temPlano) avisos.push('Banco sem as colunas de plano (migração anterior à 3): todas as contas contam como free.');
  if (!temProgresso) avisos.push('Banco sem a tabela progress: nenhuma conta tem progresso no servidor.');
  const plano = temPlano ? 'u.plan AS plan, u.plan_expires_at AS plan_expires_at' : "'free' AS plan, NULL AS plan_expires_at";
  const dados = temProgresso ? 'p.data AS data' : 'NULL AS data';
  const juntar = temProgresso ? 'LEFT JOIN progress p ON p.user_id = u.id' : '';
  const extra = contato ? ', u.email AS email, u.name AS name' : '';
  return db.prepare(`SELECT u.id AS id, u.created_at AS created_at, ${plano}, ${dados}${extra} FROM users u ${juntar} ORDER BY u.created_at, u.id`).all() as unknown as Linha[];
}

function analisar(linhas: Linha[], indice: IndiceDeNiveis, corte: number | null, agora: number) {
  return linhas.map((r, i) => {
    let ilegivel = false;
    let progresso = sanitizeProgress(null);
    if (r.data) {
      try {
        progresso = sanitizeProgress(JSON.parse(r.data));
      } catch {
        ilegivel = true;
      }
    }
    const a = atividadeNosNiveisPagos(progresso, indice, { corte });
    const conta: ContaNaTransicao = {
      ordem: i + 1,
      criadaEm: r.created_at,
      planoGravado: r.plan,
      planoEmVigor: effectivePlan(r.plan, r.plan_expires_at, agora),
      planoVenceEm: r.plan_expires_at,
      afetada: a.temAtividade,
      niveis: a.niveis,
      primeiraEm: a.primeiraEm,
      ultimaEm: a.ultimaEm,
      datadas: a.datadas,
      visitasSemData: a.visitasSemData,
      depoisDoCorte: a.depoisDoCorte,
      porConvencao: a.porConvencao,
      progressoIlegivel: ilegivel,
    };
    return { linha: r, conta, temProgresso: !!r.data && !ilegivel };
  });
}

export function levantarAfetados(db: DatabaseSync, indice: IndiceDeNiveis, opcoes: OpcoesLevantamento = {}): RelatorioTransicao {
  const agora = opcoes.agora ?? Date.now();
  const corte = opcoes.corte ?? null;
  const avisos: string[] = [];
  const analisadas = analisar(lerContas(db, false, avisos), indice, corte, agora);
  const ilegiveis = analisadas.filter((x) => x.conta.progressoIlegivel).length;
  if (ilegiveis) avisos.push(`${ilegiveis} conta(s) com progresso ilegível no banco: contadas como sem atividade.`);
  const deduzidas = analisadas.filter((x) => x.conta.afetada && x.conta.porConvencao > 0).length;
  if (deduzidas) avisos.push(`${deduzidas} conta(s) afetada(s) com nível deduzido pelo padrão do id (metadado ausente).`);
  const afetadas = analisadas.filter((x) => x.conta.afetada).map((x) => x.conta);
  const porPlano: RelatorioTransicao['porPlano'] = {};
  for (const { conta } of analisadas) {
    const p = (porPlano[conta.planoEmVigor] ??= { contas: 0, afetadas: 0 });
    p.contas++;
    if (conta.afetada) p.afetadas++;
  }
  const porNivel: Record<string, number> = {};
  for (const c of afetadas) for (const n of c.niveis) porNivel[n] = (porNivel[n] ?? 0) + 1;
  const datas = afetadas.flatMap((c) => [c.primeiraEm, c.ultimaEm]).filter((x): x is number => x !== null);
  return {
    geradoEm: agora,
    corte,
    contas: analisadas.length,
    comProgresso: analisadas.filter((x) => x.temProgresso).length,
    afetadas: afetadas.length,
    afetadasSoPorVisitas: afetadas.filter((c) => c.datadas === 0).length,
    primeiraAtividadePaga: datas.length ? Math.min(...datas) : null,
    ultimaAtividadePaga: datas.length ? Math.max(...datas) : null,
    porPlano,
    porNivel,
    contasAfetadas: afetadas,
    avisos,
  };
}

export interface ContatoAfetado {
  email: string;
  nome: string;
  criadaEm: number;
  planoEmVigor: PlanId;
  niveis: number[];
  primeiraEm: number | null;
  ultimaEm: number | null;
}

/** Contatos das contas afetadas, para avisar. Só chamar com pedido explícito: são dados pessoais. */
export function contatosDosAfetados(db: DatabaseSync, indice: IndiceDeNiveis, opcoes: OpcoesLevantamento = {}): ContatoAfetado[] {
  const analisadas = analisar(lerContas(db, true, []), indice, opcoes.corte ?? null, opcoes.agora ?? Date.now());
  return analisadas
    .filter((x) => x.conta.afetada)
    .map(({ linha, conta }) => ({
      email: linha.email ?? '',
      nome: linha.name ?? '',
      criadaEm: conta.criadaEm,
      planoEmVigor: conta.planoEmVigor,
      niveis: conta.niveis,
      primeiraEm: conta.primeiraEm,
      ultimaEm: conta.ultimaEm,
    }));
}

const dia = (t: number | null) => (t === null ? '' : new Date(t).toISOString().slice(0, 10));

/** Campo de CSV: aspas sempre, e um apóstrofo antes de =, +, -, @ para a planilha não executar fórmula. */
function campo(v: string): string {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${seguro.replaceAll('"', '""')}"`;
}

export function contatosEmCsv(contatos: readonly ContatoAfetado[]): string {
  const cab = ['email', 'nome', 'conta_criada_em', 'plano_em_vigor', 'niveis_2_a_14', 'primeira_atividade', 'ultima_atividade'];
  const linhas = contatos.map((c) => [c.email, c.nome, dia(c.criadaEm), c.planoEmVigor, c.niveis.join(' '), dia(c.primeiraEm), dia(c.ultimaEm)].map(campo).join(','));
  return [cab.join(','), ...linhas].join('\n') + '\n';
}
