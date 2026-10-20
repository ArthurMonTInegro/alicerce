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
