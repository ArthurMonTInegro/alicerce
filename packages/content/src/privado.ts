/**
 * Localiza e carrega o conteúdo pago (níveis 2 a 14), que vive num repositório
 * privado separado. Só roda em Node (ferramentas e servidor); nunca entra no
 * build do site.
 *
 * Onde fica o diretório privado, em ordem:
 *   1. ALICERCE_PREMIUM_DIR (caminho absoluto ou relativo ao diretório atual;
 *      vazio ou "0" desliga);
 *   2. <raiz do repositório>/premium, se existir (está no .gitignore).
 * ALICERCE_EXIGIR_PREMIUM=1 transforma a ausência em erro (CI do repositório
 * privado, servidor de produção).
 *
 * Os arquivos do repositório privado importam apenas '@alicerce/content/autoria'.
 * Quando o diretório está fora desta árvore, um gancho de resolução do Node
 * aponta esse import para este pacote (no Vitest, o alias em vitest.config.ts).
 *
 * Este módulo não importa o currículo: o script de separação o usa enquanto os
 * arquivos do currículo estão sendo reescritos.
 */
import { existsSync, realpathSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canAccessLevel } from '@alicerce/engine';
import type { TheoryExpansion } from './theory-types.ts';
import type { AutonomyQuestion, Level } from './types.ts';

export const PREMIUM_ENV = 'ALICERCE_PREMIUM_DIR';
export const REQUIRE_PREMIUM_ENV = 'ALICERCE_EXIGIR_PREMIUM';
/** Raiz do repositório público (este arquivo está em packages/content/src). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DEFAULT_PREMIUM_DIR = join(REPO_ROOT, 'premium');
/** Arquivo de entrada do repositório privado. */
export const PREMIUM_ENTRY = join('src', 'index.ts');
/** Versão do contrato entre os dois repositórios (o privado exporta FORMATO). */
export const PREMIUM_FORMAT = 1;

export function resolvePremiumDir(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string | null {
  const raw = env[PREMIUM_ENV];
  if (raw !== undefined) {
    const v = raw.trim();
    if (v === '' || v === '0') return null;
    return isAbsolute(v) ? v : resolve(cwd, v);
  }
  return existsSync(join(DEFAULT_PREMIUM_DIR, PREMIUM_ENTRY)) ? DEFAULT_PREMIUM_DIR : null;
}

export const premiumRequired = (env: NodeJS.ProcessEnv = process.env) => ['1', 'true', 'sim'].includes((env[REQUIRE_PREMIUM_ENV] ?? '').trim().toLowerCase());

/* ---------- resolução de '@alicerce/*' para arquivos fora desta árvore ---------- */

const hookedDirs = new Set<string>();
let hookInstalled = false;
const rootParent = pathToFileURL(join(REPO_ROOT, 'package.json')).href;

/**
 * Faz imports '@alicerce/...' de arquivos dentro de `dir` serem resolvidos como
 * se viessem da raiz deste repositório. Sem efeito para quem já está na árvore.
 */
export function allowAlicerceImportsFrom(dir: string) {
  // O Node identifica módulos pelo caminho real: um diretório acessado por link
  // simbólico (ex.: /mnt/project-files -> /mnt/attach/...) chega com o caminho real.
  const real = (p: string) => (existsSync(p) ? realpathSync(p) : p);
  const root = pathToFileURL(real(REPO_ROOT) + sep).href;
  for (const p of new Set([resolve(dir), real(resolve(dir))])) {
    const url = pathToFileURL(p + sep).href;
    if (!url.startsWith(root)) hookedDirs.add(url);
  }
  if (!hookedDirs.size || hookInstalled) return;
  hookInstalled = true;
  registerHooks({
    resolve(specifier, context, next) {
      const parent = context.parentURL;
      if (specifier.startsWith('@alicerce/') && parent && [...hookedDirs].some((d) => parent.startsWith(d))) {
        return next(specifier, { ...context, parentURL: rootParent });
      }
      return next(specifier, context);
    },
  });
}

/* ---------- carga e validação ---------- */

export class PremiumLoadError extends Error {}

/** Fontes cruas que o privado também exporta (opcional): o verificador de vazamento as usa para classificar amostras. */
export interface PaidSources {
  aprofundamento?: TheoryExpansion[];
  autonomia?: Record<string, AutonomyQuestion[]>;
}

/** Carrega o módulo de entrada do diretório privado e confere a forma do que veio. */
export async function loadPaidModule(dir: string): Promise<{ levels: Level[]; fontes: PaidSources }> {
  const entry = join(dir, PREMIUM_ENTRY);
  if (!existsSync(entry) || !statSync(entry).isFile()) throw new PremiumLoadError(`Diretório privado sem ${PREMIUM_ENTRY}: ${dir}`);
  allowAlicerceImportsFrom(dir);
  let mod: { levels?: unknown; FORMATO?: unknown; fontes?: unknown };
  try {
    mod = (await import(pathToFileURL(entry).href)) as typeof mod;
  } catch (e) {
    throw new PremiumLoadError(`Falha ao carregar ${entry}: ${(e as Error).message}`);
  }
  if (mod.FORMATO !== PREMIUM_FORMAT) throw new PremiumLoadError(`Formato do repositório privado não suportado (FORMATO=${String(mod.FORMATO)}; esperado ${PREMIUM_FORMAT}).`);
  if (!Array.isArray(mod.levels)) throw new PremiumLoadError('O repositório privado precisa exportar `levels: Level[]`.');
  const levels = mod.levels as Level[];
  for (const l of levels) {
    if (!l || typeof l.number !== 'number' || !Array.isArray(l.modules)) throw new PremiumLoadError('Nível malformado no repositório privado.');
    if (canAccessLevel('free', l.number)) throw new PremiumLoadError(`O nível ${l.number} é gratuito e deve ficar no repositório público.`);
  }
  return { levels, fontes: mod.fontes && typeof mod.fontes === 'object' ? (mod.fontes as PaidSources) : {} };
}

/** Carrega os níveis pagos do diretório privado. */
export async function loadPaidLevels(dir: string): Promise<Level[]> {
  return (await loadPaidModule(dir)).levels;
}
