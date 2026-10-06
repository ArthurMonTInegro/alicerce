/**
 * Grafo de pré-requisitos (a "árvore de conhecimento").
 * Funções puras: validação (ciclos, referências quebradas), ordenação
 * topológica e regras de desbloqueio.
 */

export interface GraphNode {
  id: string;
  prerequisites: readonly string[];
}

export type NodeStatus = 'bloqueado' | 'disponivel' | 'em-andamento' | 'concluido' | 'dispensado';

export function findMissingPrerequisites(nodes: readonly GraphNode[]): Array<{ node: string; missing: string }> {
  const ids = new Set(nodes.map((n) => n.id));
  const out: Array<{ node: string; missing: string }> = [];
  for (const n of nodes) for (const p of n.prerequisites) if (!ids.has(p)) out.push({ node: n.id, missing: p });
  return out;
}

/** Retorna um ciclo (lista de ids) se existir, ou null. */
export function findCycle(nodes: readonly GraphNode[]): string[] | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const state = new Map<string, 0 | 1 | 2>(); // 0 novo, 1 visitando, 2 feito
  const stack: string[] = [];

  const visit = (id: string): string[] | null => {
    const s = state.get(id) ?? 0;
    if (s === 2) return null;
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const p of byId.get(id)?.prerequisites ?? []) {
      const c = visit(p);
      if (c) return c;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };

  for (const n of nodes) {
    const c = visit(n.id);
    if (c) return c;
  }
  return null;
}

/** Ordenação topológica estável (mantém a ordem original quando possível). */
export function topologicalOrder<T extends GraphNode>(nodes: readonly T[]): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const done = new Set<string>();
  const out: T[] = [];
  const visit = (n: T) => {
    if (done.has(n.id)) return;
    done.add(n.id);
    for (const p of n.prerequisites) {
      const pn = byId.get(p);
      if (pn) visit(pn);
    }
    out.push(n);
  };
  nodes.forEach(visit);
  return out;
}

/** Todos os ancestrais (pré-requisitos diretos e indiretos). */
export function ancestors(nodes: readonly GraphNode[], id: string): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Set<string>();
  const walk = (x: string) => {
    for (const p of byId.get(x)?.prerequisites ?? []) {
      if (!out.has(p)) {
        out.add(p);
        walk(p);
      }
    }
  };
  walk(id);
  return out;
}

export interface NodeProgress {
  completed: ReadonlySet<string>;
  started: ReadonlySet<string>;
  testedOut: ReadonlySet<string>;
}

export function nodeStatus(node: GraphNode, p: NodeProgress): NodeStatus {
  if (p.completed.has(node.id)) return 'concluido';
  if (p.testedOut.has(node.id)) return 'dispensado';
  const ready = node.prerequisites.every((x) => p.completed.has(x) || p.testedOut.has(x));
  if (!ready) return 'bloqueado';
  return p.started.has(node.id) ? 'em-andamento' : 'disponivel';
}
