import { describe, expect, it } from 'vitest';
import { detectFixedElementCollisions } from '../src/detect/fixed-collision.js';
import type { LayoutNode } from '../src/types.js';

function node(index: number, parentIndex: number, overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    index,
    parentIndex,
    tagName: 'BUTTON',
    attributes: {},
    rect: { x: 0, y: 0, width: 100, height: 40 },
    styles: {
      position: 'fixed',
      overflow: 'visible',
      'overflow-x': 'visible',
      display: 'block',
      visibility: 'visible',
      transform: 'none',
      'z-index': '10',
    },
    paintOrder: index,
    isVisible: true,
    ...overrides,
  };
}

describe('detectFixedElementCollisions', () => {
  it('reports overlapping independent fixed elements', () => {
    const nodes = [
      node(1, -1, { rect: { x: 180, y: 820, width: 180, height: 48 } }),
      node(2, -1, { rect: { x: 260, y: 830, width: 110, height: 48 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([
      {
        firstNodeIndex: 1,
        secondNodeIndex: 2,
        overlapWidthPx: 100,
        overlapHeightPx: 38,
        overlapAreaPx: 3800,
        firstBbox: [180, 820, 180, 48],
        secondBbox: [260, 830, 110, 48],
      },
    ]);
  });

  it('ignores touching edges and 1px tolerance', () => {
    const nodes = [
      node(1, -1, { rect: { x: 0, y: 0, width: 100, height: 40 } }),
      node(2, -1, { rect: { x: 99, y: 0, width: 100, height: 40 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores ancestor-child fixed pairs', () => {
    const nodes = [
      node(1, -1, { tagName: 'DIV', rect: { x: 50, y: 50, width: 250, height: 250 } }),
      node(2, 1, { rect: { x: 100, y: 100, width: 120, height: 40 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores full-screen backdrops', () => {
    const nodes = [
      node(1, -1, {
        tagName: 'DIV',
        rect: { x: 0, y: 0, width: 390, height: 900 },
      }),
      node(2, -1, { rect: { x: 300, y: 20, width: 60, height: 40 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores fully offscreen fixed elements', () => {
    const nodes = [
      node(1, -1, { rect: { x: 500, y: 820, width: 180, height: 48 } }),
      node(2, -1, { rect: { x: 520, y: 830, width: 110, height: 48 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores effectively transparent fixed elements', () => {
    const nodes = [
      node(1, -1, {
        rect: { x: 180, y: 820, width: 180, height: 48 },
        styles: {
          position: 'fixed',
          overflow: 'visible',
          'overflow-x': 'visible',
          display: 'block',
          visibility: 'visible',
          opacity: '0',
          transform: 'none',
          'z-index': '10',
        },
      }),
      node(2, -1, { rect: { x: 260, y: 830, width: 110, height: 48 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores aria-hidden fixed elements', () => {
    const nodes = [
      node(1, -1, {
        attributes: { 'aria-hidden': 'true' },
        rect: { x: 180, y: 820, width: 180, height: 48 },
      }),
      node(2, -1, { rect: { x: 260, y: 830, width: 110, height: 48 } }),
    ];

    expect(detectFixedElementCollisions(nodes, { width: 390, height: 900 })).toEqual([]);
  });
});
