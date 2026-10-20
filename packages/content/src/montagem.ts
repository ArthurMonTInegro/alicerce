/**
 * Montagem das lições: acrescenta o aprofundamento teórico e a avaliação de
 * autonomia às lições escritas nos arquivos de nível. É código, não conteúdo:
 * o repositório público usa estas funções para os níveis 0 e 1 e o repositório
 * privado, para os níveis 2 a 14. As duas metades montadas juntas dão
 * exatamente o currículo que existia antes da separação.
 */
import { referenceById } from './references.ts';
import type { TheoryExpansion } from './theory-types.ts';
import type { AutonomyQuestion, Block, Level } from './types.ts';

const md = (text: string): Block => ({ type: 'md', text });

/** Enriquece cópias das lições sem renumerar exercícios/cartões ou alterar progresso. */
export function deepenLevels(input: Level[], entries: TheoryExpansion[]): Level[] {
  const byLesson = new Map(entries.map((entry) => [entry.lessonId, entry]));
  if (byLesson.size !== entries.length) throw new Error('Aprofundamento duplicado por lição');
  const used = new Set<string>();
  const out = input.map((level) => ({
    ...level,
    modules: level.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const entry = byLesson.get(lesson.id);
        if (!entry) return lesson;
        used.add(lesson.id);
        if (entry.level !== level.number) throw new Error('Aprofundamento no nível incorreto: ' + lesson.id);
        const sourceLinks = entry.sources
          .map((id) => {
            const ref = referenceById.get(id);
            if (!ref) throw new Error('Referência de aprofundamento ausente: ' + id);
            return '- [' + ref.title + '](' + ref.url + ') — ' + ref.org;
          })
          .join('\n');
        const additions: Partial<Record<string, Block[]>> = {
          explicacao: [
            md('### Aprofundamento teórico: ' + entry.title),
            { type: 'callout', tone: 'info', title: 'Antes de aprofundar', text: entry.prerequisite },
            md(entry.explanation),
            { type: 'callout', tone: 'warn', title: 'Um equívoco para evitar', text: entry.misconception },
            md('### Fontes para estudar além\nEstas referências apoiam os conceitos; os exemplos desta ampliação são originais.\n\n' + sourceLinks),
          ],
          exemplo: [md(entry.worked), ...(entry.table ? [{ type: 'table' as const, ...entry.table }] : [])],
          desafio: [
            { type: 'callout', tone: 'deep', title: 'Explique com suas palavras', text: entry.question + '\n\nAnote sua justificativa antes de consultar a etapa Revisão. Esta reflexão não recebe nota automática.' },
            md('### Transfira para outro problema\n' + entry.extension),
          ],
          revisao: [
            md(
              '### Confira seu raciocínio\n' +
                entry.feedback +
                '\n\nCompare com sua justificativa: identifique a regra usada, o caso limite e o que você mudaria na resposta. Refaça a explicação em outro dia, sem consultar o texto.',
            ),
          ],
        };
        const stages = new Set(lesson.sections.map((section) => section.stage));
        for (const stage of Object.keys(additions)) {
          if (!stages.has(stage as (typeof lesson.sections)[number]['stage'])) {
            throw new Error('Etapa ausente para aprofundamento: ' + lesson.id + '/' + stage);
          }
        }
        return {
          ...lesson,
          theoryTitle: entry.title,
          minutes: lesson.minutes + 12,
          objectives: [...lesson.objectives, entry.objective],
          references: [...new Set([...lesson.references, ...entry.sources, 'ies-study-guide', ...(entry.level === 2 ? ['helsinki-python-2026'] : [])])],
          sections: lesson.sections.map((section) => ({
            ...section,
            blocks: [...section.blocks, ...(additions[section.stage] ?? [])],
          })),
        };
      }),
    })),
  }));
  // Depois da separação, um aprofundamento cuja lição está na outra metade seria
  // ignorado em silêncio. Melhor falhar alto.
  const orphan = entries.filter((e) => !used.has(e.lessonId)).map((e) => e.lessonId);
  if (orphan.length) throw new Error('Aprofundamento sem lição correspondente: ' + orphan.join(', '));
  return out;
}

/** Associa a avaliação de autonomia às lições (acompanha a autorização do corpo da aula). */
export function attachAutonomy(input: Level[], byLesson: Record<string, AutonomyQuestion[]>): Level[] {
  const used = new Set<string>();
  const out = input.map((level) => ({
    ...level,
    modules: level.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const items = byLesson[lesson.id];
        if (items) used.add(lesson.id);
        return { ...lesson, ...(items ? { autonomy: items } : {}) };
      }),
    })),
  }));
  const orphan = Object.keys(byLesson).filter((id) => !used.has(id));
  if (orphan.length) throw new Error('Avaliação de autonomia sem lição correspondente: ' + orphan.join(', '));
  return out;
}
