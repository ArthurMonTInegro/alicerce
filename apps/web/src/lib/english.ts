export interface Mission {id:string;level:string;title:string;goal:string;grammar:string;dialogue:{speaker:string;en:string;pt:string}[];question:{prompt:string;options:string[];answer:number;explanation:string};prompts:string[];models:string[];transfer:string}
export const missions: Mission[] = [
  {
    "id": "hello",
    "level": "A1",
    "title": "Apresentar-se",
    "goal": "Dizer quem sou, o que estudo e fazer uma pergunta.",
    "grammar": "Use I am para identidade e I am learning para o que está aprendendo agora.",
    "dialogue": [
      {
        "speaker": "Alex",
        "en": "Hi! I am Alex. I am learning Python.",
        "pt": "Oi! Sou Alex. Estou aprendendo Python."
      },
      {
        "speaker": "Sam",
        "en": "Nice to meet you. What do you want to build?",
        "pt": "Prazer. O que você quer construir?"
      },
      {
        "speaker": "Alex",
        "en": "I want to build a study app. What about you?",
        "pt": "Quero construir um aplicativo de estudos. E você?"
      },
      {
        "speaker": "Sam",
        "en": "I want to build a website for my shop.",
        "pt": "Quero construir um site para minha loja."
      }
    ],
    "question": {
      "prompt": "O que Alex quer construir?",
      "options": [
        "Um jogo",
        "Um aplicativo de estudos",
        "Uma loja"
      ],
      "answer": 1,
      "explanation": "Alex diz “a study app”."
    },
    "prompts": [
      "Hi! Tell me your name and what you are learning.",
      "What would you like to build, and why?"
    ],
    "models": [
      "Hi! I am Jo. I am learning JavaScript.",
      "I want to build a recipe app because I enjoy cooking. What about you?"
    ],
    "transfer": "Apresente-se a alguém de uma comunidade de estudos. Troque a linguagem e o projeto; termine com uma pergunta."
  },
  {
    "id": "clarify",
    "level": "A1",
    "title": "Pedir esclarecimento",
    "goal": "Pedir repetição e confirmar o que entendi.",
    "grammar": "Could you…? torna um pedido educado. Do you mean…? confirma uma interpretação.",
    "dialogue": [
      {
        "speaker": "Sam",
        "en": "Please open the terminal.",
        "pt": "Por favor, abra o terminal."
      },
      {
        "speaker": "Alex",
        "en": "Sorry, could you say that again, please?",
        "pt": "Desculpe, poderia repetir, por favor?"
      },
      {
        "speaker": "Sam",
        "en": "Open the terminal, then type the command.",
        "pt": "Abra o terminal e depois digite o comando."
      },
      {
        "speaker": "Alex",
        "en": "Do you mean I should type it here?",
        "pt": "Você quer dizer que devo digitar aqui?"
      },
      {
        "speaker": "Sam",
        "en": "Yes, that is right.",
        "pt": "Sim, isso mesmo."
      }
    ],
    "question": {
      "prompt": "O que Alex faz quando não entende?",
      "options": [
        "Finge que entendeu",
        "Encerra a conversa",
        "Pede repetição e confirma"
      ],
      "answer": 2,
      "explanation": "Alex pede para repetir e verifica onde digitar."
    },
    "prompts": [
      "Please run the script in the terminal.",
      "I mean the terminal inside your editor. Is that clear?"
    ],
    "models": [
      "Could you repeat that more slowly, please?",
      "Do you mean the terminal in my code editor?"
    ],
    "transfer": "Alguém explica como chegar a um lugar. Peça para repetir e confirme a direção com suas palavras."
  },
  {
    "id": "routine",
    "level": "A2",
    "title": "Conversar sobre rotina",
    "goal": "Explicar minha rotina e combinar um horário.",
    "grammar": "Use presente simples para hábitos: I study. Use can para disponibilidade: I can meet.",
    "dialogue": [
      {
        "speaker": "Alex",
        "en": "I study after work, usually at seven.",
        "pt": "Estudo depois do trabalho, geralmente às sete."
      },
      {
        "speaker": "Sam",
        "en": "How often do you practise?",
        "pt": "Com que frequência você pratica?"
      },
      {
        "speaker": "Alex",
        "en": "Three times a week. Can we practise together on Friday?",
        "pt": "Três vezes por semana. Podemos praticar juntos na sexta?"
      },
      {
        "speaker": "Sam",
        "en": "Yes, but only after eight.",
        "pt": "Sim, mas só depois das oito."
      }
    ],
    "question": {
      "prompt": "Quando Sam pode praticar na sexta?",
      "options": [
        "Depois das oito",
        "Antes das sete",
        "A qualquer hora"
      ],
      "answer": 0,
      "explanation": "Sam limita a disponibilidade: “only after eight”."
    },
    "prompts": [
      "When do you usually study?",
      "I cannot meet at that time. Can you suggest another time?"
    ],
    "models": [
      "I usually study in the evening, three times a week.",
      "How about Saturday at ten in the morning?"
    ],
    "transfer": "Combine uma conversa de 15 minutos. Informe dia, horário e fuso, e ofereça uma alternativa."
  },
  {
    "id": "code",
    "level": "A2",
    "title": "Explicar uma função",
    "goal": "Descrever entrada, transformação e resultado.",
    "grammar": "Use it + verbo com s: it takes, it adds, it returns. First e then organizam uma explicação.",
    "dialogue": [
      {
        "speaker": "Sam",
        "en": "What does this function do?",
        "pt": "O que esta função faz?"
      },
      {
        "speaker": "Alex",
        "en": "It takes two prices and adds them.",
        "pt": "Ela recebe dois preços e os soma."
      },
      {
        "speaker": "Sam",
        "en": "Does it include delivery?",
        "pt": "Ela inclui a entrega?"
      },
      {
        "speaker": "Alex",
        "en": "No. It returns the total before delivery.",
        "pt": "Não. Ela retorna o total antes da entrega."
      }
    ],
    "question": {
      "prompt": "O total inclui entrega?",
      "options": [
        "Sim, sempre",
        "Não",
        "Só aos sábados"
      ],
      "answer": 1,
      "explanation": "Alex especifica “before delivery”."
    },
    "prompts": [
      "What does your function do?",
      "Can you give me an example with real values?"
    ],
    "models": [
      "It takes two numbers and returns their sum.",
      "For example, if the inputs are two and three, it returns five."
    ],
    "transfer": "Escolha uma função que você escreveu no laboratório. Explique-a sem ler o código, com um exemplo de entrada e saída."
  },
  {
    "id": "help",
    "level": "A2",
    "title": "Pedir ajuda com um erro",
    "goal": "Relatar o esperado, o ocorrido e o que tentei.",
    "grammar": "Use I expected para a expectativa, but para o contraste e I tried para a tentativa anterior.",
    "dialogue": [
      {
        "speaker": "Alex",
        "en": "I expected the button to save my note, but nothing happened.",
        "pt": "Esperava que o botão salvasse minha nota, mas nada aconteceu."
      },
      {
        "speaker": "Sam",
        "en": "What have you tried?",
        "pt": "O que você já tentou?"
      },
      {
        "speaker": "Alex",
        "en": "I checked the click handler. The console shows an error.",
        "pt": "Conferi o manipulador de clique. O console mostra um erro."
      },
      {
        "speaker": "Sam",
        "en": "Could you share the error message?",
        "pt": "Poderia compartilhar a mensagem de erro?"
      }
    ],
    "question": {
      "prompt": "Que informação Sam pede?",
      "options": [
        "A senha",
        "O preço do app",
        "A mensagem de erro"
      ],
      "answer": 2,
      "explanation": "Sam pede a mensagem de erro para investigar."
    },
    "prompts": [
      "What went wrong, and what did you expect?",
      "What have you tried? What information can you share?"
    ],
    "models": [
      "I expected the page to load, but it stayed blank.",
      "I checked the console. It says the file was not found. Could you help me check the path?"
    ],
    "transfer": "Escreva um pedido de ajuda sobre um erro real: contexto, passos, esperado, ocorrido e tentativa. Remova dados pessoais e segredos antes de compartilhar."
  },
  {
    "id": "standup",
    "level": "B1",
    "title": "Atualizar o progresso",
    "goal": "Comunicar o que fiz, o próximo passo e um impedimento.",
    "grammar": "Diferencie passado (I fixed), plano (I will test) e necessidade atual (I need help).",
    "dialogue": [
      {
        "speaker": "Sam",
        "en": "How is the project going?",
        "pt": "Como está o projeto?"
      },
      {
        "speaker": "Alex",
        "en": "Yesterday I fixed the login form. Today I will test it on mobile.",
        "pt": "Ontem corrigi o formulário de login. Hoje vou testá-lo no celular."
      },
      {
        "speaker": "Sam",
        "en": "Is anything blocking you?",
        "pt": "Alguma coisa está impedindo seu avanço?"
      },
      {
        "speaker": "Alex",
        "en": "Yes. I need a test account before I can check the full flow.",
        "pt": "Sim. Preciso de uma conta de teste antes de verificar o fluxo completo."
      }
    ],
    "question": {
      "prompt": "O que impede Alex de verificar o fluxo completo?",
      "options": [
        "Falta uma conta de teste",
        "Não há celular",
        "O formulário foi apagado"
      ],
      "answer": 0,
      "explanation": "A dependência declarada é uma conta de teste."
    },
    "prompts": [
      "What did you finish, and what will you do next?",
      "Is there a blocker? What help do you need?"
    ],
    "models": [
      "I added a search field. Next, I will test it with longer names.",
      "I need example data. Could you send a small test file?"
    ],
    "transfer": "Faça uma atualização de 45 segundos sobre seu estudo ou projeto real, incluindo um pedido concreto de ajuda, se houver."
  },
  {
    "id": "demo",
    "level": "B1",
    "title": "Apresentar um projeto",
    "goal": "Explicar problema, solução e limitação, e pedir feedback.",
    "grammar": "Use because para motivos, however para limites e could para pedir sugestões.",
    "dialogue": [
      {
        "speaker": "Alex",
        "en": "My app helps learners plan short study sessions.",
        "pt": "Meu app ajuda estudantes a planejar sessões curtas de estudo."
      },
      {
        "speaker": "Sam",
        "en": "Why did you choose local storage?",
        "pt": "Por que você escolheu armazenamento local?"
      },
      {
        "speaker": "Alex",
        "en": "Because it works without an account. However, progress does not sync between devices.",
        "pt": "Porque funciona sem conta. Porém, o progresso não sincroniza entre dispositivos."
      },
      {
        "speaker": "Sam",
        "en": "Could you add an export option?",
        "pt": "Você poderia adicionar uma opção de exportação?"
      }
    ],
    "question": {
      "prompt": "Qual limitação Alex reconhece?",
      "options": [
        "O app exige uma conta",
        "O progresso não sincroniza entre aparelhos",
        "O app não permite estudar"
      ],
      "answer": 1,
      "explanation": "Alex apresenta a vantagem e a limitação da escolha."
    },
    "prompts": [
      "Who is your project for, and what problem does it solve?",
      "What is one limitation? What feedback would help you?"
    ],
    "models": [
      "It helps self-taught learners organise their practice.",
      "It does not sync yet. Could you tell me whether the export button is easy to find?"
    ],
    "transfer": "Demonstre seu próprio projeto por 60–90 segundos. Explique uma escolha e faça uma pergunta específica ao público."
  },
  {
    "id": "choices",
    "level": "B1",
    "title": "Discutir uma alternativa",
    "goal": "Discordar com respeito, justificar e propor um teste.",
    "grammar": "I see your point reconhece a ideia. What if…? propõe uma hipótese. We could… apresenta uma opção.",
    "dialogue": [
      {
        "speaker": "Sam",
        "en": "Let us add all the features this week.",
        "pt": "Vamos adicionar todas as funcionalidades esta semana."
      },
      {
        "speaker": "Alex",
        "en": "I see your point, but we may not have time to test them.",
        "pt": "Entendo seu ponto, mas talvez não tenhamos tempo de testá-las."
      },
      {
        "speaker": "Sam",
        "en": "What would you suggest?",
        "pt": "O que você sugere?"
      },
      {
        "speaker": "Alex",
        "en": "We could start with search and test it with three users.",
        "pt": "Podemos começar pela busca e testá-la com três usuários."
      }
    ],
    "question": {
      "prompt": "O que Alex propõe?",
      "options": [
        "Cancelar o projeto",
        "Adicionar tudo sem testar",
        "Começar pela busca e testar"
      ],
      "answer": 2,
      "explanation": "Alex sugere reduzir o escopo e testar com usuários."
    },
    "prompts": [
      "I think we should add five new features today. What do you think?",
      "How could we test your suggestion before committing to it?"
    ],
    "models": [
      "I see your point, but I am worried about testing time. Could we start with one feature?",
      "We could build a small version and ask three people to try it."
    ],
    "transfer": "Escolha duas soluções de um problema real. Defenda uma, reconheça uma vantagem da outra e proponha uma forma de comparar resultados."
  }
];
export interface Practice {responses:string[];checks:boolean[];completedAt?:number}
export type EnglishPortfolio = Record<string,Practice>;
export function parsePortfolio(raw:string|null):EnglishPortfolio {
 const out:EnglishPortfolio={};
 try {const data:unknown=JSON.parse(raw??'{}'); if(!data||typeof data!=='object')return out;
 for(const m of missions){const value=(data as Record<string,unknown>)[m.id];if(!value||typeof value!=='object')continue;const v=value as Partial<Practice>;
 out[m.id]={responses:m.prompts.map((_,i)=>typeof v.responses?.[i]==='string'?v.responses[i]!.slice(0,2000):''),checks:[0,1,2].map(i=>v.checks?.[i]===true),...(typeof v.completedAt==='number'&&Number.isFinite(v.completedAt)&&v.completedAt>0&&v.completedAt<=Date.now()?{completedAt:v.completedAt}:{})};}
 }catch{/* Invalid or outdated local drafts must not break the course. */}return out;
}
export function canComplete(p:Practice,comprehension:boolean){return comprehension&&p.responses.length===2&&p.responses.every(s=>s.trim().length>0)&&p.checks.length===3&&p.checks.every(Boolean);}
