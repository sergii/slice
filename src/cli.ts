import { Command } from 'commander';

const program = new Command();

program
  .name('slice')
  .description('Deterministic responsive QA for coding agents')
  .argument('<url>', 'page URL to inspect')
  .action((url: string) => {
    process.stdout.write(`${url}\n`);
  });

program.parse();
