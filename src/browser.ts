import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright';

export interface BrowserRuntime {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
}

export async function launchBrowser(
  viewport: { width: number; height: number },
): Promise<BrowserRuntime> {
  const browser = await chromium.launch({
    args: ['--force-device-scale-factor=1', '--disable-lcd-text'],
  });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  return { browser, context, page, cdp };
}
