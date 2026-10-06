import type { Term } from '@alicerce/content';
import { SpeakButton } from './Speak.tsx';

export function TermList({ terms }: { terms: Term[] }) {
  return (
    <ul className="terms-list" aria-label="Termos técnicos: português e inglês">
      {terms.map((t) => (
        <li key={t.en}>
          <div className="term-pair">
            <span className="pt">{t.pt}</span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="en" lang="en">
              {t.en}
            </span>
            <SpeakButton text={t.en} />
          </div>
          <p className="term-def">{t.def}</p>
          {t.example && (
            <p className="term-ex" lang="en">
              “{t.example}”
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
