/**
 * Renderizador do subconjunto de Markdown usado no conteúdo. Gera elementos
 * React diretamente (nunca innerHTML), então o conteúdo não tem como injetar
 * HTML ou scripts. Suporta: parágrafos, ### títulos, listas (- e 1.),
 * citações (>), blocos ``` , **negrito**, *itálico*, `código`, [links](https://)
 * e termos bilíngues {{termo|term}}.
 */
import { Fragment, type ReactNode } from 'react';
import { withBase } from './base.ts';
import { highlight } from './highlight.tsx';

const INLINE = /(\{\{([^|}]+)\|([^}]+)\}\})|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

export function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index!;
    if (idx > last) out.push(text.slice(last, idx));
    const key = `${keyPrefix}-${n++}`;
    if (m[1]) out.push(<Term key={key} pt={m[2]!} en={m[3]!} />);
    else if (m[4]) out.push(<code key={key}>{m[5]}</code>);
    else if (m[6]) out.push(<strong key={key}>{inline(m[7]!, key)}</strong>);
    else if (m[8]) out.push(<em key={key}>{inline(m[9]!, key)}</em>);
    else if (m[10]) {
      const href = m[12]!;
      const safe = /^(https:\/\/|\/|#)/.test(href);
      out.push(
        safe ? (
          <a key={key} href={withBase(href)} {...(href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {inline(m[11]!, key)}
          </a>
        ) : (
          m[11]
        ),
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Term({ pt, en }: { pt: string; en: string }) {
  return (
    <span className="term" title={`Em inglês: ${en}`} lang="pt-BR">
      {pt}
      <span className="en" lang="en">
        {en}
      </span>
    </span>
  );
}

export function CodeView({ code, lang }: { code: string; lang: string }) {
  return (
    // tabIndex: código com linha longa rola na horizontal, e quem usa teclado precisa conseguir rolar
    <pre tabIndex={0}>
      <code>{highlight(code, lang)}</code>
    </pre>
  );
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const lang = fence[1] || 'python';
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) body.push(lines[i++]!);
      i++;
      blocks.push(
        <div className="code-block" key={k++}>
          <CodeView code={body.join('\n')} lang={lang} />
        </div>,
      );
      continue;
    }
    const h = line.match(/^(#{2,4})\s+(.*)/);
    if (h) {
      const level = h[1]!.length;
      const content = inline(h[2]!, `h${k}`);
      blocks.push(level === 2 ? <h2 key={k++}>{content}</h2> : level === 3 ? <h3 key={k++}>{content}</h3> : <h4 key={k++}>{content}</h4>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i]!)) {
        let item = lines[i]!.replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, '');
        i++;
        // continuação indentada do item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]!) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) item += ' ' + lines[i++]!.trim();
        items.push(item);
      }
      const lis = items.map((it, j) => <li key={j}>{inline(it, `l${k}-${j}`)}</li>);
      blocks.push(ordered ? <ol key={k++}>{lis}</ol> : <ul key={k++}>{lis}</ul>);
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) quote.push(lines[i++]!.replace(/^>\s?/, ''));
      blocks.push(
        <blockquote key={k++} className="callout">
          <Markdown text={quote.join('\n')} />
        </blockquote>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(```|#{2,4}\s|\s*[-*]\s+|\s*\d+\.\s+|>)/.test(lines[i]!)) para.push(lines[i++]!);
    blocks.push(<p key={k++}>{inline(para.join(' '), `p${k}`)}</p>);
  }
  return className ? <div className={className}>{blocks}</div> : <Fragment>{blocks}</Fragment>;
}
