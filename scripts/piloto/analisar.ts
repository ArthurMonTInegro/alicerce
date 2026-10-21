/**
 * Análise do piloto: lê o progresso exportado pelos participantes e o registro de
 * dificuldades observadas, e escreve um relatório em Markdown.
 *
 *   node scripts/piloto/analisar.ts <pasta com os JSON> [--registro <arquivo.csv>] [--csv <pasta>]
 *
 * Cada arquivo é o "Exportar JSON" da página Progresso, renomeado com o código do
 * participante: P01.json, ou P01-semana2.json (o código vai até o primeiro "-").
 * Arquivos do mesmo código são mesclados com a mesma função que junta dois
 * aparelhos (mergeProgress). Guarde a pasta fora do repositório: ver docs/PILOTO.md.
 *
 * O que a exportação tem: tentativas de exercício (acertou, dicas, erros, viu a
 * resposta, tempo desde que abriu o exercício), lições visitadas e concluídas,
 * revisões de cartões. Não tem nome, e-mail nem o código escrito.
 *
 * --csv grava exercicios.csv e licoes.csv nessa pasta, para abrir numa planilha.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activityByDay, emptyProgress, mergeProgress, sanitizeProgress, type AttemptRecord, type ProgressState } from '@alicerce/engine';
import { levels, type LevelMeta } from '@alicerce/content';

/** A jornada do piloto: a trilha gratuita inteira e o começo do Python (ver docs/PILOTO.md). */
export const JORNADA = {
  gratuita: ['n0', 'n1'],
  continuacao: ['m2-1', 'm2-2'],
} as const;
/** Abaixo disso, a porcentagem de um exercício diz pouco e ele fica fora do ranking. */
export const MIN_ALCANCE = 3;
/** Fortaleza, UTC-3 sem horário de verão (mesma convenção de Date.getTimezoneOffset). */
const FUSO_MIN = 180;
const DIA = 86_400_000;

export type Desfecho = 'primeira' | 'sozinho' | 'pista' | 'resposta' | 'parou';
export const DESFECHOS: Record<Desfecho, string> = {
  primeira: 'de primeira',
  sozinho: 'sem dica, depois de errar',
  pista: 'com dica',
  resposta: 'viu a resposta',
  parou: 'errou e parou',
};

export interface Participante {
  codigo: string;
  progresso: ProgressState;
}

export interface LicaoDaJornada {
  id: string;
  titulo: string;
  trecho: 'gratuita' | 'continuacao';
  exercicios: string[];
}

/** As lições da jornada, na ordem da trilha, a partir do mapa do currículo. */
export function licoesDaJornada(mapa: LevelMeta[] = levels): LicaoDaJornada[] {
  const out: LicaoDaJornada[] = [];
  for (const l of mapa)
    for (const m of l.modules) {
      const trecho = (JORNADA.gratuita as readonly string[]).includes(l.id)
        ? 'gratuita'
        : (JORNADA.continuacao as readonly string[]).includes(m.id)
          ? 'continuacao'
          : null;
      if (trecho)
        for (const x of m.lessons)
          out.push({
            id: x.id,
            titulo: x.title,
            trecho,
            exercicios: x.exercises.map((e) => e.id),
          });
    }
  return out;
}

/**
 * O primeiro encontro de alguém com um exercício: da primeira tentativa até acertar
 * ou ver a resposta. Revisões e refações depois disso não entram.
 */
export function primeiroEncontro(tentativas: AttemptRecord[]): {
  desfecho: Desfecho;
  erros: number;
  dicas: number;
  ms?: number;
} {
  const ordem = [...tentativas].sort((a, b) => a.at - b.at);
  const fim = ordem.find((a) => a.correct || a.revealed);
  if (!fim)
    return {
      desfecho: 'parou',
      erros: Math.max(0, ...ordem.map((a) => a.wrongTries)),
      dicas: Math.max(0, ...ordem.map((a) => a.hintsUsed)),
    };
  const desfecho: Desfecho = fim.revealed ? 'resposta' : fim.hintsUsed > 0 ? 'pista' : fim.wrongTries > 0 ? 'sozinho' : 'primeira';
  return {
    desfecho,
    erros: fim.wrongTries,
    dicas: fim.hintsUsed,
    ...(fim.durationMs !== undefined ? { ms: fim.durationMs } : {}),
  };
}

export interface LinhaRegistro {
  participante: string;
  data: string;
  licao: string;
  exercicio: string;
  tipo: string;
  descricao: string;
  destravou: string;
  gravidade: string;
}

/** CSV simples (vírgula, aspas duplas para campos com vírgula ou quebra de linha), como sai de uma planilha. */
export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') ((campo += '"'), i++);
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') (linha.push(campo), (campo = ''));
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      (linha.push(campo), (campo = ''));
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

const COLUNAS = ['participante', 'data', 'licao', 'exercicio', 'tipo', 'descricao', 'o_que_destravou', 'gravidade'];

export function lerRegistro(texto: string): LinhaRegistro[] {
  const [cab, ...resto] = lerCsv(texto.replace(/^﻿/, ''));
  const idx = COLUNAS.map((c) => cab?.map((x) => x.trim().toLowerCase()).indexOf(c) ?? -1);
  const faltam = COLUNAS.filter((_, i) => idx[i]! < 0);
  if (faltam.length) throw new Error(`registro sem as colunas: ${faltam.join(', ')}`);
  const val = (l: string[], i: number) => (l[idx[i]!] ?? '').trim();
  return resto
    .map((l) => ({
      participante: val(l, 0),
      data: val(l, 1),
      licao: val(l, 2),
      exercicio: val(l, 3),
      tipo: val(l, 4).toLowerCase(),
      descricao: val(l, 5),
      destravou: val(l, 6),
      gravidade: val(l, 7).toLowerCase(),
    }))
    .filter((l) => l.participante && l.participante.toLowerCase() !== 'exemplo');
}

export interface Analise {
  n: number;
  periodo: { de: string; ate: string } | null;
  funil: Array<{ etapa: string; pessoas: number }>;
  diasAtivos: number[];
  voltaramDepoisDe7Dias: number;
  revisoes: number[];
  licoes: Array<{
    id: string;
    titulo: string;
    trecho: string;
    abriram: number;
    concluiram: number;
  }>;
  exercicios: Array<{
    id: string;
    licao: string;
    alcancaram: number;
    desfechos: Record<Desfecho, number>;
    medianaErros: number;
    medianaMin: number | null;
  }>;
  registro: Array<{
    chave: string;
    licao: string;
    exercicio: string;
    pessoas: number;
    tipos: Record<string, number>;
    altas: number;
    exemplos: string[];
  }>;
  candidatos: Array<{ chave: string; motivo: string }>;
}

const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const dia = (t: number) => new Date(t - FUSO_MIN * 60_000).toISOString().slice(0, 10);

export function analisar(participantes: Participante[], registro: LinhaRegistro[] = [], jornada = licoesDaJornada()): Analise {
  const n = participantes.length;
  const instantes = participantes.flatMap((p) => [...p.progresso.attempts.map((a) => a.at), ...p.progresso.reviews.map((r) => r.at)]);
  const gratuitas = jornada.filter((l) => l.trecho === 'gratuita');
  const continuacao = jornada.filter((l) => l.trecho === 'continuacao');
  const abriu = (p: Participante, id: string) => (p.progresso.lessons[id]?.visited.length ?? 0) > 0;
  const concluiu = (p: Participante, id: string) => p.progresso.lessons[id]?.completedAt !== undefined;
  const nivel0 = gratuitas.filter((l) => l.id.startsWith('l0-'));
  const conta = (f: (p: Participante) => boolean) => participantes.filter(f).length;

  const funil = [
    {
      etapa: 'Abriu a primeira lição',
      pessoas: conta((p) => !!gratuitas[0] && abriu(p, gratuitas[0].id)),
    },
    {
      etapa: 'Concluiu o nível 0',
      pessoas: conta((p) => nivel0.length > 0 && nivel0.every((l) => concluiu(p, l.id))),
    },
    {
      etapa: 'Concluiu o nível 1 (fim da trilha gratuita)',
      pessoas: conta((p) => gratuitas.length > 0 && gratuitas.every((l) => concluiu(p, l.id))),
    },
    {
      etapa: 'Abriu a continuação (Python)',
      pessoas: conta((p) => !!continuacao[0] && abriu(p, continuacao[0].id)),
    },
    {
      etapa: 'Concluiu a continuação',
      pessoas: conta((p) => continuacao.length > 0 && continuacao.every((l) => concluiu(p, l.id))),
    },
  ];

  const diasAtivos = participantes.map((p) => activityByDay(p.progresso, FUSO_MIN).size);
  const voltaramDepoisDe7Dias = conta((p) => {
    const ts = [...p.progresso.attempts.map((a) => a.at), ...p.progresso.reviews.map((r) => r.at)];
    return ts.length > 0 && Math.max(...ts) - Math.min(...ts) >= 7 * DIA;
  });

  const licoes = jornada.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    trecho: l.trecho,
    abriram: conta((p) => abriu(p, l.id)),
    concluiram: conta((p) => concluiu(p, l.id)),
  }));

  const exercicios = jornada.flatMap((l) =>
    l.exercicios.map((id) => {
      const encontros = participantes
        .map((p) => p.progresso.attempts.filter((a) => a.exerciseId === id))
        .filter((t) => t.length)
        .map(primeiroEncontro);
      const desfechos = {
        primeira: 0,
        sozinho: 0,
        pista: 0,
        resposta: 0,
        parou: 0,
      } as Record<Desfecho, number>;
      for (const e of encontros) desfechos[e.desfecho]++;
      const min = mediana(encontros.flatMap((e) => (e.ms !== undefined ? [e.ms / 60_000] : [])));
      return {
        id,
        licao: l.id,
        alcancaram: encontros.length,
        desfechos,
        medianaErros: mediana(encontros.map((e) => e.erros)) ?? 0,
        medianaMin: min === null ? null : Math.round(min * 10) / 10,
      };
    }),
  );

  // Na tela, o exercício não mostra o id: quem anota pode escrever a posição dele na lição ("3" ou "3º").
  const porLicao = new Map(jornada.map((l) => [l.id, l.exercicios]));
  const normalizado = registro.map((r) => {
    const n = /^(\d+)\s*[ºo°]?$/.exec(r.exercicio)?.[1];
    const id = n ? porLicao.get(r.licao)?.[Number(n) - 1] : undefined;
    return id ? { ...r, exercicio: id } : r;
  });
  const grupos = new Map<string, LinhaRegistro[]>();
  for (const r of normalizado) {
    const chave = r.exercicio || r.licao || '(sem lição)';
    grupos.set(chave, [...(grupos.get(chave) ?? []), r]);
  }
  const reg = [...grupos.entries()]
    .map(([chave, rs]) => {
      const tipos: Record<string, number> = {};
      for (const r of rs) tipos[r.tipo || 'sem tipo'] = (tipos[r.tipo || 'sem tipo'] ?? 0) + 1;
      return {
        chave,
        licao: rs.find((r) => r.licao)?.licao ?? '',
        exercicio: rs.find((r) => r.exercicio)?.exercicio ?? '',
        pessoas: new Set(rs.map((r) => r.participante)).size,
        tipos,
        altas: rs.filter((r) => r.gravidade === 'alta').length,
        exemplos: rs
          .map((r) => r.descricao)
          .filter(Boolean)
          .slice(0, 3),
      };
    })
    .sort((a, b) => b.pessoas - a.pessoas || b.altas - a.altas || a.chave.localeCompare(b.chave));

  // Candidatos a aprofundar: a regra de docs/PILOTO.md. É uma lista para olhar, não uma decisão.
  const motivos = new Map<string, string[]>();
  const candidato = (chave: string, motivo: string) => motivos.set(chave, [...(motivos.get(chave) ?? []), motivo]);
  for (const e of exercicios) {
    const travou = e.desfechos.resposta + e.desfechos.parou;
    if (e.alcancaram >= 5 && travou / e.alcancaram >= 0.3) candidato(e.id, `${travou} de ${e.alcancaram} viram a resposta ou pararam`);
  }
  for (const r of reg) {
    const conceito = r.tipos['conceito'] ?? 0;
    if (r.pessoas >= 3 && conceito > 0) candidato(r.chave, `${r.pessoas} pessoas no registro (${conceito} de conceito)`);
    if (r.altas >= 2) candidato(r.chave, `${r.altas} registros de gravidade alta (a pessoa parou ali)`);
  }
  const candidatos = [...motivos].map(([chave, ms]) => ({
    chave,
    motivo: ms.join('; '),
  }));

  return {
    n,
    periodo: instantes.length ? { de: dia(Math.min(...instantes)), ate: dia(Math.max(...instantes)) } : null,
    funil,
    diasAtivos,
    voltaramDepoisDe7Dias,
    revisoes: participantes.map((p) => p.progresso.reviews.length),
    licoes,
    exercicios,
    registro: reg,
    candidatos,
  };
}

const pct = (x: number, de: number) => (de ? `${Math.round((100 * x) / de)}%` : '–');
const celula = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ');

export function relatorio(a: Analise, avisos: string[] = []): string {
  const l: string[] = [];
  l.push('# Piloto: relatório do progresso exportado', '');
  l.push(`Participantes: ${a.n}${a.periodo ? ` · atividade de ${a.periodo.de} a ${a.periodo.ate} (horário de Fortaleza)` : ''}.`);
  if (a.n < 10) l.push('', `**Amostra pequena (${a.n}).** Os números mostram onde olhar primeiro; não medem a Alicerce nem valem para outros públicos.`);
  for (const w of avisos) l.push('', `Aviso: ${w}`);

  l.push('', '## Jornada', '', '| Etapa | Pessoas | Do total |', '|---|---|---|');
  for (const f of a.funil) l.push(`| ${f.etapa} | ${f.pessoas} | ${pct(f.pessoas, a.n)} |`);
  const faixa = a.diasAtivos.length ? ` (de ${Math.min(...a.diasAtivos)} a ${Math.max(...a.diasAtivos)})` : '';
  l.push(
    '',
    `Dias com estudo por pessoa: mediana ${mediana(a.diasAtivos) ?? '–'}${faixa}. Voltaram a estudar 7 dias ou mais depois do primeiro dia: ${a.voltaramDepoisDe7Dias} de ${a.n}. Revisões de cartões: mediana ${mediana(a.revisoes) ?? '–'} por pessoa.`,
  );

  l.push('', '## Onde as pessoas pararam', '', '| Lição | Trecho | Abriram | Concluíram |', '|---|---|---|---|');
  for (const x of a.licoes)
    l.push(`| ${celula(x.titulo)} (${x.id}) | ${x.trecho === 'gratuita' ? 'gratuito' : 'continuação'} | ${x.abriram} | ${x.concluiram} |`);

  const ranking = a.exercicios
    .filter((e) => e.alcancaram >= MIN_ALCANCE)
    .sort(
      (x, y) =>
        (y.desfechos.resposta + y.desfechos.parou) / y.alcancaram - (x.desfechos.resposta + x.desfechos.parou) / x.alcancaram ||
        y.desfechos.pista / y.alcancaram - x.desfechos.pista / x.alcancaram ||
        x.id.localeCompare(y.id),
    );
  l.push('', '## Exercícios que mais travaram', '');
  l.push(
    `Primeiro encontro de cada pessoa com o exercício (revisões depois não contam). Só exercícios que ${MIN_ALCANCE} ou mais pessoas tentaram. O tempo vai de abrir o exercício a terminá-lo e inclui pausas. Quem desistiu sem conferir nenhuma resposta não deixa registro aqui; isso aparece na tabela das lições.`,
    '',
  );
  if (!ranking.length) l.push('Nenhum exercício foi tentado por pessoas suficientes.');
  else {
    l.push(
      `| Exercício | Lição | Tentaram | ${Object.values(DESFECHOS).join(' | ')} | Erros (mediana) | Minutos (mediana) |`,
      `|---|---|---|${'---|'.repeat(5)}---|---|`,
    );
    for (const e of ranking)
      l.push(
        `| ${e.id} | ${e.licao} | ${e.alcancaram} | ${(Object.keys(DESFECHOS) as Desfecho[]).map((k) => e.desfechos[k]).join(' | ')} | ${e.medianaErros} | ${e.medianaMin ?? '–'} |`,
      );
  }
  const poucos = a.exercicios.filter((e) => e.alcancaram > 0 && e.alcancaram < MIN_ALCANCE).length;
  const ninguem = a.exercicios.filter((e) => e.alcancaram === 0).length;
  if (poucos || ninguem) l.push('', `Fora da tabela: ${poucos} exercício(s) tentados por menos de ${MIN_ALCANCE} pessoas e ${ninguem} que ninguém tentou.`);

  l.push('', '## Registro de dificuldades observadas', '');
  if (!a.registro.length) l.push('Sem registro (use --registro com o CSV de docs/piloto/registro-dificuldades.csv).');
  else {
    l.push('| Onde | Pessoas | Tipos | Altas | Exemplos |', '|---|---|---|---|---|');
    for (const r of a.registro)
      l.push(
        `| ${r.chave} | ${r.pessoas} | ${Object.entries(r.tipos)
          .map(([t, k]) => `${t}: ${k}`)
          .join(', ')} | ${r.altas} | ${celula(r.exemplos.join(' / '))} |`,
      );
  }

  l.push('', '## Candidatos a aprofundar', '');
  l.push(
    'Pela regra de docs/PILOTO.md. É uma lista para ler junto com as observações, não uma decisão: uma falha de interface ou de enunciado se corrige no texto ou na tela, não com mais teoria.',
    '',
  );
  if (!a.candidatos.length) l.push('Nenhum por enquanto.');
  else for (const c of a.candidatos) l.push(`- ${c.chave}: ${c.motivo}`);

  l.push('', '## Limites', '');
  l.push('- Quem se oferece para um piloto costuma ser mais motivado que a média; abandono aqui tende a ser menor que fora dele.');
  l.push('- O progresso fica no navegador: quem usou outro aparelho sem exportar aparece com menos do que fez.');
  l.push('- Concluir lições e acertar exercícios não prova aprendizagem. A tarefa de transferência e as conversas do roteiro dizem mais sobre isso.');
  l.push(
    '- A disposição a pagar não aparece aqui: o que as pessoas disseram sobre o preço fica nas anotações da conversa final, separado de qualquer pagamento.',
  );
  return l.join('\n') + '\n';
}

function csv(linhas: Array<Array<string | number | null>>) {
  return (
    linhas.map((l) => l.map((v) => (v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\n') + '\n'
  );
}

/** Lê a pasta: um participante por código, mesclando os arquivos do mesmo código. */
export function lerParticipantes(pasta: string): {
  participantes: Participante[];
  avisos: string[];
} {
  const avisos: string[] = [];
  const porCodigo = new Map<string, ProgressState>();
  for (const nome of readdirSync(pasta)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort()) {
    if (nome.startsWith('alicerce-progresso')) {
      avisos.push(`${nome} ignorado: renomeie com o código do participante (por exemplo, P01.json).`);
      continue;
    }
    const codigo = basename(nome, '.json').split('-')[0]!;
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(pasta, nome), 'utf8'));
    } catch {
      avisos.push(`${nome} ignorado: não é um JSON válido.`);
      continue;
    }
    const r = raw as { version?: unknown; attempts?: unknown };
    if (!r || r.version !== 1 || !Array.isArray(r.attempts)) {
      avisos.push(`${nome} ignorado: não parece um progresso exportado da Alicerce.`);
      continue;
    }
    porCodigo.set(codigo, mergeProgress(porCodigo.get(codigo) ?? emptyProgress(), sanitizeProgress(raw)));
  }
  return {
    participantes: [...porCodigo].map(([codigo, progresso]) => ({
      codigo,
      progresso,
    })),
    avisos,
  };
}

function main(argv: string[]) {
  const pasta = argv.find((a, i) => !a.startsWith('--') && !['--registro', '--csv'].includes(argv[i - 1] ?? ''));
  const opcao = (nome: string) => (argv.includes(nome) ? argv[argv.indexOf(nome) + 1] : undefined);
  if (!pasta || !existsSync(pasta)) {
    console.error('uso: node scripts/piloto/analisar.ts <pasta com os JSON> [--registro <arquivo.csv>] [--csv <pasta>]');
    process.exit(2);
  }
  const { participantes, avisos } = lerParticipantes(pasta);
  const regArq = opcao('--registro');
  const registro = regArq ? lerRegistro(readFileSync(regArq, 'utf8')) : [];
  const a = analisar(participantes, registro);
  process.stdout.write(relatorio(a, avisos));
  const saida = opcao('--csv');
  if (saida) {
    mkdirSync(saida, { recursive: true });
    writeFileSync(
      join(saida, 'exercicios.csv'),
      csv([
        ['exercicio', 'licao', 'tentaram', ...Object.keys(DESFECHOS), 'erros_mediana', 'minutos_mediana'],
        ...a.exercicios.map((e) => [
          e.id,
          e.licao,
          e.alcancaram,
          ...(Object.keys(DESFECHOS) as Desfecho[]).map((k) => e.desfechos[k]),
          e.medianaErros,
          e.medianaMin,
        ]),
      ]),
    );
    writeFileSync(
      join(saida, 'licoes.csv'),
      csv([['licao', 'titulo', 'trecho', 'abriram', 'concluiram'], ...a.licoes.map((x) => [x.id, x.titulo, x.trecho, x.abriram, x.concluiram])]),
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
