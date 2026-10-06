# Segurança

Modelo de ameaças resumido: a plataforma executa código escrito por estudantes, guarda contas e chama uma API paga. Os riscos principais são código do estudante escapando do isolamento, roubo de sessão, abuso de login, abuso de custo do tutor e entrada maliciosa no progresso sincronizado.

## Execução de código do estudante

- **Nada roda no servidor.** Python, JavaScript e SQL rodam no navegador de quem escreveu o código. O servidor nunca executa código enviado.
- Python roda no Pyodide dentro de um Web Worker, sem acesso ao DOM. Um laço infinito é interrompido encerrando o worker.
- JavaScript roda num worker separado. Ele precisa de `new Function`, então só a resposta desse arquivo (`/assets/js.worker-*.js`) recebe `'unsafe-eval'` na CSP; a página continua sem `eval`. O worker não enxerga cookies HttpOnly, o DOM ou o `localStorage` da página.
- O link de compartilhamento do laboratório guarda o código no fragmento (`#`) da URL, que nunca vai ao servidor, e abrir um link compartilhado não executa nada até a pessoa clicar em executar.

## Cabeçalhos

Toda resposta leva (`apps/api/src/security.ts`):

- `Content-Security-Policy`: `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `connect-src 'self'`. Não há script inline: o script de tema vive em `/theme.js`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy` e `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` desligando câmera, microfone, localização, pagamento e USB.
- `Strict-Transport-Security` em produção.
- `Cache-Control: no-store` em toda a `/api`.

## Contas e sessões

- Senhas com scrypt (N=32768, r=8, p=1) e sal aleatório por usuário; comparação em tempo constante.
- Regra de senha no estilo NIST 800-63B: mínimo de 10 e máximo de 200 caracteres, sem exigir símbolos.
- Login com e-mail inexistente também calcula um hash (de uma senha fictícia), para que o tempo de resposta não revele quais e-mails têm conta.
- Mensagem de erro de login genérica.
- Sessão: token aleatório de 256 bits, guardado no banco apenas como SHA-256. Cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção, validade de 30 dias. Sessões vencidas são apagadas a cada login.
- Excluir a conta apaga usuário, sessões, progresso e uso do tutor (cascata).

## CSRF

Toda requisição que muda estado exige o cabeçalho `x-alicerce: 1`. Formulários de outro site não conseguem enviar cabeçalhos personalizados sem passar por CORS, e o servidor não habilita CORS. Isso se soma ao `SameSite=Lax`.

## Limites de uso

| Alvo | Limite |
|---|---|
| Toda a `/api` | 600 requisições por minuto por IP |
| Login e cadastro | 10 por 15 minutos por IP e, separadamente, por e-mail |
| Tutor | 12 por minuto por IP |
| Tutor com IA | só para contas, 60 perguntas por dia por conta (configurável) |

Corpos de requisição têm no máximo 1 MB.

## Progresso sincronizado

O documento de progresso vem do navegador e é tratado como entrada hostil (`packages/engine/src/progress.ts`, `sanitizeProgress`): só campos conhecidos são copiados, chaves como `__proto__`, `constructor` e `prototype` são descartadas, números são limitados à faixa válida e listas e mapas têm tamanho máximo.

## Tutor com IA

- A chave fica só no servidor, em variável de ambiente.
- A solução oficial do exercício nunca é enviada ao modelo.
- O código e o erro do estudante vão delimitados por tags, como dados; as regras pedagógicas ficam no prompt de sistema, que o estudante não controla.
- Qualquer erro, recusa ou estouro do limite cai no tutor offline, sem expor detalhes do erro.

## Privacidade

Sem conta, nada sai do navegador além das perguntas ao tutor offline (que não guarda nada). Com conta, o servidor guarda e-mail, nome opcional, hash da senha e o progresso. Não há rastreadores, anúncios ou scripts de terceiros. Detalhes em `/privacidade`.

## Pontos conhecidos

- `style-src 'unsafe-inline'` existe porque alguns componentes usam `style={...}` do React. O risco é baixo (não há injeção de HTML), mas o ideal é remover.
- O limitador de requisições é em memória: vale para uma instância. Com várias réplicas, precisa de um armazenamento compartilhado.
- `TRUST_PROXY` só deve ser ligado atrás de um proxy conhecido; ligado sem proxy, o IP usado nos limites pode ser falsificado.
