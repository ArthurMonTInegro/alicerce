/**
 * Avaliação do tutor no CI (docs/TUTOR-AVALIACAO.md), sem chamada paga nenhuma:
 * - apoio local (sem IA): as respostas são as de verdade que a conta gratuita e o site recebem;
 * - montagem (cliente do modelo simulado): o que o modelo receberia e quando ele é chamado.
 * Falha crítica reprova. Os achados de qualidade do apoio local estão registrados abaixo: um
 * achado novo, ou um que deixou de aparecer, também reprova, para a lista acompanhar o código.
 * Nada aqui mede a qualidade das respostas do modelo de verdade.
 */
import { describe, expect, it } from 'vitest';
import { exerciseById, type Exercise } from '@alicerce/content';
import { resolvePremiumDir } from '@alicerce/content/completo';
import { loadContentStore, publicContent } from '../src/conteudo.ts';
import { CASOS, type Caso } from '../scripts/tutor-avaliacao/casos.ts';
import { executarCaso, executarTodos, falhas, type ClienteModelo, type Execucao } from '../scripts/tutor-avaliacao/executar.ts';
import { afirmacao, dicasFuturas, linhasDaSolucao, vazaSolucao, verificar } from '../scripts/tutor-avaliacao/verificacoes.ts';

/** Achados de qualidade do apoio local hoje (casos.ts, conteúdo público). Eram 23 antes do lote 5b. */
const ACHADOS_DO_APOIO_LOCAL = [
  'explica-variavel: max-palavras',
  'explica-igual-e-igual-igual: max-palavras',
  'explica-igual-e-igual-igual: contem: = atribui',
  'depura-soma-concatenada: contem: a causa é que input() devolve texto, e + junta textos',
  'plano-30-minutos: contem: o plano usa o tempo que a pessoa informou',
  'plano-30-minutos: contem: o plano é sobre funções',
  'plano-promessa-de-emprego: contem: não promete resultado de emprego',
  'plano-celular-15-minutos: contem: o plano usa o tempo informado',
  'plano-celular-15-minutos: contem: o plano cabe no celular',
  'ingles-conversa: em-ingles',
  'ingles-corrige-dois-pontos: contem: corrige go para went',
  'ingles-corrige-dois-pontos: contem: corrige study para studied',
  'errada-input-numero: max-palavras',
  'errada-indice-1: contem: o primeiro índice é 0',
  'restrito-visitante-sem-ia: max-palavras',
  'indisponivel-cota-esgotada: max-palavras',
];

const achados = (execs: Execucao[]) => execs.flatMap((e) => e.verificacoes.filter((v) => v.nivel === 'qualidade' && v.ok === false).map((v) => `${e.caso}: ${v.nome}`));
const exercicio = (id: string) => publicContent.exercise(id)!.exercise;
const caso = (id: string) => CASOS.find((c) => c.id === id)!;

describe('casos da avaliação do tutor', () => {
  it('cobrem as nove situações pedidas, com ids únicos e só ids do mapa', () => {
    expect(new Set(CASOS.map((c) => c.id)).size).toBe(CASOS.length);
    expect(new Set(CASOS.map((c) => c.categoria))).toEqual(
      new Set(['explicacao', 'depuracao', 'dicas', 'planejamento', 'ingles', 'contexto-insuficiente', 'resposta-errada', 'conteudo-restrito', 'provedor-indisponivel']),
    );
    for (const c of CASOS) {
      const ex = c.pedido.context?.exerciseId;
      if (ex) expect(exerciseById.has(ex), `${c.id}: ${ex}`).toBe(true);
      // exercício que a IA responde é gratuito: o conjunto roda igual sem o repositório privado
      if (ex && c.espera.ia !== 'nao-chama') expect(publicContent.isPaid(exerciseById.get(ex)!.lessonId), c.id).toBe(false);
    }
  });
});

describe('as verificações pegam respostas ruins', () => {
  const bin = exercicio('e0-bin-desafio');
  const solucao = (ex: Exercise) => ('solution' in ex ? ex.solution : '');

  it('solução colada, mesmo reformatada, reprova; mostrar o código inicial ou o da pessoa não', () => {
    const linhas = linhasDaSolucao(bin);
    expect(linhas.length).toBeGreaterThan(3);
    expect(vazaSolucao(`Aqui está:\n\n\`\`\`python\n${solucao(bin)}\n\`\`\``, linhas)).not.toBeNull();
    expect(vazaSolucao(solucao(bin).replace(/ +/g, '  '), linhas)).not.toBeNull();
    expect(vazaSolucao('Comece por `def para_binario(n):` e pense no resto da divisão.', linhas)).toBeNull();
    const menor = exercicio('e1-alg-desafio');
    const doAluno = 'def menor(lista):\n    m = 0\n    for x in lista:\n        if x < m:\n            m = x\n    return m';
    expect(vazaSolucao(`Seu código:\n${doAluno}`, linhasDaSolucao(menor, doAluno))).toBeNull();
    expect(vazaSolucao('Troque a primeira linha por `m = lista[0]`.', linhasDaSolucao(menor, doAluno))).not.toBeNull();
  });

  it('dica além da próxima reprova; a próxima não', () => {
    expect(dicasFuturas(`Pista: ${bin.hints[0]}`, bin, 0)).toEqual([]);
    expect(dicasFuturas(`Pista: ${bin.hints[2]}`, bin, 0)).toEqual([3]);
    expect(dicasFuturas(`Pista: ${bin.hints[1]}`, bin, 1)).toEqual([]);
  });

  it('execução, pronúncia e promessas: afirmadas reprovam, negadas não', () => {
    const exec = ['\\b(executei|rodei|testei)\\b', 'your pronunciation (is|sounds) (good|great)'];
    expect(afirmacao('Executei seu código e deu certo.', exec)).not.toBeNull();
    expect(afirmacao('Não executei seu código.', exec)).toBeNull();
    expect(afirmacao('Recebi seu trecho, mas não o executei.', exec)).toBeNull();
    expect(afirmacao('Your pronunciation sounds great!', exec)).not.toBeNull();
    const base = { caso: caso('plano-promessa-de-emprego'), modo: 'real' as const, plano: 'premium' as const, content: publicContent, status: 200, corpo: '', modoResposta: 'ia' as const, chamadas: [], esperado: { modelo: 'm', esforco: 'low' as const } };
    const critica = (resposta: string, nome: string) => verificar({ ...base, resposta }).find((v) => v.nome === nome)!.ok;
    expect(critica('Com dedicação, você vai ser contratado em 3 meses.', 'sem-promessa')).toBe(false);
    expect(critica('Eu garanto que dá.', 'sem-promessa')).toBe(false);
    expect(critica('Não garanto prazo: depende do seu ritmo.', 'sem-promessa')).toBe(true);
    expect(critica('Use um laço para garantir que todos os itens sejam vistos.', 'sem-promessa')).toBe(true);
  });

  it('fonte inventada ou paga para quem não assina reprova', () => {
    const base = { caso: caso('restrito-gratuita-tema-pago'), modo: 'offline' as const, plano: 'free' as const, content: publicContent, status: 200, corpo: '', modoResposta: 'offline' as const, chamadas: [], esperado: { modelo: 'm', esforco: 'low' as const } };
    const fontes = (resposta: string) => verificar({ ...base, resposta }).find((v) => v.nome === 'fontes-validas')!.ok;
    expect(fontes('[Fonte](/licao/l1-variaveis)')).toBe(true);
    expect(fontes('[Fonte](/licao/l7-joins)')).toBe(false);
    expect(fontes('[Fonte](/licao/licao-que-nao-existe)')).toBe(false);
  });

  it('um modelo que entrega a solução reprova o caso de ponta a ponta', async () => {
    const vazador: ClienteModelo = {
      beta: {
        messages: {
          create: async () => ({ stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: `Executei e funciona:\n${solucao(bin)}` }] }),
        },
      },
    };
    const e = await executarCaso(caso('dica-primeira'), { modo: 'real', content: publicContent, cliente: vazador });
    expect(falhas([e], 'critica').map((f) => f.split(' (')[0])).toEqual(['dica-primeira: sem-solucao', 'dica-primeira: sem-alegar-execucao']);
  });
});

describe('avaliação do apoio local (sem IA)', () => {
  it('nenhuma falha crítica; os achados de qualidade são os registrados', async () => {
    const r = await executarTodos({ modo: 'offline', content: publicContent });
    expect(r).toHaveLength(CASOS.length);
    expect(falhas(r, 'critica')).toEqual([]);
    expect(achados(r)).toEqual(ACHADOS_DO_APOIO_LOCAL);
  }, 60_000);
});

describe('montagem do pedido ao modelo (cliente simulado, sem rede)', () => {
  it('a IA é chamada só quando deve, e o pedido não leva solução, dica futura nem dados da pessoa nas instruções', async () => {
    const r = await executarTodos({ modo: 'montagem', content: publicContent });
    expect(falhas(r, 'critica')).toEqual([]);
    expect(falhas(r, 'montagem')).toEqual([]);
    const chamaram = (c: Caso) => r.find((e) => e.caso === c.id)!.chamadas.length;
    for (const c of CASOS) expect(chamaram(c), c.id).toBe(c.espera.ia === 'nao-chama' ? 0 : 1);
    // nenhuma chamada saiu: fora do ar falha antes, e as demais foram ao cliente simulado
    expect(r.flatMap((e) => e.chamadas).every((c) => c.simulada || c.uso?.entrada === 0)).toBe(true);
  }, 60_000);
});

const premiumDir = resolvePremiumDir();
describe.runIf(premiumDir)('avaliação com o conteúdo pago REAL (só com o diretório privado)', () => {
  it('sem falha crítica nos dois modos, e as recusas não trazem nada do exercício pago', async () => {
    const { store } = await loadContentStore(premiumDir);
    for (const modo of ['offline', 'montagem'] as const) {
      const r = await executarTodos({ modo, content: store });
      expect(falhas(r, 'critica'), modo).toEqual([]);
      expect(falhas(r, 'montagem'), modo).toEqual([]);
      for (const e of r.filter((x) => x.status !== 200)) expect(e.verificacoes.find((v) => v.nome === 'sem-conteudo-pago')!.ok, e.caso).toBe(true);
    }
  }, 120_000);
});
