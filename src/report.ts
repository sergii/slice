import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resultsSchema } from './schema.js';
import type { SliceResults } from './types.js';

export async function writeResults(
  outDir: string,
  results: SliceResults,
): Promise<string> {
  const validated = resultsSchema.parse(results);
  await mkdir(outDir, { recursive: true });

  const outputPath = path.join(outDir, 'results.json');
  await writeFile(outputPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');

  return outputPath;
}
