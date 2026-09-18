import { describe, expect, it } from 'vitest';
import { buildStableSelector } from '../src/selector.js';
import type { LayoutNode } from '../src/types.js';

function node(index: number, parentIndex: number, overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    index,
    parentIndex,
    tagName: 'DIV',
    attributes: {},
    rect: { x: 0, y: 0, width: 100, height: 20 },
    styles: {},
    paintOrder: index,
    isVisible: true,
    nthChild: 1,
    ...overrides,
  };
}

describe('buildStableSelector', () => {
  it('prefers a stable unique id', async () => {
    const target = node(1, -1, { attributes: { id: 'main-nav' } });
    const selector = await buildStableSelector(
      target,
      [target],
      async (value) => value === '#main-nav',
    );

    expect(selector).toBe('#main-nav');
  });

  it('does not use generated ids', async () => {
    const target = node(1, -1, {
      tagName: 'NAV',
      attributes: { id: 'item_abcdef1234', class: 'main-nav' },
    });

    const selector = await buildStableSelector(
      target,
      [target],
      async (value) => value === 'nav.main-nav',
    );

    expect(selector).toBe('nav.main-nav');
  });

  it('drops CSS-module style hash classes', async () => {
    const target = node(1, -1, {
      tagName: 'UL',
      attributes: { class: 'nav-links styles_nav_abc123' },
    });

    const selector = await buildStableSelector(
      target,
      [target],
      async (value) => value === 'ul.nav-links',
    );

    expect(selector).toBe('ul.nav-links');
  });

  it('adds a parent when the local selector is not unique', async () => {
    const parent = node(1, -1, {
      tagName: 'NAV',
      attributes: { class: 'main-nav' },
    });
    const target = node(2, 1, {
      tagName: 'UL',
      attributes: { class: 'nav-links' },
    });

    const selector = await buildStableSelector(
      target,
      [parent, target],
      async (value) => value === 'nav.main-nav > ul.nav-links',
    );

    expect(selector).toBe('nav.main-nav > ul.nav-links');
  });
});
