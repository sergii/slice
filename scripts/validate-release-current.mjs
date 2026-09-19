import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
const args = ['scripts/validate-release.mjs'];

if (version.includes('-')) {
  args.push(`v${version}`);
}

const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  child.once('error', reject);
  child.once('close', (value) => resolve(value ?? 1));
});

process.exitCode = code;
