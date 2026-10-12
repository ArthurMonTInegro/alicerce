export interface TheoryExpansion {
  level: number;
  lessonId: string;
  title: string;
  prerequisite: string;
  objective: string;
  explanation: string;
  worked: string;
  misconception: string;
  question: string;
  feedback: string;
  extension: string;
  sources: string[];
  table?: { head: string[]; rows: string[][]; caption: string };
}
