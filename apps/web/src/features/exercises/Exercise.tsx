import type { Exercise as Ex } from '@alicerce/content';
import { Mcq } from './Mcq.tsx';
import { Predict } from './Predict.tsx';
import { CodeEx } from './CodeEx.tsx';
import { Parsons } from './Parsons.tsx';
import { Fill } from './Fill.tsx';
import { Sql } from './Sql.tsx';

export function Exercise({ ex, lessonId }: { ex: Ex; lessonId?: string | undefined }) {
  switch (ex.kind) {
    case 'mcq':
      return <Mcq ex={ex} lessonId={lessonId} />;
    case 'predict':
      return <Predict ex={ex} lessonId={lessonId} />;
    case 'code':
    case 'fix':
      return <CodeEx ex={ex} lessonId={lessonId} />;
    case 'parsons':
      return <Parsons ex={ex} lessonId={lessonId} />;
    case 'fill':
      return <Fill ex={ex} lessonId={lessonId} />;
    case 'sql':
      return <Sql ex={ex} lessonId={lessonId} />;
  }
}
