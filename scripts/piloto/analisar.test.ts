/**
 * A análise do piloto roda sobre exportações inventadas aqui, no formato do
 * "Exportar JSON" da página Progresso, e com um mapa de currículo mínimo.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { emptyProgress, type AttemptRecord, type ProgressState } from '@alicerce/engine';
import { analisar, dentroDoRepositorio, licoesDaJornada, lerConversas, lerParticipantes, lerRegistro, lerTarefas, primeiroEncontro, relatorio, ultimaAntes, type LicaoDaJornada } from './analisar.ts';

const T0 = Date.UTC(2026, 10, 2, 15); // 02/11/2026, 12h em Fortaleza
const DIA = 86_400_000;
const tentativa = (exerciseId: string, at: number, o: Partial<AttemptRecord> = {}): AttemptRecord => ({
  exerciseId,
  skills: [],
  difficulty: 'facil',
  correct: false,
  score: 0,
  hintsUsed: 0,
  wrongTries: 0,
  revealed: false,
  at,
  ...o,
});

const JORNADA: LicaoDaJornada[] = [
  {
    id: 'l0-a',
    titulo: 'A',
    trecho: 'gratuita',
    exercicios: ['l0-a-1', 'l0-a-2'],
  },
  { id: 'l1-b', titulo: 'B', trecho: 'gratuita', exercicios: ['l1-b-1'] },
  { id: 'l2-c', titulo: 'C', trecho: 'continuacao', exercicios: ['l2-c-1'] },
];

function progresso(o: Partial<ProgressState>): ProgressState {
  return { ...emptyProgress(), ...o };
}

describe('primeiro encontro com um exercício', () => {
  it('classifica pelo registro que encerra o encontro e ignora o que vem depois', () => {
    expect(primeiroEncontro([tentativa('x', 1, { correct: true, score: 1 })]).desfecho).toBe('primeira');
    expect(primeiroEncontro([tentativa('x', 1, { wrongTries: 1 }), tentativa('x', 2, { correct: true, score: 1, wrongTries: 1 })]).desfecho).toBe('sozinho');
    expect(
      primeiroEncontro([
        tentativa('x', 2, {
          correct: true,
          score: 1,
          hintsUsed: 1,
          wrongTries: 2,
          durationMs: 120_000,
        }),
      ]),
    ).toEqual({ desfecho: 'pista', erros: 2, dicas: 1, ms: 120_000 });
    expect(primeiroEncontro([tentativa('x', 1, { wrongTries: 2 }), tentativa('x', 2, { revealed: true, wrongTries: 2 })]).desfecho).toBe('resposta');
    expect(primeiroEncontro([tentativa('x', 1, { wrongTries: 1 }), tentativa('x', 2, { wrongTries: 2 })])).toEqual({ desfecho: 'parou', erros: 2, dicas: 0 });
    // a revisão de semanas depois, acertada de primeira, não apaga o tropeço inicial
    expect(primeiroEncontro([tentativa('x', 30 * DIA, { correct: true, score: 1 }), tentativa('x', 1, { revealed: true })]).desfecho).toBe('resposta');
  });

  it('o tempo de um exercício não inclui os anteriores da mesma etapa', () => {
    // a etapa abriu em T0 com dois exercícios: o 1º terminou em 3 min; o 2º, 5 min depois
    const todas = [
      tentativa('e1', T0 + 3 * 60_000, { correct: true, score: 1, durationMs: 3 * 60_000 }),
      tentativa('e2', T0 + 6 * 60_000, { wrongTries: 1, durationMs: 6 * 60_000 }),
      tentativa('e2', T0 + 8 * 60_000, { correct: true, score: 1, wrongTries: 1, durationMs: 8 * 60_000 }),
    ];
    expect(ultimaAntes(todas, 'e1')).toBeUndefined();
    expect(ultimaAntes(todas, 'e2')).toBe(T0 + 3 * 60_000);
    expect(primeiroEncontro(todas.slice(0, 1), ultimaAntes(todas, 'e1')).ms).toBe(3 * 60_000);
    expect(primeiroEncontro(todas.slice(1), ultimaAntes(todas, 'e2')).ms).toBe(5 * 60_000);
    // sem nada antes, ou com algo de antes de a etapa abrir, vale o tempo do site
    expect(primeiroEncontro(todas.slice(1)).ms).toBe(8 * 60_000);
    expect(primeiroEncontro(todas.slice(1), T0 - DIA).ms).toBe(8 * 60_000);
    const a = analisar([{ codigo: 'P01', progresso: progresso({ attempts: todas.map((t) => ({ ...t, exerciseId: t.exerciseId.replace('e', 'l0-a-') })) }) }], [], JORNADA);
    expect(a.exercicios.map((e) => e.medianaMin)).toEqual([3, 5, null, null]);
  });
});

describe('análise', () => {
  const p1 = progresso({
    lessons: {
      'l0-a': { visited: ['explicacao'], completedAt: T0 },
      'l1-b': { visited: ['explicacao'], completedAt: T0 + DIA },
      'l2-c': { visited: ['explicacao'], completedAt: T0 + 8 * DIA },
    },
    attempts: [
      tentativa('l0-a-1', T0, { correct: true, score: 1 }),
      tentativa('l0-a-2', T0, { revealed: true }),
      tentativa('l1-b-1', T0 + DIA, { correct: true, score: 1, hintsUsed: 1 }),
      tentativa('l2-c-1', T0 + 8 * DIA, { correct: true, score: 1 }),
    ],
  });
  const p2 = progresso({
    lessons: { 'l0-a': { visited: ['explicacao'], completedAt: T0 } },
    attempts: [tentativa('l0-a-1', T0, { wrongTries: 1 }), tentativa('l0-a-2', T0, { revealed: true })],
  });
  const p3 = progresso({
    lessons: { 'l0-a': { visited: ['conceito'] } },
    attempts: [
      tentativa('l0-a-1', T0 + 2 * DIA, {
        correct: true,
        score: 1,
        wrongTries: 1,
      }),
      tentativa('l0-a-2', T0 + 2 * DIA, { wrongTries: 3 }),
    ],
  });
  const participantes = [
    { codigo: 'P01', progresso: p1 },
    { codigo: 'P02', progresso: p2 },
    { codigo: 'P03', progresso: p3 },
  ];
  const registro = lerRegistro(
    'participante,data,licao,exercicio,tipo,descricao,o_que_destravou,gravidade\n' +
      'exemplo,2026-11-01,l0-a,l0-a-2,conceito,linha de exemplo do modelo,,media\n' +
      'P01,2026-11-02,l0-a,l0-a-2,conceito,"Achou que 1 KB são 1000 bits, não bytes",dica 1,alta\n' +
      'P02,2026-11-02,l0-a,l0-a-2,enunciado,Não entendeu o que a pergunta pedia,,alta\n' +
      'P03,2026-11-04,l0-a,2º,conceito,"Confundiu ""bit"" com ""byte""",conversa,media\n',
  );
  const a = analisar(participantes, registro, JORNADA);

  it('monta o funil da jornada', () => {
    expect(a.funil.map((f) => f.pessoas)).toEqual([3, 2, 1, 1, 1]);
    expect(a.licoes.find((l) => l.id === 'l0-a')).toMatchObject({
      abriram: 3,
      concluiram: 2,
    });
  });

  it('conta desfechos por exercício e o retorno depois de 7 dias', () => {
    const e = a.exercicios.find((x) => x.id === 'l0-a-2')!;
    expect(e.alcancaram).toBe(3);
    expect(e.desfechos).toEqual({
      primeira: 0,
      sozinho: 0,
      pista: 0,
      resposta: 2,
      parou: 1,
    });
    expect(a.exercicios.find((x) => x.id === 'l0-a-1')!.desfechos).toMatchObject({ primeira: 1, sozinho: 1, parou: 1 });
    expect(a.voltaramDepoisDe7Dias).toBe(1);
    expect(a.periodo).toEqual({ de: '2026-11-02', ate: '2026-11-10' });
  });

  it('lê o registro (aspas, vírgulas, linha de exemplo) e aponta candidatos pela regra', () => {
    expect(registro).toHaveLength(3);
    expect(registro[0]!.descricao).toBe('Achou que 1 KB são 1000 bits, não bytes');
    expect(registro[2]!.descricao).toBe('Confundiu "bit" com "byte"');
    // "2º" na lição l0-a é o segundo exercício dela
    expect(a.registro[0]).toMatchObject({
      chave: 'l0-a-2',
      pessoas: 3,
      tipos: { conceito: 2, enunciado: 1 },
      conceito: 2,
      altas: 2,
    });
    // só 3 pessoas tentaram: pelos números ainda não entra (mínimo de 5); pelo registro, sim,
    // porque duas pessoas pararam ali. Conceito: só 2 pessoas, abaixo das 3 da regra.
    expect(a.candidatos).toEqual([{ chave: 'l0-a-2', motivo: '2 pessoas pararam ali (gravidade alta)' }]);
    expect(a.avisos).toEqual([]);
  });

  it('a regra conta pessoas: 3 no registro com 1 de conceito não basta, e a mesma pessoa duas vezes conta uma', () => {
    const cab = 'participante,data,licao,exercicio,tipo,descricao,o_que_destravou,gravidade\n';
    const um = lerRegistro(cab + 'P01,,l1-b,1,conceito,,,media\nP02,,l1-b,1,interface,,,media\nP03,,l1-b,1,enunciado,,,media\nP01,,l0-a,1,conceito,,,alta\nP01,,l0-a,1,conceito,,,alta\n');
    expect(analisar(participantes, um, JORNADA).candidatos).toEqual([]);
    const tres = lerRegistro(cab + 'P01,,l1-b,1,conceito,,,media\nP02,,l1-b,1,conceito,,,baixa\np03,,l1-b,1º,Conceito,,,média\n');
    expect(analisar(participantes, tres, JORNADA).candidatos).toEqual([{ chave: 'l1-b-1', motivo: '3 pessoas com dificuldade de conceito' }]);
  });

  it('avisa do que no registro não bate com a jornada ou com os participantes', () => {
    const r = lerRegistro(
      'participante,data,licao,exercicio,tipo,descricao,o_que_destravou,gravidade\n' +
        'P01,,l1-loop,2,conceito,,,media\n' +
        'P02,,l0-a,7,conceito,,,media\n' +
        'P09,,l0-a,1,confusao,,,grave\n' +
        'P01,,,3,conceito,,,baixa\n' +
        'P02,,/planos,,defeito,,,media\n',
    );
    expect(analisar(participantes, r, JORNADA).avisos).toEqual([
      'registro, linha 2: a lição "l1-loop" não é da jornada do piloto (confira o id no endereço da página).',
      'registro, linha 3: a lição l0-a tem 2 exercícios; não há o 7º.',
      'registro, linha 4: tipo "confusao" fora da lista (conceito, enunciado, interface, defeito, ambiente, outro).',
      'registro, linha 4: gravidade "grave" fora da lista (baixa, media, alta).',
      'registro, linha 4: P09 não tem arquivo de progresso.',
      'registro, linha 5: exercício sem lição; sem a lição, a posição não diz qual exercício é.',
    ]);
  });

  it('fora de uma lição, a coluna da lição leva o endereço da página, e a linha fica agrupada nele', () => {
    const r = lerRegistro('participante,data,licao,exercicio,tipo,descricao,o_que_destravou,gravidade\nP01,,/planos,,defeito,Botão sem resposta,,alta\nP02,,/planos,,interface,,,baixa\n');
    const x = analisar(participantes, r, JORNADA);
    expect(x.avisos).toEqual([]);
    expect(x.registro.find((g) => g.chave === '/planos')).toMatchObject({ pessoas: 2, tipos: { defeito: 1, interface: 1 }, altas: 1 });
  });

  it('escreve o relatório com o aviso de amostra pequena', () => {
    const md = relatorio(a);
    expect(md).toContain('**Amostra pequena (3).**');
    expect(md).toContain('| l0-a-2 | l0-a | 3 | 0 | 0 | 0 | 2 | 1 |');
    expect(md).toContain('- l0-a-2: 2 pessoas pararam ali');
    expect(md).toContain('Sem anotações das conversas');
  });

  it('o modelo em docs/piloto tem as colunas que a análise lê, e a linha de exemplo não conta', () => {
    expect(lerRegistro(readFileSync(new URL('../../docs/piloto/registro-dificuldades.csv', import.meta.url), 'utf8'))).toEqual([]);
  });

  it('recusa registro sem as colunas do modelo', () => {
    expect(() => lerRegistro('quem,onde\nP01,l0-a\n')).toThrow(/colunas/);
  });
});

describe('jornada a partir do currículo', () => {
  it('é a trilha gratuita inteira e os dois primeiros módulos de Python', () => {
    const j = licoesDaJornada();
    expect(j.filter((l) => l.trecho === 'gratuita')).toHaveLength(15);
    expect(j.filter((l) => l.trecho === 'continuacao').map((l) => l.id)).toEqual(['l2-por-que-python', 'l2-listas', 'l2-dicionarios']);
    expect(j[0]!.id).toBe('l0-o-que-e-computador');
  });
});

describe('pasta de exportações', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'alicerce-piloto-teste-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));
  const DOIS_APARELHOS = [
    progresso({
      lessons: { 'l0-o-que-e-computador': { visited: ['explicacao'] } },
      attempts: [
        tentativa('l0-o-que-e-computador-ex1', T0, {
          id: 'a1',
          correct: true,
          score: 1,
        }),
      ],
    }),
    progresso({
      lessons: {
        'l0-o-que-e-computador': {
          visited: ['exemplo'],
          completedAt: T0 + DIA,
        },
      },
      attempts: [
        tentativa('l0-o-que-e-computador-ex1', T0, {
          id: 'a1',
          correct: true,
          score: 1,
        }),
        tentativa('l0-bits-bytes-ex1', T0 + DIA, { id: 'a2', revealed: true }),
      ],
    }),
  ];
  writeFileSync(join(pasta, 'P01-celular.json'), JSON.stringify(DOIS_APARELHOS[0]));
  writeFileSync(join(pasta, 'P01-computador.json'), JSON.stringify(DOIS_APARELHOS[1]));
  writeFileSync(join(pasta, 'alicerce-progresso-2026-11-03.json'), JSON.stringify(DOIS_APARELHOS[0]));
  writeFileSync(join(pasta, 'P02.json'), '{ isto não é json');
  writeFileSync(join(pasta, 'P03.json'), JSON.stringify({ nome: 'outra coisa' }));

  it('junta os arquivos do mesmo código e explica os que ignorou', () => {
    const { participantes, avisos } = lerParticipantes(pasta);
    expect(participantes.map((p) => p.codigo)).toEqual(['P01']);
    const p = participantes[0]!.progresso;
    expect(p.attempts).toHaveLength(2); // a tentativa repetida nos dois arquivos conta uma vez
    expect(p.lessons['l0-o-que-e-computador']).toEqual({
      visited: ['exemplo', 'explicacao'],
      completedAt: T0 + DIA,
    });
    expect(avisos).toHaveLength(3);
    expect(avisos.join('\n')).toMatch(/alicerce-progresso-2026-11-03\.json ignorado: renomeie/);
  });

  it('roda pela linha de comando e grava os CSV', () => {
    const saida = join(pasta, 'csv');
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('./analisar.ts', import.meta.url)), pasta, '--csv', saida], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('Participantes: 1');
    expect(r.stdout).toContain('| Concluiu o nível 0 | 0 | 0% |');
    expect(readFileSync(join(saida, 'exercicios.csv'), 'utf8').split('\n')[0]).toBe(
      'exercicio,licao,tentaram,primeira,sozinho,pista,resposta,parou,erros_mediana,minutos_aproximados_mediana',
    );
  });
});

describe('reinício do progresso entre dois arquivos', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'alicerce-piloto-reinicio-'));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));
  // semana 1 no navegador; depois a pessoa clicou em Reiniciar e recomeçou
  writeFileSync(join(pasta, 'p04-semana1.json'), JSON.stringify(progresso({ attempts: [tentativa('l0-o-que-e-computador-ex1', T0, { id: 'a1', revealed: true })] })));
  writeFileSync(
    join(pasta, 'P04-semana2.json'),
    JSON.stringify(progresso({ resetAt: T0 + DIA, attempts: [tentativa('l0-o-que-e-computador-ex1', T0 + 2 * DIA, { id: 'a2', correct: true, score: 1 })] })),
  );

  it('junta os dois (o site guardaria só o de depois) e avisa; o código vale em minúsculas também', () => {
    const { participantes, avisos } = lerParticipantes(pasta);
    expect(participantes.map((p) => p.codigo)).toEqual(['P04']);
    expect(participantes[0]!.progresso.attempts.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(primeiroEncontro(participantes[0]!.progresso.attempts).desfecho).toBe('resposta');
    expect(avisos).toEqual(['P04: os arquivos são de antes e de depois de um reinício do progresso; a análise junta os dois.']);
  });
});

describe('conversas: tarefas de transferência e intenção declarada', () => {
  const p = (concluiu: boolean) =>
    progresso({ lessons: Object.fromEntries(JORNADA.filter((l) => l.trecho === 'gratuita').map((l) => [l.id, concluiu ? { visited: ['x'], completedAt: T0 } : { visited: ['x'] }])) });
  const participantes = [
    { codigo: 'P01', progresso: p(true) },
    { codigo: 'P02', progresso: p(false) },
    { codigo: 'P03', progresso: p(true) },
  ];
  const conversas = lerConversas(
    'participante,aparelho,ja_programou,horas_semana_declaradas,transferencia_1,transferencia_1_min,transferencia_2,transferencia_2_min,pagaria_declarado,observacao\n' +
      'exemplo,celular,nunca,3,sozinha,12,,,talvez,linha de exemplo\n' +
      'P01,Celular,nunca,"2,5",sozinha,14,com perguntas,20,sim,\n' +
      'P02,computador,tentei e parei,4,não resolveu,25,não fez,,Não,"achou caro, prefere vídeo"\n' +
      'P03,celular,um pouco,6,com perguntas,18,sozinha,11,talvez,\n',
  );

  it('lê as anotações sem acento nem maiúscula fazendo diferença', () => {
    expect(conversas).toHaveLength(3);
    expect(conversas[0]).toMatchObject({ participante: 'P01', aparelho: 'celular', horasDeclaradas: 2.5, pagariaDeclarado: 'sim' });
    expect(conversas[1]!.transferencias).toEqual([
      { resultado: 'nao resolveu', min: 25 },
      { resultado: 'nao fez', min: null },
    ]);
  });

  it('o relatório separa intenção declarada de compra e conta a trilha por aparelho', () => {
    const a = analisar(participantes, [], JORNADA, conversas);
    expect(a.avisos).toEqual([]);
    expect(a.conversas!.transferencias[0]).toEqual({ tarefa: 1, resultados: { sozinha: 1, 'com perguntas': 1, 'nao resolveu': 1, 'nao fez': 0 }, medianaMin: 18 });
    expect(a.conversas!.nivel1PorAparelho).toEqual([
      { aparelho: 'celular', pessoas: 2, concluiram: 2 },
      { aparelho: 'computador', pessoas: 1, concluiram: 0 },
    ]);
    const md = relatorio(a);
    expect(md).toContain('| 1 | 1 | 1 | 1 | 0 | 18 |');
    expect(md).toContain('não é compra):** sim: 1, talvez: 1, nao: 1, nao perguntado: 0.');
    expect(md).toContain('**Compras: nenhuma.**');
    expect(md).toContain('mediana 4 (declarado, não medido)');
  });

  it('avisa de resposta fora da lista e de quem não tem arquivo', () => {
    const c = lerConversas(
      'participante,aparelho,ja_programou,horas_semana_declaradas,transferencia_1,transferencia_1_min,transferencia_2,transferencia_2_min,pagaria_declarado\n' +
        'P07,celular,nunca,3,quase,,,,depende\n',
    );
    expect(analisar(participantes, [], JORNADA, c).avisos).toEqual([
      'conversas: P07 não tem arquivo de progresso.',
      'conversas: P07 com pagaria_declarado "depende" fora da lista (sim, talvez, nao, nao perguntado).',
      'conversas: P07 com transferencia_1 "quase" fora da lista (sozinha, com perguntas, nao resolveu, nao fez).',
    ]);
  });

  it('o modelo em docs/piloto tem as colunas, e a linha de exemplo não conta', () => {
    expect(lerConversas(readFileSync(new URL('../../docs/piloto/conversas.csv', import.meta.url), 'utf8'))).toEqual([]);
  });
});

describe('indicadores mínimos e tarefas observadas', () => {
  const participantes = [
    // exercício num dia, pergunta ao tutor em outro: voltou outro dia e usou o tutor
    { codigo: 'P01', progresso: progresso({ lessons: { 'l0-a': { visited: ['x'] } }, attempts: [tentativa('l0-a-1', T0)], tutorUse: { '2026-11-05': 3 } }) },
    // exportou com a contagem e não perguntou nada
    { codigo: 'P02', progresso: progresso({ lessons: { 'l0-a': { visited: ['x'] } }, attempts: [tentativa('l0-a-1', T0)], tutorUse: {} }) },
    // abriu a lição sem conferir exercício, de uma versão sem a contagem do tutor
    { codigo: 'P03', progresso: progresso({ lessons: { 'l0-a': { visited: ['x'] } } }) },
  ];
  const conversas = lerConversas(
    'participante,aparelho,ja_programou,horas_semana_declaradas,transferencia_1,transferencia_1_min,transferencia_2,transferencia_2_min,pagaria_declarado,continuaria_declarado\n' +
      'P01,celular,nunca,3,,,,,talvez,sim\nP02,celular,nunca,3,,,,,nao,Não\n',
  );
  const tarefas = lerTarefas(
    'participante,sessao,tarefa,resultado,minutos,observacao\n' +
      'exemplo,1,2,sozinha,3,linha de exemplo\n' +
      'P01,1,2,nao conseguiu,6,\n' +
      'P01,1,2,Com uma pergunta,4,"refez depois de achar a Trilha"\n' +
      'P02,1,T2,sozinha,2,\n' +
      'P02,2,8,não conseguiu,5,"achou que tudo é pago"\n',
  );
  const a = analisar(participantes, [], JORNADA, conversas, tarefas);

  it('ativação pede um exercício conferido; retorno conta dias de exercício, revisão ou tutor', () => {
    expect(a.indicadores).toMatchObject({ ativacao: 2, voltouOutroDia: 1, tutorRegistrado: 2, usaramTutor: 1, perguntasAoTutorMediana: 3 });
  });

  it('o relatório separa quem exportou sem a contagem do tutor e mostra o interesse como declarado', () => {
    const md = relatorio(a);
    expect(md).toContain('| Ativação | abriu a primeira lição e conferiu pelo menos um exercício | 2 de 3 (67%) |');
    expect(md).toContain('| 1 de 2 com a contagem; mediana de 3 pergunta(s) entre quem usou |');
    expect(md).toContain('1 pessoa(s) exportaram de uma versão sem a contagem');
    expect(md).toContain('| Interesse em continuar (declarado) | resposta a "Você continuaria estudando aqui sozinho?" | sim: 1, talvez: 0, nao: 1, nao perguntado: 0 |');
    expect(md).toContain('| Compras | pagamentos feitos | nenhuma: nesta rodada nada é vendido |');
    const semContagem = relatorio(analisar([participantes[2]!], [], JORNADA));
    expect(semContagem).toContain('não registrado: as exportações são de uma versão do site sem a contagem');
  });

  it('tarefas: vale a última anotação de cada pessoa, "T2" e acentos não fazem diferença', () => {
    const t2 = a.tarefas.find((t) => t.n === 2)!;
    expect(t2.resultados).toEqual({ sozinha: 1, 'com uma pergunta': 1, 'nao conseguiu': 0, 'nao feita': 0 });
    expect(t2.medianaMin).toBe(3);
    expect(a.tarefas.find((t) => t.n === 8)!.resultados['nao conseguiu']).toBe(1);
    expect(relatorio(a)).toContain('| 2. Começar a estudar | 1 | 1 | 1 | 0 | 0 | 3 |');
  });

  it('avisa de tarefa ou resultado fora da lista e de quem não tem arquivo', () => {
    const t = lerTarefas('participante,sessao,tarefa,resultado,minutos,observacao\nP09,1,9,quase,,\n');
    expect(analisar(participantes, [], JORNADA, [], t).avisos).toEqual([
      'tarefas, linha 2: tarefa fora da lista (1 a 8).',
      'tarefas, linha 2: resultado "quase" fora da lista (sozinha, com uma pergunta, nao conseguiu, nao feita).',
      'tarefas, linha 2: P09 não tem arquivo de progresso.',
    ]);
  });

  it('o modelo em docs/piloto tem as colunas, e a linha de exemplo não conta', () => {
    expect(lerTarefas(readFileSync(new URL('../../docs/piloto/tarefas-observadas.csv', import.meta.url), 'utf8'))).toEqual([]);
  });
});

describe('dados do piloto dentro do repositório', () => {
  const raiz = fileURLToPath(new URL('../..', import.meta.url));
  it('avisa fora de piloto-dados/, que é a única pasta que o .gitignore cobre', () => {
    expect(dentroDoRepositorio(join(raiz, 'docs', 'piloto'))).toBe(true);
    expect(dentroDoRepositorio(raiz)).toBe(true);
    expect(dentroDoRepositorio(join(raiz, 'piloto-dados'))).toBe(false);
    expect(dentroDoRepositorio(join(raiz, 'piloto-dados', 'rodada1'))).toBe(false);
    expect(dentroDoRepositorio(join(raiz, 'piloto-dados-velho'))).toBe(true);
    expect(dentroDoRepositorio(tmpdir())).toBe(false);
    expect(readFileSync(join(raiz, '.gitignore'), 'utf8')).toMatch(/^\/?piloto-dados\/?$/m);
  });
});
