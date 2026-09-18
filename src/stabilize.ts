import type { BrowserContext, Page } from 'playwright';

const STABILIZE_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
`;

export async function installStabilization(context: BrowserContext): Promise<void> {
  await context.addInitScript(({ css }) => {
    const install = () => {
      if (document.getElementById('__slice_stabilize')) return;

      const style = document.createElement('style');
      style.id = '__slice_stabilize';
      style.textContent = css;
      (document.head ?? document.documentElement).appendChild(style);
    };

    if (document.documentElement) {
      install();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      install();
      observer.disconnect();
    });

    observer.observe(document, { childList: true, subtree: true });
  }, { css: STABILIZE_CSS });
}

export async function stabilizeViewport(
  page: Page,
  width: number,
  height: number,
  waitMs: number,
): Promise<void> {
  await page.setViewportSize({ width, height });

  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}
