/**
 * Carregado sob demanda: só baixa o CodeMirror quando um editor aparece.
 */
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder as ph } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle, indentUnit } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { sql } from '@codemirror/lang-sql';

const style = HighlightStyle.define([
  { tag: t.keyword, color: '#f0a46b' },
  { tag: [t.string, t.special(t.string)], color: '#a8d38b' },
  { tag: [t.number, t.bool, t.null], color: '#f6d77a' },
  { tag: t.comment, color: '#8a8f9e', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#8fc1ff' },
  { tag: [t.standard(t.variableName), t.className], color: '#d6a8ff' },
  { tag: t.operator, color: '#e9e4d8' },
]);

const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--code-bg)', color: 'var(--code-ink)' },
    '.cm-content': { fontFamily: 'var(--font-mono)', caretColor: '#f6d77a', padding: '0.6rem 0' },
    '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: '#7d8494', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgb(255 255 255 / 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgb(255 255 255 / 0.06)' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#f6d77a' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgb(143 193 255 / 0.3) !important' },
    '.cm-matchingBracket': { backgroundColor: 'rgb(246 215 122 / 0.25)', outline: '1px solid rgb(246 215 122 / 0.5)' },
    '.cm-scroller': { lineHeight: '1.55' },
  },
  { dark: true },
);

export interface MountOptions {
  parent: HTMLElement;
  value: string;
  lang: string;
  label: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
  onRun?: () => void;
}

export function mountEditor(o: MountOptions): { view: EditorView; set(v: string): void } {
  const langExt = o.lang === 'python' ? python() : o.lang === 'javascript' ? javascript() : o.lang === 'sql' ? sql() : [];
  const view = new EditorView({
    parent: o.parent,
    state: EditorState.create({
      doc: o.value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        syntaxHighlighting(style),
        theme,
        langExt,
        o.placeholder ? ph(o.placeholder) : [],
        EditorState.readOnly.of(!!o.readOnly),
        EditorView.contentAttributes.of({ 'aria-label': o.label, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
        keymap.of([
          { key: 'Mod-Enter', run: () => (o.onRun?.(), true) },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) o.onChange(u.state.doc.toString());
        }),
      ],
    }),
  });
  return {
    view,
    set(v: string) {
      if (v !== view.state.doc.toString()) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
    },
  };
}
