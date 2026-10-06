import { countryCurricula, universityPrograms, learningEvidence, usUniversityRefs } from './research.ts';
/**
 * Testes de integridade do conteúdo. O currículo é dado tipado, então dá para
 * verificar automaticamente o que num CMS só se descobre quando o aluno tropeça:
 * pré-requisitos quebrados, ciclos, ids duplicados, referências inexistentes,
 * exercícios sem dica ou sem resposta.
 */
import { describe, expect, it } from 'vitest';
import { findCycle, findMissingPrerequisites, AREAS, ITEMS_PER_AREA } from '@alicerce/engine';
import {
  STAGES,
  diagnosticItems,
  exercises,
  glossary,
  interviewQuestions,
  lessons,
  levels,
  moduleById,
  modules,
  placementRules,
  projectById,
  projects,
  referenceById,
  references,
  skillById,
  skills,
  type Block,
} from './index.ts';

const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
const allBlocks = (): Array<{ lessonId: string; block: Block }> =>
  lessons.flatMap((l) => l.sections.flatMap((s) => s.blocks.map((block) => ({ lessonId: l.id, block }))));

describe('estrutura do currículo', () => {
  it('tem os 15 níveis (0 a 14) em ordem', () => {
    expect(levels.map((l) => l.number)).toEqual([...Array(15).keys()]);
  });

  it('não tem ids duplicados', () => {
    expect(dupes(levels.map((l) => l.id))).toEqual([]);
    expect(dupes(modules.map((m) => m.id))).toEqual([]);
    expect(dupes(lessons.map((l) => l.id))).toEqual([]);
    expect(dupes(exercises.map((e) => e.exercise.id))).toEqual([]);
    expect(dupes(skills.map((s) => s.id))).toEqual([]);
    expect(dupes(lessons.flatMap((l) => l.cards.map((c) => c.id)))).toEqual([]);
    expect(dupes(projects.map((p) => p.id))).toEqual([]);
    expect(dupes(references.map((r) => r.id))).toEqual([]);
  });

  it('todo pré-requisito existe e o grafo não tem ciclos', () => {
    expect(findMissingPrerequisites(modules)).toEqual([]);
    expect(findCycle(modules)).toBeNull();
  });

  it('cada módulo pertence ao nível que o contém e cada lição ao seu módulo', () => {
    for (const level of levels) for (const m of level.modules) expect(m.levelId).toBe(level.id);
    for (const m of modules) for (const l of m.lessons) expect(l.moduleId).toBe(m.id);
  });

  it('todo módulo tem descrição, habilidades e roteiro', () => {
    for (const m of modules) {
      expect(m.description.length, m.id).toBeGreaterThan(20);
      expect(m.skills.length, m.id).toBeGreaterThan(0);
      expect(m.outline.length, m.id).toBeGreaterThan(0);
    }
  });

  it('todo nível tem pelo menos um módulo com lições completas', () => {
    for (const level of levels) expect(level.modules.some((m) => m.lessons.length > 0), level.id).toBe(true);
  });
});

describe('metodologia das lições', () => {
  it('as etapas aparecem na ordem CONCEITO → ... → REVISÃO, sem repetir', () => {
    for (const l of lessons) {
      const order = l.sections.map((s) => STAGES.indexOf(s.stage));
      expect(order, l.id).toEqual([...order].sort((a, b) => a - b));
      expect(dupes(l.sections.map((s) => s.stage)), l.id).toEqual([]);
    }
  });

  it('toda lição tem conceito, exercícios e revisão', () => {
    for (const l of lessons) {
      const stages = l.sections.map((s) => s.stage);
      for (const required of ['conceito', 'exercicio', 'revisao'] as const) expect(stages, `${l.id} sem ${required}`).toContain(required);
    }
  });

  it('toda lição tem objetivos, termos em inglês e flashcards', () => {
    for (const l of lessons) {
      expect(l.objectives.length, l.id).toBeGreaterThan(0);
      expect(l.terms.length, l.id).toBeGreaterThan(0);
      expect(l.cards.length, l.id).toBeGreaterThan(0);
      for (const t of l.terms) expect(t.pt && t.en && t.def, `${l.id}: ${t.pt}`).toBeTruthy();
    }
  });
});

describe('exercícios', () => {
  it('todo exercício tem dica, explicação e habilidade existente', () => {
    for (const { exercise: e } of exercises) {
      expect(e.hints.length, e.id).toBeGreaterThan(0);
      expect(e.explanation.length, e.id).toBeGreaterThan(10);
      expect(e.skills.length, e.id).toBeGreaterThan(0);
      for (const s of e.skills) expect(skillById.has(s), `${e.id}: habilidade ${s}`).toBe(true);
    }
  });

  it('múltipla escolha tem exatamente uma correta e feedback em todas as opções', () => {
    for (const { exercise: e } of exercises) {
      if (e.kind !== 'mcq') continue;
      expect(e.options.filter((o) => o.correct).length, e.id).toBe(1);
      for (const o of e.options) expect(o.feedback.length, `${e.id}: ${o.text}`).toBeGreaterThan(0);
    }
  });

  it('lacunas: número de ___ igual ao número de respostas', () => {
    for (const { exercise: e } of exercises) {
      if (e.kind !== 'fill') continue;
      expect(e.template.split('___').length - 1, e.id).toBe(e.blanks.length);
      for (const b of e.blanks) expect(b.length, e.id).toBeGreaterThan(0);
    }
  });

  it('parsons tem pelo menos 3 linhas', () => {
    for (const { exercise: e } of exercises) if (e.kind === 'parsons') expect(e.lines.length, e.id).toBeGreaterThanOrEqual(3);
  });

  it('código e correção têm testes', () => {
    for (const { exercise: e } of exercises) if (e.kind === 'code' || e.kind === 'fix') expect(e.tests.length, e.id).toBeGreaterThan(0);
  });

  it('cada módulo com lições tem prática de todas as dificuldades básicas', () => {
    for (const m of modules) {
      if (!m.lessons.length) continue;
      const diffs = new Set(exercises.filter((x) => x.moduleId === m.id).map((x) => x.exercise.difficulty));
      expect(diffs.has('facil'), m.id).toBe(true);
    }
  });
});

describe('referências e ligações', () => {
  it('toda referência citada existe', () => {
    for (const m of modules) for (const r of m.references) expect(referenceById.has(r), `${m.id}: ${r}`).toBe(true);
    for (const l of lessons) for (const r of l.references) expect(referenceById.has(r), `${l.id}: ${r}`).toBe(true);
  });

  it('referências têm URL https e nota de uso', () => {
    for (const r of references) {
      expect(r.url, r.id).toMatch(/^https:\/\//);
      expect(r.note.length, r.id).toBeGreaterThan(20);
    }
  });

  it('toda referência é usada por pelo menos um módulo ou lição', () => {
    const used = new Set([...modules.flatMap((m) => m.references), ...lessons.flatMap((l) => l.references)]);
    expect(references.filter((r) => !used.has(r.id)).map((r) => r.id)).toEqual([]);
  });

  it('blocos de projeto apontam para projetos existentes', () => {
    for (const { lessonId, block } of allBlocks()) if (block.type === 'project') expect(projectById.has(block.projectId), `${lessonId}: ${block.projectId}`).toBe(true);
  });

  it('projetos exigem módulos e habilidades existentes', () => {
    for (const p of projects) {
      for (const m of p.requires) expect(moduleById.has(m), `${p.id}: ${m}`).toBe(true);
      for (const s of p.skills) expect(skillById.has(s), `${p.id}: ${s}`).toBe(true);
    }
  });

  it('projetos em ordem crescente', () => {
    expect(projects.map((p) => p.order)).toEqual(projects.map((_, i) => i + 1));
  });
});

describe('diagnóstico', () => {
  it('cada área tem itens suficientes de cada nível', () => {
    for (const area of AREAS) {
      const items = diagnosticItems.filter((i) => i.area === area);
      expect(items.length, area).toBeGreaterThanOrEqual(ITEMS_PER_AREA);
      for (const lvl of [1, 2, 3]) expect(items.some((i) => i.level === lvl), `${area} nível ${lvl}`).toBe(true);
    }
  });

  it('a resposta correta é uma opção válida e nunca "Não sei"', () => {
    for (const i of diagnosticItems) {
      expect(i.answer, i.id).toBeGreaterThanOrEqual(0);
      expect(i.answer, i.id).toBeLessThan(i.options.length - 1);
    }
  });

  it('regras de dispensa apontam para módulos existentes', () => {
    for (const r of placementRules) expect(moduleById.has(r.moduleId), r.moduleId).toBe(true);
  });
});

describe('entrevistas e glossário', () => {
  it('perguntas têm versão em inglês e pontos-chave', () => {
    for (const q of interviewQuestions) {
      expect(q.questionEn.length, q.id).toBeGreaterThan(10);
      expect(q.keyPoints.length, q.id).toBeGreaterThan(0);
    }
    expect(dupes(interviewQuestions.map((q) => q.id))).toEqual([]);
  });

  it('glossário não tem termo em inglês duplicado', () => {
    expect(dupes(glossary.map((g) => g.en.toLowerCase()))).toEqual([]);
    expect(glossary.length).toBeGreaterThan(200);
  });
});

describe('pesquisa', () => {
  it('fontes têm https e ids únicos', () => {
    const all = [...countryCurricula, ...universityPrograms, ...learningEvidence];
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    for (const x of all) expect(x.url.startsWith('https://')).toBe(true);
  });
  it('referências de universidades dos EUA existem', () => {
    for (const id of usUniversityRefs) expect(referenceById.has(id), id).toBe(true);
  });
});
