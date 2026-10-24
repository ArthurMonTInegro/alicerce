# Operação

Como fazer backup do banco do servidor, restaurar, voltar a uma versão anterior do servidor e reagir a um incidente.

O servidor guarda tudo num arquivo SQLite (`DATABASE_PATH`; no container, `/data/alicerce.db`): contas, hash das senhas, hash dos tokens de sessão, progresso sincronizado, uso diário do tutor com IA e histórico de planos. O progresso também fica no navegador de cada pessoa; o servidor tem a cópia de quem tem conta.

## Por que copiar o arquivo não basta

O banco roda em modo WAL. Com o servidor no ar, as escritas recentes ficam no arquivo `alicerce.db-wal`, ao lado do `alicerce.db`, e só passam para o `.db` de tempos em tempos (por padrão, quando o `-wal` chega a cerca de 1000 páginas, uns 4 MB). Copiar só o `.db` perde essas escritas: no ensaio automatizado, a cópia ingênua feita com três contas recém-criadas não tem conta nenhuma. Copiar `.db` e `-wal` com `cp` enquanto o servidor escreve também não é seguro, porque os dois arquivos podem ser copiados em momentos diferentes.

`apps/api/scripts/backup.ts` usa `VACUUM INTO`, que gera a cópia dentro de uma transação de leitura: ela enxerga tudo o que já foi confirmado, inclusive o que está só no `-wal`, e não trava o servidor, que continua gravando enquanto a cópia é feita.

Medido no Node 22.22 (SQLite 3.50.4), com outro processo gravando sem parar num banco de 23 MB:

| Método | Resultado |
|---|---|
| `VACUUM INTO` | terminou em cerca de 150 ms; cópia íntegra, num arquivo só, compactado e fora do modo WAL |
| `backup()` de `node:sqlite`, padrão (100 páginas por passo) | não terminou em 5 s: a cópia recomeça a cada escrita de outra conexão |
| `backup()` com `rate: -1` (tudo num passo) | terminou em cerca de 260 ms, mas o arquivo sai marcado como WAL e cria `-wal` e `-shm` ao ser aberto |

## Backup

```bash
npm run backup -w @alicerce/api -- [--manter N] [--dir pasta] [--banco arquivo]
# sem npm (por exemplo, dentro do container):
node --disable-warning=ExperimentalWarning apps/api/scripts/backup.ts [--manter N]
```

- Banco: `DATABASE_PATH` (ou `--banco`). Pasta: `BACKUP_DIR` (ou `--dir`); sem nenhum dos dois, `backups/` ao lado do banco. No container, `/data/backups`, no mesmo volume do banco.
- `npm run backup` e `npm run restore` carregam o `.env` da raiz, como `npm start`: valem o mesmo `DATABASE_PATH` e o mesmo `BACKUP_DIR` do servidor, e um caminho relativo neles é lido a partir de `apps/api`, como no servidor. Rodando com `node` direto, o `.env` não é lido: passe as variáveis no comando (ou `--banco`). Por isso o comando de desfazer que a restauração sugere já vem com `--banco` quando o banco veio de `DATABASE_PATH`.
- Funciona com o servidor rodando ou parado. Não grava nada no banco de origem (com o servidor parado e um `-wal` deixado por uma queda, abrir o banco faz a recuperação normal do SQLite, sem perder transação confirmada).
- Grava primeiro num arquivo temporário (`.alicerce-<pid>-<aleatório>.parcial`), roda `PRAGMA integrity_check` na cópia e só então dá o nome definitivo. Se um backup for interrompido no meio (queda de energia, processo morto), sobra um `.parcial`, que pode ser apagado.
- Nome: `alicerce-AAAA-MM-DDTHH-MM-SSZ.db`, com data e hora em UTC. Nunca sobrescreve: dois backups no mesmo segundo viram `…Z.db` e `…Z-2.db`.
- Ao lado, `alicerce-….db.sha256` no formato do `sha256sum`. Para conferir: `cd /data/backups && sha256sum -c alicerce-….db.sha256`.
- `--manter N` apaga, depois de criar o novo, os backups desta série além dos N mais recentes (junto com o `.sha256` de cada um). Conta arquivos, não dias: com um backup por dia, `--manter 14` guarda 14 dias. Entram na conta também os backups automáticos de antes de migração. Outros arquivos da pasta não são tocados. Sem `--manter`, nada é apagado. Se a retenção não conseguir apagar algum backup antigo, o backup novo continua pronto, e o script diz quais ficaram e sai com código 1.
- O backup nasce legível só pelo dono (`0600`), e a pasta, quando o script a cria, também (`0700`); uma pasta que já existe fica com as permissões que tem. Rode o backup com o mesmo usuário do servidor (no Docker, `docker exec` já usa o usuário `node` da imagem): uma pasta de backups criada pelo root não aceita o backup automático de antes de migração, feito pelo servidor, e ele não sobe.
- Use uma pasta de backups por banco. A série é o nome do arquivo do banco (`alicerce` para `alicerce.db`): dois bancos com o mesmo nome na mesma pasta se misturam, e o `--manter` de um apaga os backups do outro.
- Caminhos relativos em `--dir` e `--banco` valem a partir da pasta de onde você chamou (com `npm run backup`, a pasta de onde o `npm` foi chamado, não `apps/api`).
- Sai com código 0 quando deu certo, 1 quando falhou (com o motivo) e 2 quando os argumentos estão errados.

Saída de um backup de verdade (caminho encurtado):

```
Backup criado: /data/backups/alicerce-2026-10-14T01-34-40Z-2.db
  tamanho:      52 KB (53.248 bytes)
  contas:       3
  esquema:      user_version 3 (este código conhece até o 3)
  integridade:  ok (PRAGMA integrity_check na cópia)
  sha256:       5a8d6d09a09bdc4d64fe613312b7b94857746940bcd6422e4c8017b4979f72f6 (alicerce-2026-10-14T01-34-40Z-2.db.sha256)
  retenção:     mantidos os 2 mais recentes; removidos: alicerce-2026-10-14T01-34-24Z.db
```

### Backup automático antes de migração

Quando o servidor (ou qualquer script que abre o banco, como `metricas.ts` e `plano.ts`) encontra um banco com dados (`user_version` maior que 0, num arquivo) e alguma migração pendente, ele faz um backup na mesma pasta antes de aplicar as migrações, com o nome `alicerce-<data>-antes-da-migracao-v<de>-v<para>.db`. Se esse backup falhar (disco cheio, pasta sem permissão), o servidor não sobe, diz o motivo e não aplica nenhuma migração. Para resolver, libere espaço ou aponte `BACKUP_DIR` para uma pasta com espaço e permissão de escrita.

### Rotina sugerida

- **Frequência**: um backup por dia, e um manual antes de cada deploy (o automático só acontece quando o deploy traz migração). Exemplo de cron no servidor, com o projeto em `/srv/alicerce`:

  ```cron
  17 3 * * * cd /srv/alicerce && DATABASE_PATH=/srv/alicerce/data/alicerce.db node --disable-warning=ExperimentalWarning apps/api/scripts/backup.ts --manter 14 >> /var/log/alicerce-backup.log 2>&1
  ```

  Com Docker, o cron fica no hospedeiro: `docker exec <container> node --disable-warning=ExperimentalWarning apps/api/scripts/backup.ts --manter 14`.
- **Fora da máquina**: a pasta de backups fica no mesmo disco do banco e não protege contra perda do disco, do servidor ou da conta do provedor. Depois de cada backup, copie o `.db` e o `.sha256` para outro lugar: um armazenamento de objetos em outro provedor ou outra região (com versionamento e regra de expiração), ou outra máquina por `rsync` sobre SSH. Cifre antes de enviar (por exemplo, com `age` ou `gpg`), porque o backup contém e-mails, hash das senhas e dos tokens de sessão e o progresso de cada pessoa. Confira o `sha256sum -c` depois de trazer um backup de volta. Nada disso está automatizado no repositório: é configuração do servidor.
- **Retenção**: o prazo ainda não foi decidido (veja Pendências). Enquanto isso, a sugestão técnica é 14 backups diários na máquina (`--manter 14`) e o mesmo prazo, por regra de expiração, fora dela. Os arquivos `.antes-da-restauracao-…` (abaixo) não entram na retenção automática: apague-os à mão quando a restauração estiver confirmada, dentro do mesmo prazo.
- **Teste de restauração**: o ensaio automatizado (`apps/api/test/backup.test.ts`) roda a cada `npm test`, no CI e no build da imagem. Uma vez por mês, restaure de verdade o backup mais recente que está fora da máquina num caminho de teste e confira:

  ```bash
  node --disable-warning=ExperimentalWarning apps/api/scripts/restore.ts <backup.db> --banco /tmp/ensaio/alicerce.db
  DATABASE_PATH=/tmp/ensaio/alicerce.db PORT=3999 npm start   # depois: /api/health e entrar com uma conta de teste
  ```

## Restauração, passo a passo

1. **Escolha o backup**: o mais recente de antes do problema. Se veio de fora da máquina, decifre e ponha o `.db` e o `.sha256` juntos numa pasta.
2. **Pare o servidor** (`systemctl stop …`, `docker stop <container>`). O script recusa trocar um banco em uso.
3. **Restaure**:

   ```bash
   npm run restore -w @alicerce/api -- /caminho/alicerce-AAAA-MM-DDTHH-MM-SSZ.db
   # com Docker, o container do servidor está parado; use um container de uma vez com o mesmo volume:
   docker run --rm -v alicerce-data:/data alicerce node --disable-warning=ExperimentalWarning apps/api/scripts/restore.ts /data/backups/alicerce-AAAA-MM-DDTHH-MM-SSZ.db
   ```

   O script, nesta ordem:
   - recusa `DATABASE_PATH` (ou `--banco`) que seja link simbólico ou pasta: o `-wal` e o `-shm` ficam ao lado do arquivo real, e trocar o link deixaria os dois para trás. Use o caminho real;
   - confere o sha256 do backup com o `.sha256` ao lado (sem `.sha256`, recusa);
   - copia o backup para a pasta do banco, confere de novo o sha256 da cópia, roda `PRAGMA integrity_check` nela e confere o `user_version`: recusa backup de esquema mais novo que o do código (restaure com o código da versão que gerou o backup) e arquivo que não é banco do Alicerce (`user_version` 0). Até aqui o banco atual não foi tocado: um backup recusado não muda nada nele;
   - confere se o banco está em uso, tentando um bloqueio exclusivo sem esperar (toda conexão aberta no modo WAL segura um bloqueio compartilhado no arquivo). Se um `-wal` ficou de uma queda e ninguém está com o banco aberto, essa verificação faz a recuperação normal do SQLite: o conteúdo do `-wal` entra no `.db` e nenhuma transação confirmada se perde;
   - dá à cópia o mesmo modo e o mesmo dono do banco que ela substitui. Só o root troca o dono: restaurar como root um banco do usuário do servidor deixa o arquivo com o usuário do servidor. Com outro usuário, se o dono for diferente, o resumo avisa (`ATENÇÃO`) para ajustar com `chown` antes de iniciar o servidor;
   - guarda o banco atual, com `-wal` e `-shm` se existirem, como `alicerce.db.antes-da-restauracao-<data>` (e `…-wal`, `…-shm`), e só então põe a cópia no lugar. Se algo falhar no meio, devolve os arquivos ao lugar.

   Os backups são legíveis só pelo dono: rode a restauração com o mesmo usuário que fez o backup (ou como root). Se a restauração for interrompida no meio, pode sobrar na pasta do banco um `.alicerce.db.restaurando-…`, que pode ser apagado.
4. **Leia o resumo**: de onde veio, sha256, integridade, esquema, número de contas, onde ficou o banco anterior e o comando para desfazer.
5. **Inicie o servidor.** Se o backup é de um esquema mais antigo que o do código, as migrações são aplicadas na inicialização, com backup automático antes.
6. **Depois de restaurar**, tudo o que foi gravado no servidor depois do backup se perdeu nele:
   - **contas excluídas depois do backup voltam a existir.** Exclua-as de novo (veja "SQL à mão", abaixo; o `ON DELETE CASCADE` leva sessões, progresso, uso do tutor e histórico de planos). Hoje não há registro das exclusões para reaplicar sozinho (veja Pendências);
   - contas criadas depois do backup não existem: a pessoa precisa se cadastrar de novo. O navegador guarda o progresso por perfil (`alicerce:progresso:v2:user:<id da conta>`, em `apps/web/src/state/store.ts`), e a conta nova tem outro id: o progresso da conta perdida continua no navegador, mas não aparece na conta nova nem como visitante, e hoje a interface não tem como trazê-lo de volta;
   - para quem tem conta no banco restaurado, o id é o mesmo: o progresso que está no navegador volta ao servidor na próxima sincronização (que envia o progresso local e o mescla com o do servidor, comportamento atual de `syncNow`). Quem tinha entrado depois do backup aparece como desconectado, porque a sessão não existe no banco restaurado; ao entrar de novo, a sincronização acontece. Um reinício de progresso feito depois do backup continua valendo: o reinício mais recente vence a mesclagem;
   - mudanças de plano feitas depois do backup se perdem: quem passou a Premium depois do backup volta a ter só o que o plano gratuito libera até o plano ser reaplicado. O banco guardado tem o histórico (`SELECT * FROM plan_changes WHERE at > <hora do backup em ms>`, aberto com `readOnly: true`); reaplique as cortesias com `node apps/api/scripts/plano.ts`. Eventos de pagamento recebidos depois do backup também se perderam: peça ao provedor que os reenvie (cada id vale uma vez só) e confira com `node apps/api/scripts/acesso.ts` (ver "Investigar uma divergência" em [PAGAMENTO.md](PAGAMENTO.md));
   - sessões encerradas depois do backup voltam a valer para quem ainda tem o cookie. Se o incidente envolve segurança, apague todas (`DELETE FROM sessions`): todo mundo entra de novo.

**SQL à mão**: o programa `sqlite3` pode não estar instalado (o Dockerfile não instala); use o SQLite do próprio Node. Ligue `foreign_keys` em toda conexão que apaga, senão o `ON DELETE CASCADE` não roda e sobram sessões e progresso da conta:

```bash
node --disable-warning=ExperimentalWarning -e '
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(process.env.DATABASE_PATH);
db.exec("PRAGMA foreign_keys = ON");
console.log(db.prepare("DELETE FROM users WHERE email = ?").run(process.argv[1]));
' pessoa@exemplo.com
```

**Desfazer**: restaurar é reversível. O banco anterior fica guardado, e o resumo da restauração mostra o comando:

```bash
node --disable-warning=ExperimentalWarning apps/api/scripts/restore.ts --desfazer /data/alicerce.db.antes-da-restauracao-AAAA-MM-DDTHH-MM-SSZ
```

Desfazer faz o mesmo caminho (integridade, versão, verificação de uso, dono e modo), lê também o `-wal` guardado (e o `-journal`, se houver, para desfazer uma transação que ficou pela metade), e guarda o banco que estava no lugar como outro `.antes-da-restauracao-…`. O arquivo guardado não é apagado nem alterado: nada some sem alguém apagar à mão. Como o banco guardado não tem `.sha256`, `--desfazer` só aceita um arquivo com o nome de banco guardado deste banco (`alicerce.db.antes-da-restauracao-…`); qualquer outro arquivo precisa ser um backup com `.sha256`.

**`--mesmo-em-uso`** pula a verificação de uso. Use só quando ela der um falso positivo, ou quando o banco atual estiver tão danificado que nem abre (o script avisa "não deu para confirmar que … não está em uso"). Se o servidor estiver de fato rodando, ele continua gravando no banco guardado, não no restaurado, até ser reiniciado. Reinicie-o antes de qualquer `--desfazer`: a verificação de uso olha o banco no lugar, não o guardado, e copiar um banco em que o servidor ainda grava pode perder o que estiver no `-wal`. A verificação depende das travas de arquivo do SQLite, que não são confiáveis em sistemas de arquivos de rede (NFS, SMB): nesse caso ela pode dizer que o banco está livre quando não está. Pare sempre o servidor antes.

## Voltar a uma versão anterior do servidor

- **Imagem**: antes de cada deploy, guarde a imagem que está no ar com outra etiqueta (`docker tag alicerce:atual alicerce:anterior`), ou gere de novo a partir do commit anterior (`git checkout <commit> && docker build -t alicerce .`). Voltar é parar o container novo e subir o anterior com o mesmo volume.
- **Sem código no servidor além do repositório**: `git checkout <commit-anterior>`, `npm ci`, `npm run build` e reinicie.
- **Migrações só andam para frente.** Não há migração de volta. O que acontece com o banco depende de a versão nova ter trazido migração:
  - **não trouxe** (o `user_version` não mudou): volte o código, e o banco serve como está;
  - **trouxe** (o `user_version` passou de A para B): o código antigo conhece só até A. Hoje `openDb` não recusa um banco mais novo que o código: o código antigo sobe e usa só as tabelas e colunas que conhece. Isso funciona quando as migrações novas só acrescentaram (tabela nova, coluna com `DEFAULT`) e quebra quando mudaram algo que o código antigo usa (coluna `NOT NULL` sem `DEFAULT`, renomeação, remoção). O caminho seguro é restaurar, com o código antigo, o backup automático `alicerce-…-antes-da-migracao-vA-vB.db`, ao custo de perder o que foi gravado depois da migração. Um backup feito depois da migração tem esquema B, e o `restore.ts` do código antigo o recusa, de propósito.
- Para que voltar de versão seja barato, escreva migrações que só acrescentam, e faça mudanças destrutivas (remover ou renomear coluna) em duas versões: primeiro o código para de usar, depois a migração remove.

## Resposta a incidente (roteiro curto)

1. **Conter**: se dados estão sendo corrompidos, apagados ou expostos, pare o servidor (ou tire-o do ar no proxy). Não apague nada da máquina.
2. **Preservar**: antes de qualquer conserto, faça um backup (`backup.ts`) e copie também os arquivos crus (`alicerce.db`, `-wal`, `-shm`) e os logs para uma pasta separada. Se o backup falhar na integridade, isso já é um diagnóstico: o banco atual está danificado.
3. **Entender**: o que aconteceu, desde quando, quais dados e quantas contas foram atingidos. Os logs do Fastify (JSON na saída padrão) têm as requisições.
4. **Decidir o conserto**:
   - banco danificado ou dados perdidos: restaure o último backup bom (acima) e trate a lista do passo 6;
   - deploy com defeito: volte a versão do servidor (acima);
   - chave ou conta comprometida: troque `ANTHROPIC_API_KEY` no provedor, apague as sessões (`DELETE FROM sessions`) e, se houver suspeita de vazamento das senhas, peça troca de senha.
5. **Comunicar**: incidente de segurança com dados pessoais que possa causar risco ou dano relevante às pessoas precisa ser comunicado à ANPD e às pessoas atingidas (LGPD, art. 48; o regulamento da ANPD, Resolução CD/ANPD nº 15/2024, fixa prazo de três dias úteis; confira o texto vigente). Quem decide e assina a comunicação é quem responde pelo projeto.
6. **Verificar**: `/api/health`, entrar com uma conta de teste, sincronizar progresso, `node apps/api/scripts/metricas.ts` com números plausíveis. Faça um backup novo logo depois.
7. **Registrar**: linha do tempo, causa, o que se perdeu, o que mudou para não repetir.

## E-mail

O servidor manda e-mail para a recuperação de senha e para os avisos da assinatura ([PAGAMENTO.md](PAGAMENTO.md), "E-mails da assinatura"). Na partida, o log diz qual fornecedor está ligado: `e-mail: Resend`, `arquivo, só para testes` ou `nenhum fornecedor` (então a recuperação de senha responde 503 e os avisos esperam na fila).

**Fornecedor recomendado: Resend**, pela documentação oficial lida em 24/10/2026 ([enviar](https://resend.com/docs/api-reference/emails/send-email), [idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys), [erros](https://resend.com/docs/api-reference/errors), [limites](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [preços](https://resend.com/pricing)). O envio é um `POST` com `fetch`, sem dependência nova; a chave de idempotência evita e-mail repetido quando uma tentativa é refeita; o plano gratuito não tem mensalidade: 3.000 e-mails por mês, 100 por dia (a cota volta à meia-noite UTC) e 3 domínios. Acima de 100 por dia, os avisos esperam na fila e a recuperação de senha falha até a cota voltar. Nada foi contratado nem enviado: o `ResendMailer` (`apps/api/src/email.ts`) foi testado só contra um fetch que responde como a documentação (`apps/api/test/email.test.ts`).

O que falta, e é do Arthur:

1. Criar a conta no Resend e uma chave só de envio (a documentação descreve chaves restritas ao envio).
2. **Um domínio próprio**, verificado no Resend com os registros DNS que o painel mostra. Sem domínio, o Resend só entrega para o e-mail da própria conta (erro 403 para qualquer outro): serve para testar, não para contas de verdade. Hoje o Alicerce não tem domínio (a demonstração está no github.io). Um `.com.br` custa R$ 40,00 por ano no [Registro.br](https://registro.br/dominio/) (24/10/2026): é custo e depende da autorização dele. O piloto na demonstração estática não precisa de e-mail, porque lá não há contas.
3. No ambiente do servidor (nunca no repositório nem na conversa): `EMAIL_PROVEDOR=resend`, `RESEND_API_KEY`, `EMAIL_REMETENTE` (`Alicerce <nao-responda@dominio>`) e, se quiser, `EMAIL_RESPONDER_PARA`.

Travas: o servidor não sobe com `EMAIL_PROVEDOR` desconhecido, sem a chave, com um remetente que não é endereço, ou em produção com o remetente de teste do `resend.dev`.

Primeiro envio de verdade (preparado, não feito):

1. Num servidor de teste com as variáveis e o remetente `onboarding@resend.dev`, pedir "Esqueci a senha" para o e-mail da própria conta do Resend.
2. Conferir que o e-mail chegou, que o link abre `/conta/redefinir` e troca a senha, e que o envio aparece nos logs do painel do Resend. No log do servidor não deve aparecer o link nem o endereço.
3. Com o domínio verificado, repetir para outro endereço e, no sandbox do Asaas, assinar para ver a confirmação da compra chegar.

No log, sem destinatário nem texto: `falha ao enviar o e-mail de recuperação` (com `email.erro`, o código do Resend), `e-mails da assinatura com falha no envio` (contagem por código) e, como erro, `e-mails da assinatura que não serão mais tentados` depois da 7ª tentativa (o aviso fica em `email_outbox`, com `last_error`, para reenviar à mão).

## Limitações conhecidas

- Os backups ficam no mesmo disco do banco até alguém copiá-los para fora. Agendamento, cópia externa e cifragem não estão automatizados no repositório.
- `--manter` conta arquivos, não dias; o prazo real depende da frequência do cron.
- A verificação de banco em uso depende das travas de arquivo do SQLite e não é confiável em sistemas de arquivos de rede.
- Restaurar não reaplica exclusões de conta feitas depois do backup.
- `VACUUM INTO` segura uma transação de leitura durante a cópia; nesse intervalo o `-wal` não é esvaziado e pode crescer. Com o tamanho atual do banco, a cópia leva milissegundos.
- Backup e restauração precisam de espaço livre: o backup, mais ou menos o tamanho do banco; a restauração, uma cópia do backup na pasta do banco.
- A restauração só consegue manter o dono do banco quando roda como root. Com outro usuário, ela avisa quando o dono muda, mas não corrige.
- Testado com Node 22.22 direto (testes automatizados e ensaio manual dos comandos). Os comandos com Docker deste documento não foram executados: não havia daemon Docker no ambiente em que isto foi escrito.

## Pendências para decisão do Arthur

1. **Prazo de retenção dos backups**: na máquina, fora dela, dos backups automáticos de antes de migração e dos bancos guardados por restauração (`.antes-da-restauracao-…`). O prazo é quanto tempo uma conta excluída continua existindo em cópias de segurança. Sugestão técnica, ainda não decidida: 14 dias.
2. **Texto da página de privacidade** (`apps/web/src/pages/Privacidade.tsx`) e da exclusão em `Conta.tsx`: já dizem que excluir a conta apaga os dados do banco em uso na hora e que as cópias de segurança feitas antes ainda os guardam até serem descartadas. Falta o prazo (item 1) e dizer o que acontece se um backup anterior à exclusão for restaurado (a conta volta a existir até ser excluída de novo; veja o item 3).
3. **Registro de exclusões para reaplicar depois de uma restauração** (por exemplo, guardar só o id da conta excluída e a data, sem e-mail), para que restaurar não traga de volta, nem por um instante, contas que pediram exclusão.
4. **Código antigo diante de banco mais novo**: hoje o servidor sobe mesmo quando o `user_version` do banco é maior que o que ele conhece. Recusar evita rodar com esquema desconhecido, mas tira o caminho rápido de voltar de versão quando a migração só acrescentou.
