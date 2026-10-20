/**
 * O verificador de vazamento roda de verdade (processo separado) contra um
 * "repositório privado" FALSO, criado aqui com texto inventado: assim o próprio
 * detector é testado também no CI público, que não tem o privado real.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('./verificar-vazamento.ts', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'alicerce-vazamento-teste-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const BODY =
  'O pinguim cartógrafo desenhou mapas de gelo azul para a expedição lunar de quinta-feira, ' +
  'enquanto a tartaruga engenheira calibrava relógios de areia molhada no farol abandonado do deserto.';
const HINT = 'Pergunte ao pinguim cartógrafo qual relógio de areia molhada atrasou primeiro na expedição.';
const CARD = 'Por que a tartaruga engenheira calibrava relógios de areia molhada no farol?';

/** Um repositório privado mínimo no formato que o servidor carrega (FORMATO, levels). */
function fakePrivate() {
  const dir = join(root, 'privado');
  mkdirSync(join(dir, 'src', 'levels'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  const lesson = {
    id: 'l2-falsa',
    moduleId: 'm2-falso',
    title: 'Lição falsa',
    titleEn: 'Fake lesson',
    summary: 'Só para o teste do verificador.',
    minutes: 10,
    objectives: ['Explicar ao pinguim cartógrafo por que o farol abandonado do deserto não tem relógio.'],
    skills: [],
    terms: [],
    references: [],
    sections: [
      { stage: 'conceito', blocks: [{ type: 'md', text: BODY }] },
      {
        stage: 'exercicio',
        blocks: [
          {
            type: 'exercise',
            exercise: {
              id: 'e2-falso-1',
              kind: 'mcq',
              difficulty: 'facil',
              skills: [],
              prompt: 'Qual animal desenhou os mapas de gelo azul para a expedição lunar de quinta-feira?',
              hints: [HINT],
              explanation: 'Foi o pinguim cartógrafo, que conhecia o gelo azul melhor que a tartaruga engenheira.',
              options: [{ text: 'O pinguim', correct: true, feedback: 'Isso: o pinguim cartógrafo fez os mapas.' }],
            },
          },
        ],
      },
    ],
    cards: [{ id: 'l2-falsa#1', front: CARD, back: 'Porque a areia molhada atrasa os relógios do farol abandonado.' }],
  };
  const level = { id: 'n2', number: 2, title: 'N2', titleEn: 'N2', goal: 'g', why: 'w', modules: [{ id: 'm2-falso', levelId: 'n2', title: 'M', titleEn: 'M', description: 'd', prerequisites: [], skills: [], outline: [], lessons: [lesson], references: [] }] };
  writeFileSync(join(dir, 'src', 'levels', 'n02.ts'), `export const level2 = ${JSON.stringify(level, null, 2)};\n`);
  writeFileSync(join(dir, 'src', 'index.ts'), "import { level2 } from './levels/n02.ts';\nexport const FORMATO = 1;\nexport const levels = [level2];\n");
  return dir;
}
const privado = fakePrivate();

function build(name: string, files: Record<string, string>) {
  const dir = join(root, name);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}
const verify = (...args: string[]) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, ALICERCE_PREMIUM_DIR: privado }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};

describe('verificar-vazamento.ts (com um privado falso)', () => {
  it('build limpo passa; trecho pago em JSON, HTML escapado ou bundle reprova e vai para --json', () => {
    const limpo = build('limpo', { 'index.html': '<p>Página pública sem nada pago.</p>', 'assets/app.js': 'console.log("ok")' });
    const ok = verify('--dist', limpo);
    expect(ok.out).toContain('controles positivos: 4 de 4');
    expect(ok.out).toContain('aulas pagas com amostra: 1 de 1');
    expect(ok.out).toContain('✓ nenhum trecho das aulas pagas');
    expect(ok.code, ok.out).toBe(0);

    const vazado = build('vazado', {
      'assets/dica.js': `const d=${JSON.stringify(HINT).replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))};`,
      'licao/index.html': `<p>${CARD.replace(/a/g, '&#97;')}</p>`,
      'dados.json': JSON.stringify({ texto: BODY }),
    });
    const json = join(root, 'relatorio.json');
    const bad = verify('--dist', limpo, '--dist', vazado, '--json', json);
    expect(bad.code, bad.out).toBe(1);
    expect(bad.out).toContain('✘ VAZAMENTO');
    const report = JSON.parse(readFileSync(json, 'utf8')) as { alvos: Array<{ naoRevisadas: Array<{ file: string; cat: string }> }> };
    expect(report.alvos[0]!.naoRevisadas).toEqual([]);
    const hits = report.alvos[1]!.naoRevisadas;
    expect(new Set(hits.map((h) => h.file))).toEqual(new Set(['assets/dica.js', 'licao/index.html', 'dados.json']));
    expect(new Set(hits.map((h) => h.cat))).toEqual(new Set(['dica', 'cartão', 'corpo da aula']));
  }, 60_000);

  it('vazamento enorme (centenas de milhares de ocorrências) reprova com relatório, sem estourar a pilha', () => {
    const vazado = build('enorme', { 'assets/tudo.js': Array.from({ length: 12_000 }, () => BODY).join('\n') });
    const r = verify('--dist', vazado);
    expect(r.out).not.toContain('RangeError');
    expect(r.out).toMatch(/mais \d{6,} ocorrência\(s\) não revisada\(s\), em 1 arquivo/);
    expect(r.out).toContain('✘ VAZAMENTO');
    expect(r.code, r.out.slice(-2000)).toBe(1);
  }, 120_000);
});
