/**
 * Pesquisa que fundamenta a plataforma: currículos nacionais, universidades e
 * evidências de aprendizagem. Cada URL foi aberta durante a pesquisa; quando
 * só um texto secundário confiável foi encontrado (caso de Japão e Coreia),
 * isso está dito na nota. Nada aqui é cópia de curso: registramos o que cada
 * fonte ensina sobre ESCOPO, SEQUÊNCIA ou MÉTODO e como isso virou decisão.
 */

export interface ResearchSource {
  id: string;
  /** país ou organização */
  where: string;
  title: string;
  url: string;
  /** o que observamos na fonte */
  finding: string;
  /** decisão concreta que tomamos por causa dela */
  decision: string;
}

export interface EvidenceSource {
  id: string;
  principle: string;
  principleEn: string;
  citation: string;
  url: string;
  finding: string;
  /** onde o princípio aparece na plataforma */
  inPlatform: string;
}

export const countryCurricula: ResearchSource[] = [
  {
    id: 'uk-national',
    where: 'Reino Unido (Inglaterra)',
    title: 'National curriculum in England: computing programmes of study',
    url: 'https://www.gov.uk/government/publications/national-curriculum-in-england-computing-programmes-of-study',
    finding: 'Computação é obrigatória dos 5 aos 16 anos, com três eixos: ciência da computação, tecnologia da informação e letramento digital. Algoritmos e depuração aparecem antes de qualquer linguagem textual.',
    decision: 'O Nível 0 começa por representação, algoritmos e depuração mental, e só depois o Nível 2 introduz sintaxe.',
  },
  {
    id: 'uk-primm',
    where: 'Reino Unido (NCCE)',
    title: 'Pedagogy Quick Read: PRIMM',
    url: 'https://static.teachcomputing.org/pedagogy/QR11-PRIMM.pdf',
    finding: 'O centro nacional de ensino de computação recomenda Predict, Run, Investigate, Modify, Make: ler e prever código antes de escrevê-lo.',
    decision: 'Exercícios do tipo "prever a saída" vêm antes dos de escrever código em cada lição.',
  },
  {
    id: 'de-gi',
    where: 'Alemanha',
    title: 'Bildungsstandards Informatik (Gesellschaft für Informatik)',
    url: 'https://dl.gi.de/items/49972e1c-f954-4e4b-a60b-1dc924d730cf/full',
    finding: 'Os padrões da sociedade alemã de informática separam áreas de conteúdo (dados, algoritmos, linguagens, sistemas, sociedade) de áreas de processo (modelar, argumentar, comunicar).',
    decision: 'Cada lição tem objetivos de conteúdo e também de processo (explicar, justificar, modelar), cobrados nos exercícios abertos e nas entrevistas.',
  },
  {
    id: 'fr-nsi',
    where: 'França',
    title: 'Programme de numérique et sciences informatiques de première générale (eduscol)',
    url: 'https://eduscol.education.fr/document/30007/download',
    finding: 'A especialidade NSI do ensino médio francês ensina Python, representação de dados, arquitetura, redes e algoritmos em um mesmo ano, deixando recursão e bancos de dados para o ano seguinte.',
    decision: 'Confirmou Python como primeira linguagem e a ordem representação → algoritmos → estruturas → recursão → bancos de dados.',
  },
  {
    id: 'au-dt',
    where: 'Austrália',
    title: 'Digital Technologies Hub (currículo australiano de tecnologias digitais)',
    url: 'https://www.digitaltechnologieshub.edu.au/',
    finding: 'O currículo australiano trata pensamento computacional e sistemas digitais como progressão contínua da escola básica ao ensino médio.',
    decision: 'A árvore de habilidades é uma progressão única, sem "trilhas separadas" para iniciante e avançado: o diagnóstico só escolhe o ponto de entrada.',
  },
  {
    id: 'sg-seab',
    where: 'Singapura',
    title: 'GCE O-Level Computing Syllabus 7155 (SEAB)',
    url: 'https://www.seab.gov.sg/files/O%20Lvl%20Syllabus%20Sch%20Cddts/2025/7155_y25_sy.pdf',
    finding: 'O exame nacional cobra programação em Python, testes, lógica booleana, redes e ética, com ênfase em projetar e testar soluções.',
    decision: 'Todo exercício de código tem testes automáticos visíveis, e o Nível 1 inclui portas lógicas e tabelas-verdade.',
  },
  {
    id: 'kr-sw',
    where: 'Coreia do Sul',
    title: 'Software education to be compulsory in schools in Korea (British Council)',
    url: 'https://opportunities-insight.britishcouncil.org/short-articles/news/software-education-be-compulsory-schools-korea',
    finding: 'Relato secundário (não encontramos o documento oficial do ministério em inglês): educação em software tornou-se obrigatória no ensino fundamental e médio.',
    decision: 'Reforçou o público-alvo: a plataforma precisa funcionar para quem nunca programou, a partir do Nível 0.',
  },
  {
    id: 'jp-prog',
    where: 'Japão',
    title: 'Japan Education Reform Updates (U.S. International Trade Administration)',
    url: 'https://www.trade.gov/market-intelligence/japan-education-reform-updates',
    finding: 'Relato secundário: desde 2020 a educação em programação é obrigatória no ensino fundamental japonês. Não verificamos o texto do MEXT diretamente.',
    decision: 'Mesmo efeito: começar pelo raciocínio (sequência, repetição, condição) antes da sintaxe.',
  },
];

export const universityPrograms: ResearchSource[] = [
  {
    id: 'cam',
    where: 'University of Cambridge',
    title: 'Department of Computer Science and Technology: Teaching',
    url: 'https://www.cst.cam.ac.uk/teaching',
    finding: 'O primeiro ano combina programação (inclusive funcional), matemática discreta, algoritmos e hardware digital.',
    decision: 'Matemática (Nível 14) é pré-requisito parcial de Algoritmos, e não um bloco isolado no fim.',
  },
  {
    id: 'ox',
    where: 'University of Oxford',
    title: 'Department of Computer Science: Courses',
    url: 'https://www.cs.ox.ac.uk/teaching/courses/',
    finding: 'Programação funcional, provas e modelagem formal aparecem cedo, ao lado de estruturas de dados.',
    decision: 'O Nível 1 (lógica) inclui argumentar corretude com invariantes simples.',
  },
  {
    id: 'eth',
    where: 'ETH Zürich',
    title: 'Bachelor in Computer Science',
    url: 'https://inf.ethz.ch/studies/bachelor.html',
    finding: 'Bacharelado com base sólida em matemática, algoritmos, sistemas e engenharia de software antes das especializações.',
    decision: 'A trilha cobre sistemas operacionais e redes (Níveis 8 e 9) como base, não como opcionais.',
  },
  {
    id: 'gatech',
    where: 'Georgia Tech',
    title: 'Online Master of Science in Computer Science (OMSCS)',
    url: 'https://omscs.gatech.edu/',
    finding: 'Mostra que uma formação rigorosa em computação pode ser oferecida online, em escala, com projetos avaliados.',
    decision: 'Projetos com marcos e critérios de aceitação explícitos, pensados para estudo autônomo.',
  },
  {
    id: 'waterloo',
    where: 'University of Waterloo',
    title: 'First-year Computer Science students',
    url: 'https://cs.uwaterloo.ca/current-undergraduate-students/majors/first-year-students',
    finding: 'O primeiro ano separa caminhos por experiência prévia, sem baixar o nível de exigência.',
    decision: 'O diagnóstico inicial escolhe o ponto de partida e dispensa módulos, mas o conteúdo é o mesmo para todos.',
  },
];

/** IDs de `references` que vêm de universidades norte-americanas e já aparecem nas lições. */
export const usUniversityRefs = ['cs50', 'mit-6100l', 'missing-semester', 'mit-6006', 'mit-6042', 'mit-1806', 'cs61a', 'stanford-cs161', 'stanford-cs144', 'stanford-cs229', 'cmu-15112', 'cmu-15213', 'cmu-15445', 'harvard-stat110', 'waterloo-cs135'];

export const learningEvidence: EvidenceSource[] = [
  {
    id: 'retrieval',
    principle: 'Prática de recuperação',
    principleEn: 'Retrieval practice',
    citation: 'Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning. Psychological Science, 17(3).',
    url: 'https://doi.org/10.1111/j.1467-9280.2006.01693.x',
    finding: 'Testar-se fixa mais do que reler o mesmo material pelo mesmo tempo.',
    inPlatform: 'Exercícios em toda lição, cartões de recuperação e revisão que pede a resposta antes de mostrá-la.',
  },
  {
    id: 'spacing',
    principle: 'Prática espaçada',
    principleEn: 'Spaced practice',
    citation: 'Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks. Psychological Bulletin, 132(3).',
    url: 'https://doi.org/10.1037/0033-2909.132.3.354',
    finding: 'Distribuir revisões no tempo produz retenção maior que concentrá-las.',
    inPlatform: 'Agendamento FSRS dos cartões e desafios de retenção para habilidades que estão enfraquecendo.',
  },
  {
    id: 'interleaving',
    principle: 'Intercalação',
    principleEn: 'Interleaving',
    citation: 'Rohrer, D. & Taylor, K. (2007). The shuffling of mathematics problems improves learning. Instructional Science, 35.',
    url: 'https://doi.org/10.1007/s11251-007-9015-8',
    finding: 'Misturar tipos de problema obriga a escolher a estratégia, e isso melhora o desempenho posterior.',
    inPlatform: 'A fila de revisão mistura cartões de lições diferentes; os desafios de retenção misturam habilidades.',
  },
  {
    id: 'cognitive-load',
    principle: 'Carga cognitiva e exemplos resolvidos',
    principleEn: 'Cognitive load and worked examples',
    citation: 'Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2).',
    url: 'https://doi.org/10.1207/s15516709cog1202_4',
    finding: 'Iniciantes aprendem mais estudando exemplos resolvidos do que resolvendo problemas abertos cedo demais.',
    inPlatform: 'As etapas Exemplo e Código vêm antes de Exercício; dicas graduais reduzem a carga sem entregar a resposta.',
  },
  {
    id: 'parsons',
    principle: 'Problemas de Parsons',
    principleEn: 'Parsons problems',
    citation: "Parsons, D. & Haden, P. (2006). Parson's programming puzzles: a fun and effective learning tool for first programming courses. ACE 2006, CRPIT 52.",
    url: 'https://crpit.scem.westernsydney.edu.au/abstracts/CRPITV52Parsons.html',
    finding: 'Ordenar linhas de código isola a lógica da sintaxe e dá retorno imediato.',
    inPlatform: 'Exercícios de ordenar linhas, operáveis por teclado e por arrastar.',
  },
  {
    id: 'mastery',
    principle: 'Aprendizagem para o domínio',
    principleEn: 'Mastery learning',
    citation: 'Bloom, B. S. (1984). The 2 Sigma Problem. Educational Researcher, 13(6).',
    url: 'https://doi.org/10.3102/0013189X013006004',
    finding: 'Tutoria individual com correção até o domínio eleva muito o desempenho médio.',
    inPlatform: 'Domínio por habilidade (limiar de 80% com evidência mínima), pré-requisitos na árvore e tutor socrático.',
  },
  {
    id: 'primm',
    principle: 'PRIMM',
    principleEn: 'Predict, Run, Investigate, Modify, Make',
    citation: 'Sentance, S., Waite, J. & Kallia, M. (2019). Teaching computer programming with PRIMM: a sociocultural perspective. Computer Science Education, 29(2-3).',
    url: 'https://static.teachcomputing.org/pedagogy/QR11-PRIMM.pdf',
    finding: 'Prever e investigar código existente antes de escrever o próprio reduz a frustração inicial.',
    inPlatform: 'Exercícios de prever a saída, rastreador passo a passo e botão "abrir no laboratório" para modificar exemplos.',
  },
  {
    id: 'fsrs',
    principle: 'Agendamento FSRS',
    principleEn: 'Free Spaced Repetition Scheduler',
    citation: 'Open Spaced Repetition. FSRS: The Algorithm.',
    url: 'https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm',
    finding: 'Modelo de memória com estabilidade e dificuldade por cartão que estima a probabilidade de lembrar.',
    inPlatform: 'Implementação própria do FSRS-4.5 no pacote engine, com testes.',
  },
];
