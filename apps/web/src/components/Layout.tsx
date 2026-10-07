import { useEffect, useState, type ReactNode } from 'react';
import { isDue } from '@alicerce/engine';
import { Link, useLocation } from '../lib/router.tsx';
import { useAuth, useProgress } from '../state/store.ts';
import { openTutor, useTutor } from '../features/tutor/context.ts';
import { TutorPanel } from '../features/tutor/TutorPanel.tsx';

function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="21" width="22" height="5" rx="1" fill="#c9c8c1" />
      <rect x="7" y="14.5" width="8.5" height="5.5" rx="1" fill="#a9bb72" />
      <rect x="16.5" y="14.5" width="8.5" height="5.5" rx="1" fill="#a9bb72" />
      <rect x="11.75" y="8" width="8.5" height="5.5" rx="1" fill="#e3c16a" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === 'dark' || t === 'light' ? t : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('alicerce:tema', next);
    } catch {
      /* ignora */
    }
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} title="Alternar tema">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { path } = useLocation();
  const [menu, setMenu] = useState(false);
  const progress = useProgress();
  const { user } = useAuth();
  const { open } = useTutor();
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), [progress]);
  useEffect(() => setMenu(false), [path]);
  const due = now ? Object.values(progress.cards).filter((c) => isDue(c, now)).length : 0;
  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo" activeExact aria-label="Alicerce, página inicial">
            <Logo />
            Alicerce
          </Link>
          <button type="button" className="icon-btn menu-toggle" aria-expanded={menu} aria-controls="nav-principal" onClick={() => setMenu((m) => !m)}>
            ☰ <span className="sr-only">Menu</span>
          </button>
          <nav id="nav-principal" className={`nav${menu ? ' open' : ''}`} aria-label="Principal">
            <Link to="/trilha">Trilha</Link>
            <Link to="/revisao">
              Revisão
              {due > 0 && (
                <span className="badge count" aria-label={`${due} cartões para revisar`}>
                  {due}
                </span>
              )}
            </Link>
            <Link to="/laboratorio">Laboratório</Link>
            <Link to="/projetos">Projetos</Link>
            <Link to="/carreira">Carreira</Link>
            <Link to="/glossario">Glossário</Link>
            <Link to="/progresso">Progresso</Link>
          </nav>
          <div className="header-tools">
            <ThemeToggle />
            <Link to="/conta" className="icon-btn" aria-label={user ? `Conta de ${user.name || user.email}` : 'Entrar ou criar conta'} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              {user ? '👤' : 'Entrar'}
            </Link>
          </div>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <nav aria-label="Rodapé">
            <Link to="/metodologia">Metodologia</Link>
            <Link to="/diagnostico">Diagnóstico</Link>
            <Link to="/visualizacoes">Visualizações</Link>
            <Link to="/referencias">Referências</Link>
            <Link to="/sobre">Por que a Alicerce</Link>
            <Link to="/planos">Planos</Link>
            <Link to="/privacidade">Privacidade</Link>
          </nav>
          <p>Alicerce — formação em computação, do zero ao avançado. Conteúdo original, com referências públicas citadas em cada módulo. Seu progresso fica no seu navegador; a conta é opcional.</p>
        </div>
      </footer>
      {!open && (
        <button type="button" className="btn accent tutor-fab" onClick={() => openTutor()}>
          💬 Tutor
        </button>
      )}
      <TutorPanel />
    </>
  );
}
