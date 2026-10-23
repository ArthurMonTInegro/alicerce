import { buildApp } from './app.ts';
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

// Conciliação com o provedor de pagamento: recupera webhooks perdidos (conciliacao.ts).
const conciliar = async () => {
  try {
    const r = await app.rotinas.conciliar();
    if (r && (r.corrigidas.length || r.divergencias.length || r.falhas.length)) app.log.warn({ conciliacao: r }, 'conciliação com o provedor de pagamento');
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
    (r) => r.falhas && app.log.warn({ emails: r }, 'e-mails da assinatura com falha no envio'),
    (e) => app.log.error({ err: e }, 'falha ao enviar os e-mails da fila'),
  );
void enviar();
setInterval(enviar, 60_000).unref();
