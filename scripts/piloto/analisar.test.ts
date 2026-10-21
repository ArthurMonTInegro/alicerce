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
import { analisar, licoesDaJornada, lerParticipantes, lerRegistro, primeiroEncontro, relatorio, type LicaoDaJornada } from './analisar.ts';

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
      altas: 2,
    });
    // só 3 pessoas tentaram: pelos números ainda não entra (mínimo de 5); pelo registro, sim
    expect(a.candidatos).toEqual([
      {
        chave: 'l0-a-2',
        motivo: '3 pessoas no registro (2 de conceito); 2 registros de gravidade alta (a pessoa parou ali)',
      },
    ]);
  });

  it('escreve o relatório com o aviso de amostra pequena', () => {
    const md = relatorio(a);
    expect(md).toContain('**Amostra pequena (3).**');
    expect(md).toContain('| l0-a-2 | l0-a | 3 | 0 | 0 | 0 | 2 | 1 |');
    expect(md).toContain('- l0-a-2: 3 pessoas no registro');
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
      'exercicio,licao,tentaram,primeira,sozinho,pista,resposta,parou,erros_mediana,minutos_mediana',
    );
  });
});
