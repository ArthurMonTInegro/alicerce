/**
 * Registro das visualizações. Cada grupo é um pedaço de JavaScript separado,
 * baixado só quando uma visualização dele aparece na tela.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import type { VizId } from '../../content.ts';

type VizComp = ComponentType<{ caption?: string | undefined }>;
const group = (load: () => Promise<Record<string, unknown>>, name: string) => lazy(async () => ({ default: (await load())[name] as VizComp }));
const computing = () => import('./computing.tsx') as Promise<Record<string, unknown>>;
const structures = () => import('./structures.tsx') as Promise<Record<string, unknown>>;
const algorithms = () => import('./algorithms.tsx') as Promise<Record<string, unknown>>;
const systems = () => import('./systems.tsx') as Promise<Record<string, unknown>>;

export const VIZ: Record<VizId, { title: string; en: string; level: string; Comp: VizComp }> = {
  binary: { title: 'Bits e bytes', en: 'Binary numbers', level: 'n0', Comp: group(computing, 'BinaryViz') },
  cpu: { title: 'Ciclo da CPU', en: 'Fetch-decode-execute', level: 'n0', Comp: group(computing, 'CpuViz') },
  terminal: { title: 'Terminal simulado', en: 'Shell', level: 'n0', Comp: group(computing, 'TerminalViz') },
  'client-server': { title: 'Do endereço à página', en: 'Client-server', level: 'n0', Comp: group(computing, 'ClientServerViz') },
  memory: { title: 'Nomes e objetos na memória', en: 'References', level: 'n2', Comp: group(computing, 'MemoryViz') },
  'logic-gates': { title: 'Portas lógicas e tabela-verdade', en: 'Logic gates', level: 'n14', Comp: group(computing, 'LogicGatesViz') },
  'stack-queue': { title: 'Pilha e fila', en: 'Stack & queue', level: 'n3', Comp: group(structures, 'StackQueueViz') },
  'hash-table': { title: 'Tabela hash', en: 'Hash table', level: 'n3', Comp: group(structures, 'HashTableViz') },
  tree: { title: 'Árvore binária de busca', en: 'Binary search tree', level: 'n3', Comp: group(structures, 'TreeViz') },
  'graph-bfs': { title: 'Busca em largura', en: 'Breadth-first search', level: 'n4', Comp: group(structures, 'GraphBfsViz') },
  sorting: { title: 'Algoritmos de ordenação', en: 'Sorting', level: 'n4', Comp: group(algorithms, 'SortingViz') },
  'binary-search': { title: 'Busca binária', en: 'Binary search', level: 'n4', Comp: group(algorithms, 'BinarySearchViz') },
  'big-o': { title: 'Crescimento de funções', en: 'Big O', level: 'n4', Comp: group(algorithms, 'BigOViz') },
  'tcp-handshake': { title: 'TCP: conexão e retransmissão', en: 'TCP', level: 'n9', Comp: group(systems, 'TcpViz') },
  scheduler: { title: 'Escalonador de processos', en: 'CPU scheduling', level: 'n8', Comp: group(systems, 'SchedulerViz') },
  hashing: { title: 'Hash e salt', en: 'Hashing', level: 'n11', Comp: group(systems, 'HashingViz') },
  neuron: { title: 'Um neurônio artificial', en: 'Neuron', level: 'n13', Comp: group(systems, 'NeuronViz') },
  'sql-join': { title: 'JOIN entre tabelas', en: 'SQL JOIN', level: 'n7', Comp: group(systems, 'SqlJoinViz') },
};

export function Viz({ id, caption }: { id: VizId; caption?: string | undefined }) {
  const v = VIZ[id];
  return (
    <figure className="viz" style={{ margin: '0 0 1.2rem' }}>
      <p className="viz-title">
        <span>
          Visualização · {v.title}{' '}
          <span lang="en" className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>
            ({v.en})
          </span>
        </span>
      </p>
      <Suspense
        fallback={
          <p className="notice small">
            <span className="spinner" aria-hidden="true" /> Carregando visualização…
          </p>
        }
      >
        <v.Comp caption={caption} />
      </Suspense>
      {caption && <figcaption className="viz-caption">{caption}</figcaption>}
    </figure>
  );
}
