/**
 * Autorização do conteúdo pago (aulas, cartões, base do tutor e dicas).
 *
 * A maior parte usa um corpo FALSO (fixture) para uma aula paga, com os ids reais
 * do mapa público: os testes rodam iguais no CI público, sem o repositório privado.
 * O último bloco usa o conteúdo pago REAL e só roda com o diretório privado
 * (ALICERCE_PREMIUM_DIR ou <raiz>/premium).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exerciseById, isFreeLesson, lessons, levels, publicLessons, publicLevels, type Lesson, type Level } from '@alicerce/content';
import { assembleCurriculum, resolvePremiumDir } from '@alicerce/content/completo';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { contentStore, loadContentStore, publicContent, type ContentStore } from '../src/conteudo.ts';
import { openDb } from '../src/db.ts';
import { setPlan } from '../src/plans.ts';
import { OfflineTutor, tutorSources, parseTutorRequest, type TutorSources } from '../src/tutor.ts';

const H = { 'x-alicerce': '1', 'content-type': 'application/json' };

/* ---------- fixture: corpo falso de uma aula paga do nível 2 ---------- */
const level2 = levels.find((l) => l.number === 2)!;
const paidMeta = level2.modules.flatMap((m) => m.lessons).find((l) => l.exercises.length > 0)!;
const paidEx = paidMeta.exercises[0]!;
const MARK = {
  body: 'Fixturexplica azulpago corpo da aula paga',
  prompt: 'ENUNCIADO-PAGO-FIXTURE',
  hint1: 'DICA-PAGA-FIXTURE-UM',
  hint2: 'DICA-PAGA-FIXTURE-DOIS',
  solution: 'SOLUCAO_PAGA_FIXTURE = 1',
  card: 'CARTAO-PAGO-FIXTURE',
};
const fakeLesson: Lesson = {
  id: paidMeta.id,
  moduleId: paidMeta.moduleId,
  title: paidMeta.title,
  titleEn: paidMeta.titleEn,
  summary: paidMeta.summary,
  minutes: paidMeta.minutes,
  objectives: ['OBJETIVO-PAGO-FIXTURE'],
  skills: paidMeta.skills,
  terms: [],
  references: paidMeta.references,
  sections: [
    { stage: 'conceito', blocks: [{ type: 'md', text: MARK.body }] },
    {
      stage: 'exercicio',
      blocks: [
        {
          type: 'exercise',
          exercise: { id: paidEx.id, kind: 'code', lang: 'python', difficulty: paidEx.difficulty, skills: paidEx.skills, prompt: MARK.prompt, hints: [MARK.hint1, MARK.hint2], explanation: 'explicação da fixture', starter: '', solution: MARK.solution, tests: [{ name: 't', code: 'assert True' }] },
        },
      ],
    },
  ],
  cards: [{ id: `${paidMeta.id}#1`, front: MARK.card, back: 'verso' }],
};
const fakeLevel: Level = { ...level2, modules: [{ ...level2.modules.find((m) => m.id === paidMeta.moduleId)!, lessons: [fakeLesson] }] };
const withPremium = contentStore(assembleCurriculum([...publicLevels, fakeLevel], 'completo', '/fixture'));
const freeLesson = publicLessons[0]!;

async function fixture(content: ContentStore = withPremium, env: Record<string, string> = {}) {
  let calls = 0;
  let seen: TutorSources | undefined;
  let falhar = false;
  const db = openDb(':memory:');
  const tutor = {
    name: 'ia' as const,
    answer: async (_req: unknown, sources: TutorSources) => {
      calls++;
      seen = sources;
      if (falhar) throw new Error('provedor fora do ar');
      return 'orientação';
    },
  };
  const app = await buildApp({ db, content, config: { ...loadConfig(env), webDist: '/none' }, tutor });
  const reg = await app.inject({ method: 'POST', url: '/api/auth/register', headers: H, payload: { email: 'reader@example.com', password: 'long-password-123' } });
  const id = reg.json().user.id as string;
  const cookie = String(reg.headers['set-cookie']).split(';')[0]!;
  return {
    app,
    db,
    id,
    headers: { ...H, cookie },
    calls: () => calls,
    /** faz o provedor de IA (falso) falhar nas próximas chamadas */
    falhar: (sim = true) => (falhar = sim),
    /** o que o provedor de IA (falso) recebeu na última chamada */
    seen: () => seen,
    premium: (ms = 60_000) => setPlan(db, id, 'premium', Date.now() + ms, 'test'),
    expire: () => setPlan(db, id, 'premium', Date.now() - 1, 'test'),
    close: async () => {
      await app.close();
      db.close();
    },
  };
}
const lessonUrl = `/api/content/lessons/${paidMeta.id}`;

describe('aulas pagas: sessão válida + Premium ativo no banco, a cada pedido', () => {
  it('visitante: aula gratuita sim, aula paga 401, mesmo por URL direta', async () => {
    const f = await fixture();
    try {
      const freeRes = await f.app.inject({ url: `/api/content/lessons/${freeLesson.id}` });
      expect(freeRes.statusCode).toBe(200);
      expect(freeRes.json().id).toBe(freeLesson.id);
      const res = await f.app.inject({ url: lessonUrl });
      expect(res.statusCode).toBe(401);
      expect(res.body).not.toContain(MARK.body);
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect((await f.app.inject({ url: '/api/content/lessons/invented' })).statusCode).toBe(404);
    } finally {
      await f.close();
    }
  });

  it('conta gratuita: 403, e nada que venha do cliente autoriza', async () => {
    const f = await fixture();
    try {
      const res = await f.app.inject({ url: `${lessonUrl}?plan=premium`, headers: { ...f.headers, 'x-plan': 'premium' } });
      expect(res.statusCode).toBe(403);
      expect(res.body).not.toContain(MARK.body);
      // progresso sincronizado com a aula "concluída" não desbloqueia nada
      await f.app.inject({ method: 'PUT', url: '/api/progress', headers: f.headers, payload: { expectedUserId: f.id, progress: { completedLessons: { [paidMeta.id]: Date.now() } } } });
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(403);
    } finally {
      await f.close();
    }
  });

  it('Premium ativo recebe a aula (private, no-store); vencido recebe 403 já no pedido seguinte', async () => {
    const f = await fixture();
    try {
      f.premium();
      const full = await f.app.inject({ url: lessonUrl, headers: f.headers });
      expect(full.statusCode).toBe(200);
      expect(full.headers['cache-control']).toBe('private, no-store');
      expect(full.headers.vary).toContain('Cookie');
      expect(full.json().id).toBe(paidMeta.id);
      expect(full.body).toContain(MARK.solution);
      f.expire();
      const after = await f.app.inject({ url: lessonUrl, headers: f.headers });
      expect(after.statusCode).toBe(403);
      expect(after.body).not.toContain(MARK.body);
    } finally {
      await f.close();
    }
  });

  it('sessão encerrada perde o acesso no pedido seguinte', async () => {
    const f = await fixture();
    try {
      f.premium();
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(200);
      await f.app.inject({ method: 'POST', url: '/api/auth/logout', headers: f.headers });
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(401);
    } finally {
      await f.close();
    }
  });

  it('assinatura paga que vence sem renovar: 403 no pedido seguinte, mesmo com a cópia em users ainda Premium; renovada, volta', async () => {
    const f = await fixture(withPremium, { PAGAMENTO_PROVEDOR: 'teste' });
    try {
      const r = await f.app.inject({ method: 'POST', url: '/api/assinatura', headers: f.headers, payload: { periodo: 'mensal' } });
      const sub = decodeURIComponent(new URL(r.json().url, 'http://x').hash.slice('#a='.length));
      await f.app.inject({ method: 'POST', url: '/api/pagamento/teste/simular', headers: f.headers, payload: { assinatura: sub, resultado: 'aprovar' } });
      await f.app.inject({ method: 'PUT', url: '/api/progress', headers: f.headers, payload: { expectedUserId: f.id, progress: { lessons: { [freeLesson.id]: { visited: ['conceito'], completedAt: Date.now() } } } } });
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(200);

      // o período pago acaba e nenhum evento chega (renovação ainda não cobrada)
      f.db.prepare('UPDATE subscriptions SET paid_until = ? WHERE id = ?').run(Date.now() - 1, sub);
      expect(f.db.prepare('SELECT plan FROM users WHERE id = ?').get(f.id)).toEqual({ plan: 'premium' });
      const after = await f.app.inject({ url: lessonUrl, headers: f.headers });
      expect(after.statusCode).toBe(403);
      expect(after.body).not.toContain(MARK.body);
      expect((await f.app.inject({ url: '/api/auth/me', headers: f.headers })).json().entitlements).toMatchObject({ plan: 'free', tutorDailyLimit: 0 });
      // o gratuito e o progresso continuam
      expect((await f.app.inject({ url: `/api/content/lessons/${freeLesson.id}`, headers: f.headers })).statusCode).toBe(200);
      expect(JSON.parse((f.db.prepare('SELECT data FROM progress WHERE user_id = ?').get(f.id) as { data: string }).data).lessons).toHaveProperty(freeLesson.id);

      await f.app.inject({ method: 'POST', url: '/api/pagamento/teste/simular', headers: f.headers, payload: { assinatura: sub, resultado: 'renovar' } });
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(200);
    } finally {
      await f.close();
    }
  });

  it('sem o diretório privado: o servidor sobe, aulas gratuitas seguem e o Premium recebe 503 claro', async () => {
    const f = await fixture(publicContent);
    try {
      expect((await f.app.inject({ url: '/api/health' })).json().conteudoPago).toBe('indisponivel');
      expect((await f.app.inject({ url: `/api/content/lessons/${freeLesson.id}` })).statusCode).toBe(200);
      expect((await f.app.inject({ url: lessonUrl })).statusCode).toBe(401);
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(403);
      f.premium();
      const res = await f.app.inject({ url: lessonUrl, headers: f.headers });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({ conteudoPago: 'indisponivel' });
      expect(res.json().error).toMatch(/indispon/);
      expect((await f.app.inject({ url: '/api/content/cards', headers: f.headers })).statusCode).toBe(503);
    } finally {
      await f.close();
    }
  });
});

describe('progresso com aulas pagas', () => {
  it('progresso antigo com exercícios, lição e cartões pagos continua válido, sem liberar o conteúdo', async () => {
    const f = await fixture();
    try {
      const at = Date.now() - 86_400_000;
      const progress = {
        version: 1,
        attempts: [{ exerciseId: paidEx.id, skills: paidEx.skills, difficulty: paidEx.difficulty, correct: true, score: 1, hintsUsed: 0, wrongTries: 0, revealed: false, at }],
        lessons: { [paidMeta.id]: { visited: ['conceito', 'exercicio'], completedAt: at } },
        cards: { [`${paidMeta.id}#1`]: { stability: 1, difficulty: 5, reps: 1, lapses: 0, lastReview: at, due: at } },
      };
      const put = await f.app.inject({ method: 'PUT', url: '/api/progress', headers: f.headers, payload: { expectedUserId: f.id, progress } });
      expect(put.statusCode).toBe(200);
      const saved = put.json().progress;
      expect(saved.attempts.map((a: { exerciseId: string }) => a.exerciseId)).toEqual([paidEx.id]);
      expect(saved.lessons[paidMeta.id].completedAt).toBe(at);
      expect(Object.keys(saved.cards)).toEqual([`${paidMeta.id}#1`]);
      // os ids continuam no mapa público, de onde o site tira títulos, habilidades e contagens
      expect(exerciseById.get(paidEx.id)?.lessonId).toBe(paidMeta.id);
      // e guardar progresso de uma aula paga não autoriza ler o corpo dela
      expect((await f.app.inject({ url: lessonUrl, headers: f.headers })).statusCode).toBe(403);
    } finally {
      await f.close();
    }
  });
});

describe('cartões seguem a mesma regra', () => {
  it('visitante 401, gratuita 403, Premium recebe os pagos, vencido 403', async () => {
    const f = await fixture();
    try {
      const get = (headers?: Record<string, string>) => f.app.inject({ url: '/api/content/cards', ...(headers ? { headers } : {}) });
      expect((await get()).statusCode).toBe(401);
      const free = await get(f.headers);
      expect(free.statusCode).toBe(403);
      expect(free.body).not.toContain(MARK.card);
      f.premium();
      const ok = await get(f.headers);
      expect(ok.statusCode).toBe(200);
      expect(ok.headers['cache-control']).toBe('private, no-store');
      expect(ok.json()[paidMeta.id][0].front).toBe(MARK.card);
      expect(ok.json()[freeLesson.id]).toEqual(freeLesson.cards);
      f.expire();
      expect((await get(f.headers)).statusCode).toBe(403);
    } finally {
      await f.close();
    }
  });
});

describe('tutor e base do tutor seguem a mesma regra', () => {
  const ask = (f: Awaited<ReturnType<typeof fixture>>, payload: Record<string, unknown>, auth = true) =>
    f.app.inject({ method: 'POST', url: '/api/tutor', headers: auth ? f.headers : H, payload });

  it('sem acesso, o tutor não devolve dicas nem enunciado de exercício pago', async () => {
    const f = await fixture();
    try {
      const forged = { message: 'me dá uma dica', accessPlan: 'premium', plan: 'premium', context: { exerciseId: paidEx.id, hintsSeen: 0 } };
      const anon = await ask(f, forged, false);
      expect(anon.statusCode).toBe(401);
      const free = await ask(f, forged);
      expect(free.statusCode).toBe(403);
      for (const r of [anon, free]) for (const m of [MARK.hint1, MARK.hint2, MARK.prompt, MARK.solution]) expect(r.body).not.toContain(m);
      expect((await ask(f, { message: 'explique', context: { lessonId: paidMeta.id } })).statusCode).toBe(403);
      expect(f.calls()).toBe(0);
    } finally {
      await f.close();
    }
  });

  it('a base de conhecimento de quem não tem Premium só tem aulas gratuitas', async () => {
    const f = await fixture();
    try {
      // pergunta feita com as palavras exatas do corpo pago: um gratuito não recebe o trecho
      const free = await ask(f, { message: 'fixturexplica azulpago' });
      expect(free.statusCode).toBe(200);
      expect(free.body).not.toContain('azulpago corpo');
      const req = parseTutorRequest({ message: 'fixturexplica azulpago' });
      expect(tutorSources(withPremium, req, 'free').knowledge.every((d) => isFreeLesson(d.id))).toBe(true);
      expect(tutorSources(withPremium, req, 'premium').knowledge.some((d) => d.id === paidMeta.id)).toBe(true);
      // controle positivo: com Premium, o mesmo tutor local devolve o trecho (o filtro é que protege)
      expect(await new OfflineTutor().answer(req, tutorSources(withPremium, req, 'premium'))).toContain('azulpago corpo');
      expect(await new OfflineTutor().answer(req, tutorSources(withPremium, req, 'free'))).not.toContain('azulpago corpo');
      // defesa em profundidade: mesmo chamado direto, o resolvedor não entrega exercício pago a plano gratuito
      const direct = tutorSources(withPremium, parseTutorRequest({ message: 'dica', context: { exerciseId: paidEx.id } }), 'free');
      expect(direct.exercise).toBeUndefined();
      expect(direct.lesson).toBeUndefined();
    } finally {
      await f.close();
    }
  });

  it('exercício pago fora do mapa (mapa desatualizado) não passa por gratuito', () => {
    const OFF = 'e-fora-do-mapa-fixture';
    const base = (fakeLesson.sections[1]!.blocks[0] as Extract<Lesson['sections'][number]['blocks'][number], { type: 'exercise' }>).exercise;
    const offMap: Lesson = { ...fakeLesson, sections: [...fakeLesson.sections, { stage: 'desafio', blocks: [{ type: 'exercise', exercise: { ...base, id: OFF } }] }] };
    const store = contentStore(assembleCurriculum([...publicLevels, { ...fakeLevel, modules: [{ ...fakeLevel.modules[0]!, lessons: [offMap] }] }], 'completo', '/fixture'));
    expect(exerciseById.has(OFF)).toBe(false);
    // pela rota, o id nem passa da validação do pedido
    expect(parseTutorRequest({ message: 'dica', context: { exerciseId: OFF } }).context.exerciseId).toBeUndefined();
    // e, chamado direto com uma lição gratuita ao lado, o resolvedor confere a lição do exercício carregado
    const req = { message: 'me dá uma dica', history: [], context: { exerciseId: OFF, lessonId: freeLesson.id } };
    expect(tutorSources(store, req, 'free').exercise).toBeUndefined();
    expect(tutorSources(store, req, 'premium').exercise?.hints).toContain(MARK.hint1);
  });

  it('Premium: o tutor recebe enunciado e dicas da aula paga; vencido perde no pedido seguinte', async () => {
    const f = await fixture();
    try {
      f.premium();
      const ok = await f.app.inject({ method: 'POST', url: '/api/tutor', headers: f.headers, payload: { message: 'me dá uma dica', context: { exerciseId: paidEx.id, hintsSeen: 0 } } });
      expect(ok.statusCode).toBe(200);
      expect(ok.json().mode).toBe('ia');
      expect(ok.headers['cache-control']).toBe('private, no-store');
      expect(f.seen()?.exercise?.prompt).toBe(MARK.prompt);
      expect(f.seen()?.exercise?.hints).toContain(MARK.hint1);
      expect(f.seen()?.lesson?.id).toBe(paidMeta.id);
      f.expire();
      const after = await ask(f, { message: 'me dá uma dica', context: { exerciseId: paidEx.id, hintsSeen: 0 } });
      expect(after.statusCode).toBe(403);
      expect(after.body).not.toContain(MARK.hint1);
    } finally {
      await f.close();
    }
  });

  it('Premium com o diretório privado ausente: 503 em vez de responder sem contexto', async () => {
    const f = await fixture(publicContent);
    try {
      f.premium();
      expect((await ask(f, { message: 'dica', context: { exerciseId: paidEx.id } })).statusCode).toBe(503);
      expect((await ask(f, { message: 'Explique variáveis' })).statusCode).toBe(200);
    } finally {
      await f.close();
    }
  });
});

describe('cota do tutor com IA (Premium)', () => {
  it('nunca chama a IA paga para conta gratuita', async () => {
    const f = await fixture();
    try {
      expect((await ask0(f, { message: 'Explique variáveis', accessPlan: 'premium', plan: 'premium' })).json().reason).toBe('premium_required');
      expect(f.calls()).toBe(0);
    } finally {
      await f.close();
    }
  });
  it('confere limite diário e do mês antes de chamar o provedor', async () => {
    const f = await fixture();
    try {
      setPlan(f.db, f.id, 'premium', null, 'test');
      const day = new Date().toISOString().slice(0, 10);
      f.db.prepare('INSERT INTO tutor_usage(user_id,day,count) VALUES(?,?,?)').run(f.id, day, 19);
      expect((await ask0(f, { message: 'Explique variáveis' })).json().mode).toBe('ia');
      expect((await ask0(f, { message: 'Explique variáveis' })).json().reason).toBe('daily_limit');
      f.db.prepare('UPDATE tutor_usage SET count=200 WHERE user_id=?').run(f.id);
      expect((await ask0(f, { message: 'Explique variáveis' })).json().reason).toBe('monthly_limit');
      expect(f.calls()).toBe(1);
    } finally {
      await f.close();
    }
  });
  it('falha da IA depois do envio conta na cota da conta e entra nos totais do dia, com a falha', async () => {
    const f = await fixture();
    try {
      setPlan(f.db, f.id, 'premium', null, 'test');
      const day = new Date().toISOString().slice(0, 10);
      f.db.prepare('INSERT INTO tutor_usage(user_id,day,count) VALUES(?,?,?)').run(f.id, day, 17);
      f.falhar();
      for (let i = 0; i < 2; i++) expect((await ask0(f, { message: 'Explique variáveis' })).json()).toMatchObject({ mode: 'offline', reason: 'provider_unavailable' });
      expect((f.db.prepare('SELECT count FROM tutor_usage WHERE user_id=?').get(f.id) as { count: number }).count).toBe(19);
      f.falhar(false);
      expect((await ask0(f, { message: 'Explique variáveis' })).json().mode).toBe('ia');
      expect((await ask0(f, { message: 'Explique variáveis' })).json().reason).toBe('daily_limit');
      expect(f.calls()).toBe(3);
      expect(f.db.prepare('SELECT calls, failures FROM tutor_ai_daily WHERE day=?').get(day)).toEqual({ calls: 3, failures: 2 });
    } finally {
      await f.close();
    }
  });
  it('teto do dia no Alicerce todo: atingido, ninguém chama a IA, e o motivo é outro', async () => {
    const f = await fixture(withPremium, { TUTOR_GLOBAL_DAILY_LIMIT: '2' });
    try {
      setPlan(f.db, f.id, 'premium', null, 'test');
      const day = new Date().toISOString().slice(0, 10);
      f.db.prepare('INSERT INTO tutor_ai_daily(day,calls) VALUES(?,?)').run('2020-01-01', 99); // outro dia não conta
      expect((await ask0(f, { message: 'Explique variáveis' })).json().mode).toBe('ia');
      expect((await ask0(f, { message: 'Explique variáveis' })).json().mode).toBe('ia');
      expect((await ask0(f, { message: 'Explique variáveis' })).json()).toMatchObject({ mode: 'offline', reason: 'budget_limit' });
      expect(f.calls()).toBe(2);
      // a pergunta recusada pelo teto não gasta a cota da conta
      expect((f.db.prepare('SELECT count FROM tutor_usage WHERE user_id=? AND day=?').get(f.id, day) as { count: number }).count).toBe(2);
    } finally {
      await f.close();
    }
  });
  it('TUTOR_GLOBAL_DAILY_LIMIT=0 desliga a IA sem desligar o tutor', async () => {
    const f = await fixture(withPremium, { TUTOR_GLOBAL_DAILY_LIMIT: '0' });
    try {
      setPlan(f.db, f.id, 'premium', null, 'test');
      expect((await ask0(f, { message: 'Explique variáveis' })).json()).toMatchObject({ mode: 'offline', reason: 'budget_limit' });
      expect(f.calls()).toBe(0);
    } finally {
      await f.close();
    }
  });
  it('meses anteriores não contam para a cota do mês atual', async () => {
    const f = await fixture();
    try {
      setPlan(f.db, f.id, 'premium', null, 'test');
      f.db.prepare('INSERT INTO tutor_usage(user_id,day,count) VALUES(?,?,?)').run(f.id, '2020-01-01', 200);
      expect((await ask0(f, { message: 'Explique variáveis' })).json().mode).toBe('ia');
    } finally {
      await f.close();
    }
  });
});
const ask0 = (f: Awaited<ReturnType<typeof fixture>>, payload: Record<string, unknown>) => f.app.inject({ method: 'POST', url: '/api/tutor', headers: f.headers, payload });

describe('carga do conteúdo na inicialização', () => {
  it('sem diretório: sobe só com o gratuito e avisa; com ALICERCE_EXIGIR_PREMIUM=1, falha', async () => {
    const { store, warnings } = await loadContentStore(null, {});
    expect(store.premium).toBe('indisponivel');
    expect(warnings.join(' ')).toMatch(/indispon/);
    await expect(loadContentStore(null, { ALICERCE_EXIGIR_PREMIUM: '1' })).rejects.toThrow();
  });
  it('privado com conteúdo em formato inesperado não derruba o servidor (sem exigência)', async () => {
    // um campo novo na lição, que o mapa público ainda não sabe classificar (catalog.ts)
    const dir = mkdtempSync(join(tmpdir(), 'alicerce-privado-formato-'));
    try {
      mkdirSync(join(dir, 'src'));
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
      const lesson = { id: 'l2-x', moduleId: 'm2-x', title: 't', titleEn: 't', summary: 's', minutes: 1, objectives: [], skills: [], terms: [], references: [], sections: [], cards: [], video: 'campo novo' };
      const mod = { id: 'm2-x', levelId: 'n2', title: 'm', titleEn: 'm', description: 'd', prerequisites: [], skills: [], outline: [], references: [], lessons: [lesson] };
      const levels = Array.from({ length: 13 }, (_, i) => ({ id: `n${i + 2}`, number: i + 2, title: 't', titleEn: 't', goal: 'g', why: 'w', modules: i === 0 ? [mod] : [] }));
      writeFileSync(join(dir, 'src', 'index.ts'), `export const FORMATO = 1;\nexport const levels = ${JSON.stringify(levels)};\n`);
      const { store, warnings } = await loadContentStore(dir, {});
      expect(store.premium).toBe('indisponivel');
      expect(warnings[0]).toMatch(/formato inesperado.*video/);
      await expect(loadContentStore(dir, { ALICERCE_EXIGIR_PREMIUM: '1' })).rejects.toThrow(/video/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('diretório inválido não derruba o servidor (sem exigência)', async () => {
    const { store, warnings } = await loadContentStore('/nao/existe/alicerce-premium', {});
    expect(store.premium).toBe('indisponivel');
    expect(warnings[0]).toMatch(/src\/index\.ts/);
  });
});

const premiumDir = resolvePremiumDir();
describe.runIf(premiumDir)('conteúdo pago REAL (só com o diretório privado)', () => {
  it('carrega todas as aulas do mapa, sem divergência', async () => {
    const { store, warnings } = await loadContentStore(premiumDir);
    expect(store.premium).toBe('disponivel');
    expect(warnings).toEqual([]);
    for (const l of lessons) expect(store.lesson(l.id), l.id).toBeDefined();
  });
  it('protege a avaliação de Python junto do corpo da aula e revoga após o vencimento', async () => {
    const { store } = await loadContentStore(premiumDir);
    const f = await fixture(store);
    try {
      const get = () => f.app.inject({ url: '/api/content/lessons/l2-testes', headers: f.headers });
      expect((await get()).statusCode).toBe(403);
      f.premium();
      const full = await get();
      expect(full.statusCode).toBe(200);
      expect(full.json().autonomy).toHaveLength(4);
      f.expire();
      expect((await get()).statusCode).toBe(403);
    } finally {
      await f.close();
    }
  });
});
