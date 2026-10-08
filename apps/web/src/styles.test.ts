import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Os tokens do tema escuro aparecem duas vezes em styles.css: na media query (tema do sistema) e em
// [data-theme='dark'] (botão de tema). Os dois blocos são cópias e precisam continuar idênticos.
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

function tokens(block: string) {
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}
function blockAfter(selector: string) {
  const start = css.indexOf('{', css.indexOf(selector)) + 1;
  return css.slice(start, css.indexOf('}', start));
}

const light = tokens(blockAfter(':root {'));
const darkMedia = tokens(blockAfter(":root:not([data-theme='light']) {"));
const darkToggle = tokens(blockAfter(":root[data-theme='dark'] {"));

describe('tokens de cor', () => {
  it('os dois blocos do tema escuro são idênticos', () => {
    expect(Object.keys(darkMedia).length).toBeGreaterThan(30);
    expect(darkToggle).toEqual(darkMedia);
  });

  it('toda cor do tema claro tem uma versão no escuro', () => {
    const themed = Object.keys(light).filter((k) => !/^--(font|radius|gap|content|wide)/.test(k));
    expect(themed.filter((k) => !(k in darkMedia))).toEqual([]);
    expect(Object.keys(darkMedia).filter((k) => !(k in light))).toEqual([]);
  });

  it('as cores da marca são o verde militar e o cimento', () => {
    expect(light['--brand']).toBe('#3b4a2a');
    expect(light['--cement']).toBe('#a3a29b');
  });
});
