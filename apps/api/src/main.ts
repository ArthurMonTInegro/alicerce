import { buildApp } from './app.ts';
import { ReconcileAlerts } from './conciliacao.ts';
import { loadConfig } from './config.ts';
import { loadContentStore } from './conteudo.ts';
import { openDb } from './db.ts';

const config = loadConfig();
const db = openDb(config.dbPath);
const { store: content, warnings } = await loadContentStore(config.premiumDir);
const app = await buildApp({ config, db, content, logger: true });
app.log.info(`conteúdo: ${content.description}`);
for (const w of warnings) app.log.warn(w);

const shutdown = async () => {
  await app.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.port, host: config.host });
app.log.info(`tutor: ${config.anthropicApiKey ? `IA (${config.tutorModel})` : 'offline'}`);
app.log.info(`e-mail: ${config.resend ? 'Resend' : config.emailLogPath ? 'arquivo, só para testes' : 'nenhum fornecedor (cadastro e recuperação de senha desligados, avisos esperam na fila)'}`);
app.log.info(`links do cadastro e da senha: ${config.linkSecret ? 'chave LINKS_SEGREDO do ambiente' : 'chave temporária deste processo (sem LINKS_SEGREDO; a fila não sobrevive a um reinício)'}`);

// Conciliação com o provedor de pagamento: recupera webhooks perdidos (conciliacao.ts). O que
// precisa de alguém sai como aviso uma vez por caso a cada 24 h; o esperado, só no resumo.
const alertas = new ReconcileAlerts();
const conciliar = async () => {
  try {
    const r = await app.rotinas.conciliar();
    if (r) for (const l of alertas.lines(r)) app.log[l.nivel]({ conciliacao: l.contexto }, l.mensagem);
  } catch (e) {
    app.log.error({ err: e }, 'falha na conciliação com o provedor de pagamento');
  }
};
if (app.pagamentos && config.reconcileMinutes > 0) {
  void conciliar();
  setInterval(conciliar, config.reconcileMinutes * 60_000).unref();
}

// E-mails da assinatura que ficaram na fila (fornecedor fora do ar, servidor reiniciado): avisos.ts.
const enviar = () =>
  app.rotinas.enviarEmails().then(
    (r) => {
      if (r.falhas) app.log.warn({ emails: r }, 'e-mails da assinatura com falha no envio');
      if (r.esgotados) app.log.error({ emails: { esgotados: r.esgotados, erros: r.erros } }, 'e-mails da assinatura que não serão mais tentados: ver email_outbox (last_error) e reenviar à mão');
    },
    (e) => app.log.error({ err: e }, 'falha ao enviar os e-mails da fila'),
  );
void enviar();
setInterval(enviar, 60_000).unref();

// E-mails com link (cadastro e troca de senha) que esperam na fila: links.ts. O pedido já dispara
// um envio; aqui ficam as novas tentativas e o que sobrou de antes de o servidor reiniciar. A rodada
// registra no log o que falhou (só contagens e códigos).
const enviarLinks = () => app.rotinas.enviarLinks().catch((e) => app.log.error({ err: { tipo: (e as Error)?.name ?? '?' } }, 'falha ao enviar os e-mails com link'));
void enviarLinks();
setInterval(enviarLinks, 15_000).unref();

// Pedidos de cadastro cujo link venceu (auth.ts, SIGNUP_MINUTES): saem do banco em até 10 minutos,
// com as linhas da fila dos links terminadas há mais de 24 h (links.ts).
setInterval(() => {
  try {
    app.rotinas.limparCadastros();
  } catch (e) {
    app.log.error({ err: e }, 'falha ao apagar os pedidos de cadastro vencidos');
  }
}, 10 * 60_000).unref();
