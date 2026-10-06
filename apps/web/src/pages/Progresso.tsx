import { useEffect, useMemo, useRef, useState } from 'react';
import { exercises, lessons, levels, skillById } from '../content.ts';
import { activityByDay, gamification, mergeProgress, retentionEvidence, RETENTION_GAP_DAYS, sanitizeProgress, skillStatus, streak, type SkillStatus } from '@alicerce/engine';
import { useHead } from '../lib/head.tsx';
import { Link } from '../lib/router.tsx';
import { getProgress, replaceProgress, resetProgress, useAuth, useDerived, useProgress } from '../state/store.ts';
import { moduleProgress } from '../lib/progress-helpers.ts';

const SKILL_LABEL: Record<SkillStatus, string> = {
  'nao-iniciada': 'Não iniciada',
  aprendendo: 'Aprendendo',
  reforco: 'Precisa de reforço',
  dominada: 'Dominada',
  revisar: 'Revisar',
};
const SKILL_BADGE: Record<SkillStatus, string> = { 'nao-iniciada': '', aprendendo: 'info', reforco: 'warn', dominada: 'ok', revisar: 'warn' };
const WEEKS = 18;

export function Progresso() {
  useHead('Seu progresso', 'Sequência de estudo, mapa de atividade, domínio por habilidade e progresso por nível. Exporte ou importe seus dados quando quiser.');
  const p = useProgress();
  const d = useDerived();
  const auth = useAuth();
  const [now, setNow] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setNow(Date.now()), [p]);

  const tz = now ? new Date(now).getTimezoneOffset() : 0;
  const activity = useMemo(() => activityByDay(p, tz), [p, tz]);
  const days = useMemo(() => {
    if (!now) return [];
    const out: Array<{ key: string; n: number }> = [];
    for (let i = WEEKS * 7 - 1; i >= 0; i--) {
      const key = new Date(now - i * 86_400_000 - tz * 60_000).toISOString().slice(0, 10);
      out.push({ key, n: activity.get(key) ?? 0 });
    }
    return out;
  }, [activity, now, tz]);
  const activeDays = days.filter((x) => x.n > 0).length;

  const skillRows = useMemo(
    () =>
      [...d.skills.values()]
        .map((s) => ({ s, status: now ? skillStatus(s, now) : ('aprendendo' as SkillStatus) }))
        .sort((a, b) => b.s.mastery - a.s.mastery),
    [d, now],
  );
  const mastered = skillRows.filter((r) => r.status === 'dominada').length;
  const completedLevels = useMemo(() => levels.filter((l) => l.modules.length && l.modules.every((m) => d.completedModules.has(m.id))).map((l) => l.number), [d]);
  const g = useMemo(() => gamification(p, { completedLevels, tzOffsetMin: tz }), [p, completedLevels, tz]);
  const kept = useMemo(() => retentionEvidence(p), [p]);
  const tierPct = Math.round(((g.xp - g.tierFloor) / (g.nextTierAt - g.tierFloor)) * 100);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alicerce-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importJson = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error('grande');
      const incoming = sanitizeProgress(JSON.parse(await file.text()));
      replaceProgress(mergeProgress(getProgress(), incoming));
      setMsg('Progresso importado e combinado com o que já estava aqui.');
    } catch {
      setMsg('Não consegui ler esse arquivo. Use um JSON exportado por esta página.');
    }
  };
  const reset = () => {
    if (window.confirm('Apagar todo o progresso salvo neste navegador? Isso não pode ser desfeito. Exporte antes se quiser guardar.')) {
      resetProgress();
      setMsg('Progresso apagado neste navegador.');
    }
  };

  return (
    <div className="container">
      <p className="eyebrow">Progresso · progress</p>
      <h1>Seu progresso</h1>

      <div className="grid" style={{ margin: '1rem 0 2rem' }}>
        <Stat n={now ? streak(activity, now, tz) : 0} label="dias seguidos de estudo" />
        <Stat n={d.completedLessons.size} label={`de ${lessons.length} lições concluídas`} />
        <Stat n={d.solved.size} label={`de ${exercises.length} exercícios resolvidos`} />
        <Stat n={mastered} label={`habilidades dominadas (de ${skillById.size})`} />
      </div>

      <section aria-labelledby="h-xp" style={{ marginBottom: '2rem', maxWidth: '760px' }}>
        <h2 id="h-xp">Experiência e conquistas</h2>
        <p>
          <strong>{g.xp} XP</strong> · patamar {g.tier}{' '}
          <span className="small muted">
            ({g.nextTierAt - g.xp} XP para o patamar {g.tier + 1})
          </span>
        </p>
        <div className="progress" role="progressbar" aria-label={`Progresso até o patamar ${g.tier + 1}`} aria-valuenow={tierPct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${tierPct}%` }} />
        </div>
        <p className="small muted">
          XP vem do que faz você aprender: resolver exercícios (com bônus de 50% quando acerta de primeira sem dica), concluir lições, revisar e avançar em projetos. Ver a solução não rende XP. Cada exercício conta uma vez.
        </p>
        <ul className="badges">
          {g.badges.map((b) => (
            <li key={b.id} className={b.done ? 'done' : undefined}>
              <span className="badge-icon" aria-hidden="true">
                {b.done ? '★' : '☆'}
              </span>
              <span>
                <strong>{b.title}</strong>
                <span className="small muted"> {b.description}</span>
                <span className="small">
                  {' '}
                  {b.done ? 'Conquistada' : `${b.current} de ${b.target}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-mem" style={{ marginBottom: '2rem', maxWidth: '760px' }}>
        <h2 id="h-mem">Memória de longo prazo</h2>
        {kept.retainedSkills.length || kept.cardChecks ? (
          <ul>
            {kept.retainedSkills.length > 0 && (
              <li>
                Você mostrou que ainda domina {kept.retainedSkills.length} {kept.retainedSkills.length === 1 ? 'habilidade' : 'habilidades'} {RETENTION_GAP_DAYS} dias ou mais depois de aprender:{' '}
                {kept.retainedSkills.map((id) => skillById.get(id)?.pt ?? id).join(', ')}.
              </li>
            )}
            {kept.cardChecks > 0 && (
              <li>
                Dos {kept.cardChecks} cartões revistos {RETENTION_GAP_DAYS} dias ou mais depois da primeira revisão, você lembrou {kept.cardRecalls} ({Math.round((kept.cardRecalls / kept.cardChecks) * 100)}%).
              </li>
            )}
          </ul>
        ) : (
          <p className="small muted">
            Aqui aparece o que você ainda sabe {RETENTION_GAP_DAYS} dias depois de aprender: habilidades resolvidas de novo sem ver a solução e cartões lembrados na revisão. É a melhor medida de que o estudo valeu.
          </p>
        )}
      </section>

      <section aria-labelledby="h-act">
        <h2 id="h-act">Atividade nas últimas {WEEKS} semanas</h2>
        <div className="heat" role="img" aria-label={`Você estudou em ${activeDays} dos últimos ${WEEKS * 7} dias.`} style={{ maxWidth: '760px' }}>
          {days.map((x) => (
            <span key={x.key} data-l={x.n === 0 ? undefined : x.n < 4 ? 1 : x.n < 10 ? 2 : 3} title={`${x.key}: ${x.n} atividade(s)`} />
          ))}
        </div>
        <p className="small muted">Cada quadrado é um dia; quanto mais escuro, mais exercícios e revisões. Constância vence maratona.</p>
      </section>

      <section aria-labelledby="h-lv" style={{ marginTop: '2rem' }}>
        <h2 id="h-lv">Por nível</h2>
        <ul className="meter-list" style={{ maxWidth: '760px' }}>
          {levels.map((l) => {
            const v = l.modules.length ? l.modules.reduce((acc, m) => acc + moduleProgress(m, d), 0) / l.modules.length : 0;
            const pct = Math.round(v * 100);
            return (
              <li key={l.id}>
                <Link to={`/nivel/${l.id}`}>
                  Nível {l.number}: {l.title}
                </Link>
                <span className="small muted">{pct}%</span>
                <div className="progress" role="progressbar" aria-label={`Nível ${l.number}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="h-sk" style={{ marginTop: '2rem' }}>
        <h2 id="h-sk">Habilidades</h2>
        {skillRows.length ? (
          <div className="table-wrap">
            <table>
              <caption>Domínio estimado a partir dos seus exercícios. "Revisar" significa que faz tempo que você não pratica.</caption>
              <thead>
                <tr>
                  <th scope="col">Habilidade</th>
                  <th scope="col">Domínio</th>
                  <th scope="col">Evidências</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {skillRows.map(({ s, status }) => (
                  <tr key={s.skill}>
                    <th scope="row">
                      {skillById.get(s.skill)?.pt ?? s.skill}{' '}
                      <span className="small muted" lang="en">
                        {skillById.get(s.skill)?.en}
                      </span>
                    </th>
                    <td>{Math.round(s.mastery * 100)}%</td>
                    <td>{s.evidence}</td>
                    <td>
                      <span className={`badge ${SKILL_BADGE[status]}`}>{SKILL_LABEL[status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">
            Ainda sem dados. Resolva exercícios na <Link to="/trilha">trilha</Link> e o domínio de cada habilidade aparece aqui.
          </p>
        )}
      </section>

      <section aria-labelledby="h-data" style={{ marginTop: '2rem' }} className="card">
        <h2 id="h-data">Seus dados</h2>
        <p>
          O progresso fica salvo neste navegador. {auth.user ? 'Como você está conectado, ele também é sincronizado com sua conta.' : <>Para levar para outro aparelho, <Link to="/conta">crie uma conta</Link> ou exporte o arquivo.</>}
        </p>
        <div className="row">
          <button type="button" className="btn" onClick={exportJson}>
            Exportar JSON
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <button type="button" className="btn danger" onClick={reset}>
            Apagar progresso
          </button>
        </div>
        <p role="status" className="small" style={{ minHeight: '1.2em' }}>
          {msg}
        </p>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card">
      <div className="stat">{n}</div>
      <p className="small" style={{ margin: 0 }}>
        {label}
      </p>
    </div>
  );
}
