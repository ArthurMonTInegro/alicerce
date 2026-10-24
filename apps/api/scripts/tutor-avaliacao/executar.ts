/**
 * Executa os casos da avaliação do tutor (casos.ts) contra o servidor de verdade (buildApp, banco
 * em memória), com a conta, o plano, a cota e o estado da IA de cada caso, e aplica as
 * verificações (verificacoes.ts). Modos, que provam coisas diferentes (docs/TUTOR-AVALIACAO.md):
 * - offline: sem IA configurada; avalia o apoio local (o mesmo coachReply do site).
 * - montagem: cliente do modelo simulado, que só registra o pedido montado; prova o que o
 *   modelo receberia e quando ele é chamado, nunca a qualidade da resposta.
 * - real: cliente de verdade, pago. Só rodar.ts liga, com autorização explícita para o consumo.
 * Um caso "fora do ar" nunca sai para a rede, em modo nenhum: o cliente falha antes.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { PlanId } from '@alicerce/engine';
import { buildApp } from '../../src/app.ts';
import { loadConfig, type TutorEffort } from '../../src/config.ts';
import type { ContentStore } from '../../src/conteudo.ts';
import { openDb } from '../../src/db.ts';
import { setPlan } from '../../src/plans.ts';
import type { Caso } from './casos.ts';
import { conjuntoDe, TODOS_OS_CASOS, type Conjunto } from './conjuntos.ts';
import { verificar, type Chamada, type Modo, type Resultado } from './verificacoes.ts';

export type { Modo } from './verificacoes.ts';
export interface Execucao {
  caso: string;
  conjunto: Conjunto;
  categoria: Caso['categoria'];
  conta: Caso['conta'];
  modo: Modo;
  repeticao: number;
  status: number;
  resposta?: string;
  modoResposta?: 'ia' | 'offline';
  motivo?: string;
  chamadas: Chamada[];
  verificacoes: Resultado[];
}
/** Só o que o tutor usa do cliente da Anthropic. */
export type ClienteModelo = { beta: { messages: { create(params: never): Promise<unknown> } } };
export interface Opcoes {
  modo: Modo;
  content: ContentStore;
  /** modo real: o cliente de verdade (rodar.ts cria, com a chave do ambiente) */
  cliente?: ClienteModelo;
  modelo?: string;
  esforco?: TutorEffort;
}

export const RESPOSTA_SIMULADA = 'RESPOSTA SIMULADA: a montagem do pedido não avalia a resposta.';

/** Responde sem sair para a rede, sempre com o mesmo texto e zero unidades. */
const clienteSimulado: ClienteModelo = {
  beta: {
    messages: {
      create: async (params: never) => ({
        id: 'msg_simulado',
        type: 'message',
        role: 'assistant',
        model: (params as { model: string }).model,
        stop_reason: 'end_turn',
        usage: { input_tokens: 0, output_tokens: 0 },
        content: [{ type: 'text', text: RESPOSTA_SIMULADA }],
      }),
    },
  },
};

/** Registra cada chamada (pedido, tempo, unidades, erro); fora do ar, falha sem chamar. */
function registrando(base: ClienteModelo, foraDoAr: boolean, chamadas: Chamada[]): Anthropic {
  return {
    beta: {
      messages: {
        create: async (params: Chamada['params']) => {
          const c: Chamada = { params, ms: 0, ...(foraDoAr ? { simulada: true as const } : {}) };
          chamadas.push(c);
          const inicio = performance.now();
          try {
            if (foraDoAr) throw new Error('fora do ar (simulado): nenhuma chamada saiu');
            const res = (await base.beta.messages.create(params as never)) as { usage?: { input_tokens?: number; output_tokens?: number }; stop_reason?: string | null };
            c.uso = { entrada: res.usage?.input_tokens ?? 0, saida: res.usage?.output_tokens ?? 0 };
            c.stop = res.stop_reason ?? null;
            return res;
          } catch (err) {
            c.erro = (err as Error).message.slice(0, 300);
            throw err;
          } finally {
            c.ms = Math.round(performance.now() - inicio);
          }
        },
      },
    },
  } as unknown as Anthropic;
}

const H = { 'x-alicerce': '1', 'content-type': 'application/json' };

export async function executarCaso(caso: Caso, o: Opcoes, repeticao = 1): Promise<Execucao> {
  if (o.modo === 'real' && !o.cliente) throw new Error('modo real sem cliente');
  const db = openDb(':memory:');
  const chamadas: Chamada[] = [];
  const modelo = o.modelo ?? 'claude-sonnet-5-5';
  const esforco = o.esforco ?? 'low';
  // Configuração própria, sem ler o ambiente (nada de chave de verdade por acaso) e sem gravar e-mails.
  const config = {
    ...loadConfig({}),
    webDist: '/none',
    emailLogPath: null,
    anthropicApiKey: o.modo === 'offline' ? undefined : 'avaliacao (o cliente é injetado)',
    tutorModel: modelo,
    tutorEffort: esforco,
  };
  const anthropicClient = o.modo === 'offline' ? undefined : registrando(o.modo === 'real' ? o.cliente! : clienteSimulado, caso.ia === 'fora-do-ar', chamadas);
  const app = await buildApp({ db, content: o.content, config, mailer: null, ...(anthropicClient ? { anthropicClient } : {}) });
  try {
    const headers: Record<string, string> = { ...H };
    let plano: PlanId = 'free';
    if (caso.conta !== 'visitante') {
      const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers, payload: { email: `${caso.id}@avaliacao.invalid`, password: 'senha-da-avaliacao-123' } });
      if (reg.statusCode >= 300) throw new Error(`cadastro da conta do caso ${caso.id}: HTTP ${reg.statusCode}`);
      const id = (reg.json() as { user: { id: string } }).user.id;
      headers.cookie = String(reg.headers['set-cookie']).split(';')[0]!;
      if (caso.conta === 'premium') {
        setPlan(db, id, 'premium', null, 'avaliacao');
        plano = 'premium';
      }
      if (caso.cota === 'esgotada')
        db.prepare('INSERT INTO tutor_usage (user_id, day, count) VALUES (?, ?, ?)').run(id, new Date().toISOString().slice(0, 10), config.tutorDailyLimit);
    }
    const res = await app.inject({ method: 'POST', url: '/api/tutor', headers, payload: caso.pedido });
    let json: { reply?: string; mode?: 'ia' | 'offline'; reason?: string } = {};
    try {
      json = res.json();
    } catch {
      /* corpo não JSON: as verificações de status e de resposta mostram */
    }
    const base = { caso, modo: o.modo, plano, content: o.content, status: res.statusCode, corpo: res.body, chamadas, esperado: { modelo, esforco } };
    const visto = {
      ...(typeof json.reply === 'string' ? { resposta: json.reply } : {}),
      ...(json.mode ? { modoResposta: json.mode } : {}),
      ...(json.reason ? { motivo: json.reason } : {}),
    };
    return {
      caso: caso.id,
      conjunto: conjuntoDe(caso.id),
      categoria: caso.categoria,
      conta: caso.conta,
      modo: o.modo,
      repeticao,
      status: res.statusCode,
      ...visto,
      chamadas,
      verificacoes: verificar({ ...base, ...visto }),
    };
  } finally {
    await app.close();
    db.close();
  }
}

/**
 * Todos os casos (ou os escolhidos), um de cada vez, `repeticoes` vezes cada. `parar` é consultado
 * antes de cada caso: devolvendo true, a rodada acaba ali (o corte de gasto do modo real).
 */
export async function executarTodos(o: Opcoes, casos: Caso[] = TODOS_OS_CASOS, repeticoes = 1, aoTerminar?: (e: Execucao) => void, parar?: (proximo: Caso) => boolean): Promise<Execucao[]> {
  const out: Execucao[] = [];
  for (let rep = 1; rep <= repeticoes; rep++)
    for (const caso of casos) {
      if (parar?.(caso)) return out;
      const e = await executarCaso(caso, o, rep);
      out.push(e);
      aoTerminar?.(e);
    }
  return out;
}

/** Falhas por nível, como texto curto: "caso: verificação (detalhe)". */
export function falhas(execs: Execucao[], nivel: Resultado['nivel']): string[] {
  return execs.flatMap((e) => e.verificacoes.filter((v) => v.nivel === nivel && v.ok === false).map((v) => `${e.caso}: ${v.nome}${v.detalhe ? ` (${v.detalhe})` : ''}`));
}
