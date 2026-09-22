import { promises as fs } from 'node:fs';
import { catalogMediaGc } from './media-gc';
import { publicProviderFromDescriptor } from './cli';

export async function runMediaGcCli(env: NodeJS.ProcessEnv = process.env, args: string[] = process.argv.slice(2)): Promise<void> {
  if (args.some((arg) => arg !== '--apply') || args.filter((arg) => arg === '--apply').length > 1) throw new Error('CATALOG_GC_ARGUMENTS');
  const directory = env.MLINO_PUBLIC_EXPORT_DIR;
  const descriptor = env.MLINO_EXPORT_KEYSTORE_PATH;
  if (!directory || !descriptor) throw new Error('CATALOG_GC_CONFIG');
  const provider = publicProviderFromDescriptor(JSON.parse(await fs.readFile(descriptor, 'utf8')));
  const list = await catalogMediaGc(directory, provider, { apply: args.includes('--apply'),
    onCandidate: (item) => process.stdout.write(`${JSON.stringify({ code: 'CATALOG_GC_CANDIDATE', path: item })}\n`) });
  process.stdout.write(`${JSON.stringify({ code: args.includes('--apply') ? 'CATALOG_GC_APPLIED' : 'CATALOG_GC_DRY_RUN', count: list.length })}\n`);
}
if (require.main === module) runMediaGcCli().catch(() => { process.stderr.write('CATALOG_GC_FAILED\n'); process.exitCode = 1; });
