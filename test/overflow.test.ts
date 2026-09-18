import { describe, expect, it } from 'vitest';
import { detectHorizontalOverflow } from '../src/detect/overflow.js';
import type { LayoutNode } from '../src/types.js';

function node(index: number, parentIndex: number, overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    index,
    parentIndex,
    tagName: 'DIV',
    attributes: {},
    rect: { x: 0, y: 0, width: 100, height: 20 },
    styles: {
      position: 'static',
      overflow: 'visible',
      'overflow-x': 'visible',
      display: 'block',
      visibility: 'visible',
      transform: 'none',
    },
    paintOrder: index,
    isVisible: true,
    ...overrides,
  };
}

describe('detectHorizontalOverflow', () => {
  it('attributes nested overflow to the deepest candidate', () => {
    const nodes = [
      node(1, -1, { rect: { x: 0, y: 0, width: 500, height: 100 } }),
      node(2, 1, { rect: { x: 0, y: 0, width: 500, height: 80 } }),
      node(3, 2, { rect: { x: 0, y: 0, width: 500, height: 40 } }),
    ];

    expect(detectHorizontalOverflow(nodes, { width: 390, height: 900 })).toEqual([
      expect.objectContaining({ nodeIndex: 3, overflowPx: 110 }),
    ]);
  });

  it('ignores overflow clipped by an ancestor', () => {
    const nodes = [
      node(1, -1, {
        styles: {
          position: 'static',
          overflow: 'hidden',
          'overflow-x': 'hidden',
          display: 'block',
          visibility: 'visible',
          transform: 'none',
        },
      }),
      node(2, 1, { rect: { x: 0, y: 0, width: 500, height: 40 } }),
    ];

    expect(detectHorizontalOverflow(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores fixed and translated elements', () => {
    const nodes = [
      node(1, -1, {
        rect: { x: 0, y: 0, width: 500, height: 40 },
        styles: {
          position: 'fixed',
          overflow: 'visible',
          'overflow-x': 'visible',
          display: 'block',
          visibility: 'visible',
          transform: 'none',
        },
      }),
      node(2, -1, {
        rect: { x: 0, y: 50, width: 500, height: 40 },
        styles: {
          position: 'static',
          overflow: 'visible',
          'overflow-x': 'visible',
          display: 'block',
          visibility: 'visible',
          transform: 'translateX(10px)',
        },
      }),
    ];

    expect(detectHorizontalOverflow(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores aria-hidden subtrees', () => {
    const nodes = [
      node(1, -1, { attributes: { 'aria-hidden': 'true' } }),
      node(2, 1, { rect: { x: 0, y: 0, width: 500, height: 40 } }),
    ];

    expect(detectHorizontalOverflow(nodes, { width: 390, height: 900 })).toEqual([]);
  });
});
