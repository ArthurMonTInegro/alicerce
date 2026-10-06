/**
 * Título e descrição por página. No navegador, atualiza document.title e a meta
 * description; na pré-renderização, o servidor coleta os valores para escrever
 * no <head> do HTML estático (bom para SEO e para compartilhar links).
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';

export interface HeadData {
  title: string;
  description: string;
  canonical?: string;
}

const HeadCtx = createContext<HeadData | null>(null);
export function HeadProvider({ sink, children }: { sink: HeadData; children: ReactNode }) {
  return <HeadCtx.Provider value={sink}>{children}</HeadCtx.Provider>;
}

const SITE = 'Alicerce';
export function useHead(title: string, description: string) {
  const sink = useContext(HeadCtx);
  const full = title ? `${title} · ${SITE}` : `${SITE} — formação em computação do zero ao avançado`;
  if (sink) {
    sink.title = full;
    sink.description = description;
  }
  useEffect(() => {
    document.title = full;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [full, description]);
}
