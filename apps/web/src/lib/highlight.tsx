/**
 * Realce de sintaxe leve para blocos de código estáticos (sem dependência).
 * Não é um parser: é um tokenizador por expressões regulares suficiente para
 * Python, JavaScript, SQL e shell em material didático. O editor interativo
 * usa o CodeMirror, carregado sob demanda.
 */
import type { ReactNode } from 'react';

const KW: Record<string, Set<string>> = {
  python: new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' ')),
  javascript: new Set('const let var function return if else for while do break continue switch case default new class extends super this typeof instanceof in of try catch finally throw async await import export from null undefined true false yield delete void'.split(' ')),
  sql: new Set('select from where and or not insert into values update set delete create table primary key foreign references join inner left right full outer on group by order having limit offset as distinct count sum avg min max null is in like between union all index begin commit rollback transaction exists case when then else end integer text real default unique check desc asc drop alter view'.split(' ')),
  bash: new Set('if then else fi for do done while case esac function in export echo cd ls mkdir rm cp mv cat grep sudo git npm node python3 pip docker'.split(' ')),
};
const BUILTINS = new Set('print len range input int str float list dict set tuple sorted sum min max abs enumerate zip map filter open isinstance type round any all reversed super console Math JSON Object Array Promise document window fetch'.split(' '));

const TOKEN = /(#[^\n]*|--[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(\s*\()?/g;

export function highlight(code: string, lang: string): ReactNode[] {
  const kws = KW[lang];
  if (!kws) return [code];
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of code.matchAll(TOKEN)) {
    const [whole, com, str, num, ident, call] = m;
    const idx = m.index!;
    // comentário: # só em python/bash, -- só em sql, // e /* só em js
    if (com) {
      const ok = (com.startsWith('#') && (lang === 'python' || lang === 'bash')) || (com.startsWith('--') && lang === 'sql') || (com.startsWith('/') && lang === 'javascript');
      if (!ok) continue;
    }
    if (idx > last) out.push(code.slice(last, idx));
    const key = i++;
    if (com) out.push(<span key={key} className="tok-com">{com}</span>);
    else if (str) out.push(<span key={key} className="tok-str">{str}</span>);
    else if (num) out.push(<span key={key} className="tok-num">{num}</span>);
    else if (ident) {
      const lower = lang === 'sql' ? ident.toLowerCase() : ident;
      if (kws.has(lower)) out.push(<span key={key} className="tok-kw">{ident}</span>);
      else if (BUILTINS.has(ident)) out.push(<span key={key} className="tok-bi">{ident}</span>);
      else if (call) out.push(<span key={key} className="tok-fn">{ident}</span>);
      else out.push(ident);
      if (call) out.push(call);
    }
    last = idx + whole.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}
