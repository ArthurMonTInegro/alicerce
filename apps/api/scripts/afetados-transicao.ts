/**
 * Quem pode ter sido afetado pela troca da promessa de acesso gratuito.
 *
 * Uso:
 *   node apps/api/scripts/afetados-transicao.ts [--banco <arquivo.db>] [--corte AAAA-MM-DD] [--json]
 *   node apps/api/scripts/afetados-transicao.ts --exportar-contatos <arquivo.csv> [--banco …] [--corte …]
 *
 * Lista quantas contas existem, quantas têm atividade nos níveis 2 a 14, desde
 * quando e em que plano, sem mostrar e-mail, nome ou id. O banco é aberto só
 * para leitura (nada é criado nem migrado). Sem --banco, usa DATABASE_PATH ou o
 * padrão do servidor (apps/api/data/alicerce.db).
 *
 * --corte: só conta atividade anterior a essa data (00:00 de Brasília). Sem ela,
 *   usa TRANSICAO_ACESSO.corte; se também estiver vazia, conta toda atividade.
 * --exportar-contatos: grava, num arquivo NOVO (não sobrescreve) com permissão
 *   0600, o e-mail e o nome das contas afetadas, para avisá-las. Os contatos nunca
 *   vão para a tela. Apague o arquivo depois de usar (dados pessoais, LGPD).
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { instanteDoCorte, indiceDeNiveis, TRANSICAO_ACESSO, type IndiceDeNiveis } from '@alicerce/engine';
import { loadConfig } from '../src/config.ts';
import { contatosDosAfetados, contatosEmCsv, indiceDoConteudo, levantarAfetados, type NivelDoConteudo } from '../src/transicao.ts';

const USO = 'Uso: node apps/api/scripts/afetados-transicao.ts [--banco <arquivo.db>] [--corte AAAA-MM-DD] [--json] [--exportar-contatos <arquivo.csv>]';

function opcoes(argv: string[]) {
  const o: { banco?: string; corte?: string; json: boolean; exportar?: string } = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const valor = () => {
      const v = argv[++i];
      if (!v || v.startsWith('--')) sair(2, `Falta o valor de ${a}.\n${USO}`);
      return v;
    };
    if (a === '--banco') o.banco = valor();
    else if (a === '--corte') o.corte = valor();
    else if (a === '--exportar-contatos') o.exportar = valor();
    else if (a === '--json') o.json = true;
    else if (a === '--ajuda' || a === '-h' || a === '--help') sair(0, USO);
    else sair(2, `Opção desconhecida: ${a}\n${USO}`);
  }
  return o;
}

function sair(codigo: number, msg: string): never {
  (codigo === 0 ? console.log : console.error)(msg);
  process.exit(codigo);
}

async function indice(avisos: string[]): Promise<IndiceDeNiveis> {
  try {
    const { levels } = (await import('@alicerce/content')) as unknown as { levels: NivelDoConteudo[] };
    return indiceDoConteudo(levels);
  } catch {
    avisos.push('Pacote de conteúdo indisponível: níveis deduzidos só pelo padrão dos ids.');
    return indiceDeNiveis([]);
  }
}

const o = opcoes(process.argv.slice(2));
const caminho = resolve(o.banco ?? loadConfig().dbPath);
if (!existsSync(caminho)) sair(1, `Banco não encontrado: ${caminho}\nSem banco do servidor não há contas para levantar. A demonstração pública é estática e não tem contas.`);

const textoCorte = o.corte ?? TRANSICAO_ACESSO.corte;
const corte = textoCorte ? instanteDoCorte(textoCorte) : null;
if (textoCorte && corte === null) sair(2, `Data de corte inválida: ${textoCorte}. Use AAAA-MM-DD.`);

let db: DatabaseSync;
try {
  db = new DatabaseSync(caminho, { readOnly: true });
} catch (e) {
  sair(1, `Não consegui abrir o banco só para leitura (${caminho}): ${(e as Error).message}`);
}

const avisosDoIndice: string[] = [];
const idx = await indice(avisosDoIndice);
try {
  if (o.exportar) {
    const destino = resolve(o.exportar);
    const contatos = contatosDosAfetados(db, idx, { corte });
    try {
      writeFileSync(destino, contatosEmCsv(contatos), { flag: 'wx', mode: 0o600 });
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      sair(1, err.code === 'EEXIST' ? `O arquivo ${destino} já existe. Escolha outro nome; nada foi sobrescrito.` : `Não consegui gravar ${destino}: ${err.message}`);
    }
    console.log(`${contatos.length} contato(s) de contas afetadas gravado(s) em ${destino} (permissão 0600).`);
    console.log('São dados pessoais: use só para avisar sobre a mudança e apague o arquivo depois.');
  } else {
    const r = levantarAfetados(db, idx, { corte });
    r.avisos.unshift(...avisosDoIndice);
    if (o.json) console.log(JSON.stringify(r, null, 2));
    else {
      const dia = (t: number | null) => (t === null ? '—' : new Date(t).toISOString().slice(0, 10));
      console.log(`Alicerce · contas afetadas pela transição de acesso · ${new Date(r.geradoEm).toISOString().slice(0, 16)}Z`);
      console.log(`Banco: ${caminho} (aberto só para leitura)`);
      console.log(corte === null ? 'Sem data de corte: conta toda atividade nos níveis 2 a 14.' : `Corte: atividade antes de ${textoCorte} 00:00 (Brasília).`);
      console.log(`\nContas: ${r.contas} · com progresso no servidor: ${r.comProgresso} · com atividade nos níveis 2 a 14: ${r.afetadas}${r.afetadasSoPorVisitas ? ` (${r.afetadasSoPorVisitas} só por visitas, sem data)` : ''}`);
      console.log(`Atividade nos níveis 2 a 14: de ${dia(r.primeiraAtividadePaga)} a ${dia(r.ultimaAtividadePaga)}`);
      for (const [plano, p] of Object.entries(r.porPlano)) console.log(`Plano em vigor ${plano}: ${p.contas} conta(s), ${p.afetadas} afetada(s)`);
      const niveis = Object.entries(r.porNivel).sort(([a], [b]) => Number(a) - Number(b));
      if (niveis.length) console.log(`Por nível: ${niveis.map(([n, c]) => `${n}: ${c}`).join(' · ')}`);
      if (r.contasAfetadas.length) {
        console.log('\n  conta  criada em    plano (gravado → em vigor)         níveis          desde        até          registros');
        for (const c of r.contasAfetadas) {
          const plano = `${c.planoGravado} → ${c.planoEmVigor}${c.planoVenceEm ? ` até ${dia(c.planoVenceEm)}` : ''}`;
          console.log(`  #${String(c.ordem).padEnd(5)} ${dia(c.criadaEm).padEnd(12)} ${plano.padEnd(34)} ${c.niveis.join(',').padEnd(15)} ${dia(c.primeiraEm).padEnd(12)} ${dia(c.ultimaEm).padEnd(12)} ${c.datadas} datado(s), ${c.visitasSemData} visita(s) sem data`);
        }
      }
      for (const a of r.avisos) console.log(`\nAviso: ${a}`);
      console.log('\nE-mails não aparecem aqui. Para avisar as contas afetadas: --exportar-contatos <arquivo.csv>.');
      console.log('Progresso é dado do cliente: serve para avisar, não comprova estudo nem autoriza acesso.');
    }
  }
} finally {
  db.close();
}
