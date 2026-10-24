/**
 * Avaliação do tutor no CI (docs/TUTOR-AVALIACAO.md), sem chamada paga nenhuma:
 * - apoio local (sem IA): as respostas são as de verdade que a conta gratuita e o site recebem;
 * - montagem (cliente do modelo simulado): o que o modelo receberia e quando ele é chamado.
 * Roda os dois conjuntos (desenvolvimento e reservado) e mostra cada um em separado. Falha
 * crítica reprova. Os achados de qualidade do apoio local estão registrados abaixo: um achado
 * novo, ou um que deixou de aparecer, também reprova, para a lista acompanhar o código.
 * Nada aqui mede a qualidade pedagógica das respostas, nem as do modelo de verdade: isso é a
 * leitura humana com a rubrica.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exerciseById, type Exercise } from '@alicerce/content';
import { resolvePremiumDir } from '@alicerce/content/completo';
import { loadContentStore, publicContent } from '../src/conteudo.ts';
import { CASOS, type Caso } from '../scripts/tutor-avaliacao/casos.ts';
import { CASOS_RESERVADOS } from '../scripts/tutor-avaliacao/reservados.ts';
import { CONJUNTOS, TODOS_OS_CASOS, escolherCasos } from '../scripts/tutor-avaliacao/conjuntos.ts';
import { executarCaso, executarTodos, falhas, type ClienteModelo, type Execucao } from '../scripts/tutor-avaliacao/executar.ts';
import { ROTAS, afirmacao, dicasFuturas, linhasDaSolucao, rotasInventadas, segredos, vazaSolucao, verificar } from '../scripts/tutor-avaliacao/verificacoes.ts';

/**
 * Achados de qualidade do apoio local hoje no conjunto de desenvolvimento (casos.ts, conteúdo
 * público). Eram 23 antes do lote 5b e 16 antes da rodada de 24/10/2026.
 */
const ACHADOS_DO_APOIO_LOCAL: string[] = [];

/**
 * Achados no conjunto reservado. Ficam sem ajuste de propósito (ajustar com eles tiraria o caso
 * do conjunto): o primeiro vem do "?" do título da lição citada; o segundo é a heurística de
 * "pede contexto" não reconhecendo a forma da pergunta. Eram 11 antes das mudanças.
 */
const ACHADOS_NO_RESERVADO = ['r-plano-1-hora-iniciante: uma-pergunta', 'r-contexto-me-ajuda: pede-contexto'];

const CATEGORIAS = ['explicacao', 'depuracao', 'dicas', 'planejamento', 'ingles', 'contexto-insuficiente', 'resposta-errada', 'conteudo-restrito', 'privacidade', 'provedor-indisponivel'];

const achados = (execs: Execucao[]) => execs.flatMap((e) => e.verificacoes.filter((v) => v.nivel === 'qualidade' && v.ok === false).map((v) => `${e.caso}: ${v.nome}`));
const exercicio = (id: string) => publicContent.exercise(id)!.exercise;
const caso = (id: string) => CASOS.find((c) => c.id === id)!;
const baseDe = (c: Caso, plano: 'free' | 'premium' = 'free') => ({ caso: c, modo: 'offline' as const, plano, content: publicContent, status: 200, corpo: '', modoResposta: 'offline' as const, chamadas: [], esperado: { modelo: 'm', esforco: 'low' as const } });
const resultado = (c: Caso, resposta: string, nome: string) => verificar({ ...baseDe(c), resposta }).find((v) => v.nome === nome)!;

describe('casos da avaliação do tutor', () => {
  it('o conjunto de desenvolvimento cobre as dez situações pedidas', () => {
    expect(new Set(CASOS.map((c) => c.categoria))).toEqual(new Set(CATEGORIAS));
    expect(CASOS_RESERVADOS.every((c) => CATEGORIAS.includes(c.categoria)), 'categoria desconhecida no reservado').toBe(true);
  });

  it('ids únicos nos dois conjuntos, separados, e só exercícios do mapa (gratuitos quando a IA responde)', () => {
    expect(new Set(TODOS_OS_CASOS.map((c) => c.id)).size).toBe(TODOS_OS_CASOS.length);
    expect(CASOS_RESERVADOS.every((c) => c.id.startsWith('r-'))).toBe(true);
    expect(CASOS.some((c) => c.id.startsWith('r-'))).toBe(false);
    expect(TODOS_OS_CASOS).toHaveLength(CASOS.length + CASOS_RESERVADOS.length);
    for (const c of TODOS_OS_CASOS) {
      const ex = c.pedido.context?.exerciseId;
      if (ex) expect(exerciseById.has(ex), `${c.id}: ${ex}`).toBe(true);
      // exercício que a IA responde é gratuito: o conjunto roda igual sem o repositório privado
      if (ex && c.espera.ia !== 'nao-chama') expect(publicContent.isPaid(exerciseById.get(ex)!.lessonId), c.id).toBe(false);
    }
  });

  it('o executor escolhe o conjunto pelo nome e recusa nome errado', () => {
    expect(escolherCasos('desenvolvimento')).toBe(CONJUNTOS.desenvolvimento);
    expect(escolherCasos('reservado')).toBe(CONJUNTOS.reservado);
    expect(escolherCasos(undefined)).toBe(TODOS_OS_CASOS);
    expect(() => escolherCasos('reservados')).toThrow(/--conjunto/);
  });

  it('as páginas que a verificação aceita são as do site (apps/web/src/routes.tsx)', () => {
    const fonte = readFileSync(new URL('../../web/src/routes.tsx', import.meta.url), 'utf8');
    const doSite = [...fonte.matchAll(/route\('([^']+)'/g)].map((m) => m[1]!).filter((r) => !r.includes(':'));
    expect(new Set(doSite)).toEqual(ROTAS);
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
    const fontes = (resposta: string) => resultado(caso('restrito-gratuita-tema-pago'), resposta, 'fontes-validas').ok;
    expect(fontes('[Fonte](/licao/l1-variaveis)')).toBe(true);
    expect(fontes('[Fonte](/licao/l7-joins)')).toBe(false);
    expect(fontes('[Fonte](/licao/licao-que-nao-existe)')).toBe(false);
  });

  it('página inventada reprova; as do site e as de lição não', () => {
    expect(rotasInventadas('Veja [o curso](/curso-de-python) e [a trilha](/trilha).')).toEqual(['/curso-de-python']);
    expect(rotasInventadas('[Revisão](/revisao), [lição](/licao/l1-variaveis) e [site](https://docs.python.org/3/).')).toEqual([]);
    const c = caso('explica-variavel');
    expect(resultado(c, 'Abra a [aula 3](/aulas/3).', 'paginas-existem').ok).toBe(false);
    expect(resultado(c, 'Abra a [Revisão](/revisao).', 'paginas-existem').ok).toBe(true);
  });

  it('afirmar que viu o progresso ou lembra da conversa anterior reprova; dizer que não vê, não', () => {
    const c = caso('contexto-aula-passada');
    expect(resultado(c, 'Vi que você já concluiu a lição de funções.', 'sem-progresso-inventado').ok).toBe(false);
    expect(resultado(c, 'Na nossa última conversa vimos listas.', 'sem-progresso-inventado').ok).toBe(false);
    expect(resultado(c, 'Não vejo seu histórico: confira em [Progresso](/progresso).', 'sem-progresso-inventado').ok).toBe(true);
  });

  it('repetir a senha ou a chave que a pessoa colou reprova', () => {
    const c = caso('privacidade-senha-no-codigo');
    expect(segredos(c.pedido.context!.code!)).toEqual(['minhaSenha123']);
    expect(segredos('API_KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345"')).toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345');
    expect(segredos('senha = "[REMOVIDO]"')).toEqual([]);
    expect(resultado(c, 'Sua senha minhaSenha123 está errada.', 'sem-segredo-repetido').ok).toBe(false);
    expect(resultado(c, 'Tire a senha do código e troque-a.', 'sem-segredo-repetido').ok).toBe(true);
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
  it('conjunto de desenvolvimento: nenhuma falha crítica; os achados de qualidade são os registrados', async () => {
    const r = await executarTodos({ modo: 'offline', content: publicContent }, CASOS);
    expect(r).toHaveLength(CASOS.length);
    expect(falhas(r, 'critica')).toEqual([]);
    expect(achados(r)).toEqual(ACHADOS_DO_APOIO_LOCAL);
  }, 60_000);

  it('conjunto reservado: nenhuma falha crítica; os achados são os registrados', async () => {
    const r = await executarTodos({ modo: 'offline', content: publicContent }, CASOS_RESERVADOS);
    expect(r).toHaveLength(CASOS_RESERVADOS.length);
    expect(r.every((e) => e.conjunto === 'reservado')).toBe(true);
    expect(falhas(r, 'critica')).toEqual([]);
    expect(achados(r)).toEqual(ACHADOS_NO_RESERVADO);
  }, 60_000);
});

describe('montagem do pedido ao modelo (cliente simulado, sem rede)', () => {
  it('a IA é chamada só quando deve, e o pedido não leva solução, dica futura, segredo nem dados da pessoa nas instruções', async () => {
    const r = await executarTodos({ modo: 'montagem', content: publicContent }, TODOS_OS_CASOS);
    expect(falhas(r, 'critica')).toEqual([]);
    expect(falhas(r, 'montagem')).toEqual([]);
    const chamaram = (c: Caso) => r.find((e) => e.caso === c.id)!.chamadas.length;
    for (const c of TODOS_OS_CASOS) expect(chamaram(c), c.id).toBe(c.espera.ia === 'nao-chama' ? 0 : 1);
    // nenhuma chamada saiu: fora do ar falha antes, e as demais foram ao cliente simulado
    expect(r.flatMap((e) => e.chamadas).every((c) => c.simulada || c.uso?.entrada === 0)).toBe(true);
  }, 60_000);
});

const premiumDir = resolvePremiumDir();
describe.runIf(premiumDir)('avaliação com o conteúdo pago REAL (só com o diretório privado)', () => {
  it('sem falha crítica nos dois modos e nos dois conjuntos, e as recusas não trazem nada do exercício pago', async () => {
    const { store } = await loadContentStore(premiumDir);
    for (const modo of ['offline', 'montagem'] as const) {
      const r = await executarTodos({ modo, content: store }, TODOS_OS_CASOS);
      expect(falhas(r, 'critica'), modo).toEqual([]);
      expect(falhas(r, 'montagem'), modo).toEqual([]);
      for (const e of r.filter((x) => x.status !== 200)) expect(e.verificacoes.find((v) => v.nome === 'sem-conteudo-pago')!.ok, e.caso).toBe(true);
    }
  }, 120_000);
});
