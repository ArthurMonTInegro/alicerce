import { useEffect, useMemo, useState } from 'react';
import { levels, moduleById, skillById } from '../content.ts';
import { activityByDay, exercisesToRedo, gamification, isDue, skillStatus, streak } from '@alicerce/engine';
import { Link } from '../lib/router.tsx';
import { useDerived, useProgress } from '../state/store.ts';
import { nextModules } from '../lib/progress-helpers.ts';

/**
 * "Hoje para você": o próximo passo concreto para quem já começou.
 * Ordem de prioridade pensada para retenção de longo prazo: primeiro o que está
 * para ser esquecido (revisão e habilidades fracas), depois conteúdo novo.
 */
export function PlanoDoDia() {
  const p = useProgress();
  const d = useDerived();
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), [p]);

  const plan = useMemo(() => {
    if (!now) return null;
    const tz = new Date(now).getTimezoneOffset();
    const due = Object.values(p.cards).filter((c) => isDue(c, now)).length;
    const weak = [...d.skills.values()]
      .map((s) => ({ s, st: skillStatus(s, now) }))
      .filter((x) => x.st === 'reforco' || x.st === 'revisar')
      .sort((a, b) => a.s.mastery - b.s.mastery)[0];
    const weakModule = weak ? moduleById.get(skillById.get(weak.s.skill)?.moduleId ?? '') : undefined;
    const redo = exercisesToRedo(p).length;
    const next = nextModules(d, 1)[0];
    const completedLevels = levels.filter((l) => l.modules.length && l.modules.every((m) => d.completedModules.has(m.id))).map((l) => l.number);
    const g = gamification(p, { completedLevels, tzOffsetMin: tz });
    return { due, redo, weak, weakModule, next, g, days: streak(activityByDay(p, tz), now, tz) };
  }, [p, d, now]);

  if (!plan) return null;
  const { due, redo, weak, weakModule, next, g, days } = plan;
  return (
    <section className="card plano" aria-labelledby="h-plano">
      <h2 id="h-plano" style={{ marginTop: 0 }}>
        Hoje para você
      </h2>
      <ol>
        {due > 0 && (
          <li>
            <Link to="/revisao">
              Revisar {due} {due === 1 ? 'cartão' : 'cartões'}
            </Link>{' '}
            <span className="small muted">antes que você esqueça (poucos minutos).</span>
          </li>
        )}
        {redo > 0 && (
          <li>
            <Link to="/revisao#refazer">
              Refazer {redo} {redo === 1 ? 'exercício' : 'exercícios'} sem olhar a solução
            </Link>{' '}
            <span className="small muted">você viu a resposta; agora é fixar.</span>
          </li>
        )}
        {weak && weakModule && (
          <li>
            <Link to={`/modulo/${weakModule.id}`}>Reforçar {skillById.get(weak.s.skill)?.pt.toLowerCase()}</Link>{' '}
            <span className="small muted">{weak.st === 'revisar' ? 'faz tempo que você não pratica.' : 'seus últimos exercícios mostraram dificuldade.'}</span>
          </li>
        )}
        {next && (
          <li>
            <Link to={`/modulo/${next.id}`}>Continuar: {next.title}</Link>
          </li>
        )}
      </ol>
      <p className="small muted" style={{ marginBottom: 0 }}>
        {days > 0 ? `${days} ${days === 1 ? 'dia seguido' : 'dias seguidos'} de estudo · ` : ''}
        {g.xp} XP · patamar {g.tier} · {g.badges.filter((b) => b.done).length} de {g.badges.length} conquistas.{' '}
        <Link to="/progresso">Ver progresso</Link>
      </p>
    </section>
  );
}
