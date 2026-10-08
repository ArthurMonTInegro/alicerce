var e={id:`l6-javascript-dom`,moduleId:`m6-2`,title:`JavaScript e o DOM`,titleEn:`JavaScript and the DOM`,summary:`A linguagem do navegador comparada com Python, o DOM, eventos e programação assíncrona.`,minutes:45,objectives:[`Traduzir conceitos de Python para JavaScript`,`Manipular o DOM e reagir a eventos`,`Entender o event loop, Promises e async/await`,`Evitar armadilhas clássicas (== × ===, this, var)`],skills:[`web-javascript`],terms:[{pt:`DOM`,en:`Document Object Model`,def:`Representação da página como uma árvore de objetos que o JavaScript manipula.`},{pt:`evento`,en:`event`,def:`Algo que acontece: clique, tecla, envio de formulário.`},{pt:`ouvinte de evento`,en:`event listener`,def:`Função chamada quando o evento acontece.`},{pt:`promessa`,en:`Promise`,def:`Objeto que representa um resultado futuro (assíncrono).`},{pt:`assíncrono`,en:`asynchronous`,def:`Que não bloqueia: o programa continua enquanto espera.`},{pt:`laço de eventos`,en:`event loop`,def:`Mecanismo que executa callbacks quando a pilha de chamadas fica vazia.`}],references:[`mdn`,`ecmascript`,`javascript-info`],sections:[{stage:`conceito`,blocks:[{type:`md`,text:`**JavaScript** é a única linguagem que os navegadores executam nativamente. Você já sabe programar: variáveis, condicionais, loops e funções existem aqui também, com outra sintaxe. A novidade é o **{{DOM|DOM}}** (a página como árvore de objetos) e a programação **orientada a eventos** e **assíncrona**.`}]},{stage:`explicacao`,blocks:[{type:`table`,head:[`Python`,`JavaScript`],rows:[[`x = 10`,`let x = 10;  const PI = 3.14;`],[`def soma(a, b): return a + b`,`function soma(a, b) { return a + b; }  ou  const soma = (a, b) => a + b;`],[`if x > 0: ... elif ...: ... else: ...`,`if (x > 0) { ... } else if (...) { ... } else { ... }`],[`for x in xs:`,`for (const x of xs) { ... }`],[`[x * 2 for x in xs if x > 0]`,`xs.filter(x => x > 0).map(x => x * 2)`],[`{"nome": "Ana"}`,`{ nome: "Ana" }`],[`None`,`null e undefined`],[`f"Olá {nome}"`,"`Olá ${nome}`"],[`==`,`=== (sempre!)`]]},{type:`md`,text:`**DOM e eventos**:

\`\`\`
const botao = document.querySelector("#adicionar");
botao.addEventListener("click", () => {
  const li = document.createElement("li");
  li.textContent = "nova tarefa";      // textContent, não innerHTML (XSS!)
  document.querySelector("ul").append(li);
});
\`\`\`

**Assíncrono**: o JavaScript tem **uma** thread principal. Operações lentas (rede, timers) não bloqueiam: você registra o que fazer **quando** terminarem. Com \`async/await\`, o código assíncrono fica legível:

\`\`\`
async function carregar() {
  const resp = await fetch("/api/tarefas");
  if (!resp.ok) throw new Error(\`HTTP \${resp.status}\`);
  return await resp.json();
}
\`\`\``},{type:`callout`,tone:`warn`,text:'`==` faz conversões estranhas (`"0" == 0` é true, `[] == false` é true). Use sempre `===`. E prefira `const`/`let` a `var`.'},{type:`callout`,tone:`deep`,text:'O **event loop**: a pilha de chamadas executa o código síncrono; callbacks prontos esperam em filas. **Microtasks** (Promises) rodam antes de **macrotasks** (setTimeout). Por isso `setTimeout(f, 0)` não executa "imediatamente".',title:`Como o event loop decide a ordem`}]},{stage:`exemplo`,blocks:[{type:`code`,lang:`javascript`,code:`const tarefas = [
  { titulo: "estudar DOM", feita: true },
  { titulo: "praticar fetch", feita: false },
  { titulo: "ler a MDN", feita: false },
];
const pendentes = tarefas.filter(t => !t.feita).map(t => t.titulo);
console.log(pendentes);
console.log(\`\${pendentes.length} de \${tarefas.length} pendentes\`);`,runnable:!0,caption:`Este código roda em um Web Worker isolado; console.log aparece na saída.`}]},{stage:`codigo`,blocks:[{type:`code`,lang:`javascript`,code:`console.log("1 - síncrono");
setTimeout(() => console.log("4 - macrotask (setTimeout)"), 0);
Promise.resolve().then(() => console.log("3 - microtask (Promise)"));
console.log("2 - síncrono");`,runnable:!0,caption:`Execute e confira a ordem: síncrono → microtasks → macrotasks.`}]},{stage:`exercicio`,blocks:[{type:`exercise`,exercise:{id:`e6-js-1`,kind:`predict`,lang:`javascript`,prompt:`O que é impresso (uma linha)?`,difficulty:`facil`,skills:[`web-javascript`],hints:[`filter mantém os que passam no teste; map transforma cada um.`,`Quais números são pares? Depois, multiplique cada um por 10.`],explanation:`filter → [2, 4]; map → [20, 40]; join(",") → "20,40".`,code:`console.log([1, 2, 3, 4].filter(n => n % 2 === 0).map(n => n * 10).join(","));`,answer:`20,40`}},{type:`exercise`,exercise:{id:`e6-js-2`,kind:`predict`,lang:`javascript`,prompt:`Qual a ordem das linhas impressas?`,difficulty:`avancado`,skills:[`web-javascript`],hints:[`Código síncrono primeiro.`,`Promises (microtasks) antes de setTimeout (macrotasks).`],explanation:`A e D são síncronos; C é microtask; B é macrotask.`,code:`console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");`,answer:`A
D
C
B`}},{type:`exercise`,exercise:{id:`e6-js-3`,kind:`mcq`,prompt:`Para mostrar na página um comentário digitado pelo usuário, o que usar?`,difficulty:`intermediario`,skills:[`web-javascript`,`seg-web`],hints:["O que acontece se o comentário contiver `<img src=x onerror=alert(1)>`?"],explanation:"`textContent` insere texto puro. `innerHTML` interpretaria o texto como HTML e permitiria XSS (injeção de script).",options:[{text:`elemento.innerHTML = comentario`,feedback:`Perigoso: interpreta HTML vindo do usuário (XSS).`},{text:`elemento.textContent = comentario`,correct:!0,feedback:`Isso: o conteúdo é tratado como texto.`},{text:`document.write(comentario)`,feedback:`Obsoleto e também interpreta HTML.`},{text:`eval(comentario)`,feedback:`Executaria o texto como código: nunca!`}]}}]},{stage:`desafio`,blocks:[{type:`exercise`,exercise:{id:`e6-js-desafio`,kind:`predict`,lang:`javascript`,prompt:`Um clássico de entrevista. O que é impresso?`,difficulty:`desafio`,skills:[`web-javascript`],hints:["`var` tem escopo de função; `let` tem escopo de bloco (cada iteração ganha sua própria variável).",`Quando os callbacks rodam, qual o valor de i em cada caso?`],explanation:`Com var, há uma única variável i, que vale 3 quando os timeouts rodam: "3 3 3". Com let, cada iteração tem seu j: "0 1 2". Para imprimir em uma linha cada, juntamos ao final.`,code:`const saida = [];
for (var i = 0; i < 3; i++) setTimeout(() => saida.push(i), 0);
for (let j = 0; j < 3; j++) setTimeout(() => saida.push(j), 0);
setTimeout(() => console.log(saida.join(" ")), 0);`,answer:`3 3 3 0 1 2`}}]},{stage:`projeto`,blocks:[{type:`md`,text:"**Projeto 4 — Portfólio (parte 2)**: adicione JavaScript sem frameworks: alternância de tema claro/escuro (lembrando a escolha com localStorage), filtro de projetos por tecnologia e um formulário com validação acessível (mensagens ligadas aos campos com `aria-describedby`)."},{type:`project`,projectId:`p4-portfolio`}]},{stage:`revisao`,blocks:[{type:`md`,text:`- Mesmos conceitos, outra sintaxe: let/const, arrow functions, ===.
- DOM: querySelector, createElement, textContent, addEventListener.
- Assíncrono: Promises, async/await, event loop (micro antes de macro).`}]}],cards:[{id:`l6-javascript-dom#1`,front:`Por que usar === em vez de ==?`,back:`Porque == faz conversões de tipo implícitas e surpreendentes.`},{id:`l6-javascript-dom#2`,front:`textContent × innerHTML?`,back:`textContent insere texto; innerHTML interpreta HTML (risco de XSS com dados do usuário).`},{id:`l6-javascript-dom#3`,front:`O que roda primeiro: Promise.then ou setTimeout(…, 0)?`,back:`Promise.then (microtask) roda antes do setTimeout (macrotask).`}]};export{e as default};
//# sourceMappingURL=l6-javascript-dom-DfsUSVla.js.map