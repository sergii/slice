import { Command } from 'commander';
import { launchBrowser } from './browser.js';
import { installStabilization, stabilizeViewport } from './stabilize.js';

const program = new Command();

program
  .name('slice')
  .description('Deterministic responsive QA for coding agents')
  .argument('<url>', 'page URL to inspect')
  .action(async (url: string) => {
    const runtime = await launchBrowser({ width: 1280, height: 900 });

    try {
      await installStabilization(runtime.context);
      await runtime.page.goto(url, { timeout: 30_000 });
      await stabilizeViewport(runtime.page, 1280, 900, 300);
      process.stdout.write(`${url}\n`);
    } finally {
      await runtime.browser.close();
    }
  });

await program.parseAsync();
