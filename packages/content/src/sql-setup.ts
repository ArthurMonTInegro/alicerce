/** Banco de exemplo (escola) usado nos exercícios de SQL e no laboratório. */
import { dedent } from './helpers.ts';

export const SETUP_ESCOLA = dedent(`
  CREATE TABLE alunos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, curso TEXT, ano INTEGER);
  CREATE TABLE disciplinas (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, creditos INTEGER);
  CREATE TABLE matriculas (aluno_id INTEGER REFERENCES alunos(id), disciplina_id INTEGER REFERENCES disciplinas(id), nota REAL);
  INSERT INTO alunos VALUES (1,'Ana','CC',2), (2,'Bia','SI',1), (3,'Caio','CC',3), (4,'Davi','ADS',1), (5,'Eva','CC',1);
  INSERT INTO disciplinas VALUES (1,'Algoritmos',6), (2,'Banco de Dados',4), (3,'Redes',4), (4,'Cálculo',6);
  INSERT INTO matriculas VALUES (1,1,9.0), (1,2,8.5), (2,2,7.0), (3,1,6.0), (3,3,8.0), (4,2,5.5), (1,4,7.5);
`);
