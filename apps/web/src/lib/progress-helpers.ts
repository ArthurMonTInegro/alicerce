import { levels, modules, type Module } from '../content.ts';
import { nodeStatus, topologicalOrder, type NodeStatus } from '@alicerce/engine';
import type { Derived } from '../state/store.ts';

export function moduleStatus(m: Module, d: Derived): NodeStatus {
  const s = nodeStatus(m, { completed: d.completedModules, started: d.startedModules, testedOut: d.testedOut });
  if (s === 'bloqueado' && d.forced.has(m.id)) return 'em-andamento';
  return s;
}

export const STATUS_LABEL: Record<NodeStatus, string> = {
  bloqueado: 'Bloqueado',
  disponivel: 'Disponível',
  'em-andamento': 'Em andamento',
  concluido: 'Concluído',
  dispensado: 'Dispensado pelo diagnóstico',
};
export const STATUS_BADGE: Record<NodeStatus, string> = {
  bloqueado: '',
  disponivel: 'accent',
  'em-andamento': 'info',
  concluido: 'ok',
  dispensado: 'deep',
};

const ORDER = topologicalOrder(modules);

/** Próximos módulos recomendados: primeiro os em andamento, depois os disponíveis, na ordem da trilha. */
export function nextModules(d: Derived, n = 3): Module[] {
  const st = (m: Module) => moduleStatus(m, d);
  const doing = ORDER.filter((m) => st(m) === 'em-andamento' && m.lessons.length > 0);
  const avail = ORDER.filter((m) => st(m) === 'disponivel');
  // prioriza a sequência principal (níveis menores) e módulos com lições prontas
  avail.sort((a, b) => Number(b.lessons.length > 0) - Number(a.lessons.length > 0) || levelNumber(a) - levelNumber(b));
  return [...doing, ...avail].slice(0, n);
}

export function levelNumber(m: Module): number {
  return levels.find((l) => l.id === m.levelId)?.number ?? 0;
}

export function moduleProgress(m: Module, d: Derived): number {
  if (d.completedModules.has(m.id)) return 1;
  if (!m.lessons.length) return 0;
  return m.lessons.filter((l) => d.completedLessons.has(l.id)).length / m.lessons.length;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} dias`;
}
