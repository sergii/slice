import { describe, expect, it } from 'vitest';
import {
  detectFixedContentOcclusions,
  MIN_TARGET_COVERAGE,
} from '../src/detect/fixed-occlusion.js';
import type { LayoutNode } from '../src/types.js';

function node(index: number, parentIndex: number, overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    index,
    parentIndex,
    tagName: 'DIV',
    attributes: {},
    rect: { x: 0, y: 0, width: 100, height: 40 },
    styles: {
      position: 'static',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      'pointer-events': 'auto',
      'z-index': 'auto',
    },
    paintOrder: index,
    isVisible: true,
    ...overrides,
  };
}

describe('detectFixedContentOcclusions', () => {
  it('reports a higher-painted fixed element covering an interactive target', () => {
    const nodes = [
      node(1, -1, {
        tagName: 'BUTTON',
        rect: { x: 200, y: 820, width: 100, height: 40 },
        paintOrder: 2,
      }),
      node(2, -1, {
        rect: { x: 220, y: 820, width: 80, height: 40 },
        styles: {
          position: 'fixed',
          display: 'block',
          visibility: 'visible',
          opacity: '1',
          'pointer-events': 'auto',
          'z-index': '60',
        },
        paintOrder: 10,
      }),
    ];

    expect(detectFixedContentOcclusions(nodes, { width: 390, height: 900 })).toEqual([
      {
        occluderNodeIndex: 2,
        targetNodeIndex: 1,
        overlapWidthPx: 80,
        overlapHeightPx: 40,
        overlapAreaPx: 3200,
        targetCoveragePct: 80,
        occluderBbox: [220, 820, 80, 40],
        targetBbox: [200, 820, 100, 40],
        occluderPaintOrder: 10,
        targetPaintOrder: 2,
      },
    ]);
  });

  it('requires the fixed element to paint above the target', () => {
    const nodes = [
      node(1, -1, {
        tagName: 'BUTTON',
        rect: { x: 200, y: 820, width: 100, height: 40 },
        paintOrder: 10,
      }),
      node(2, -1, {
        rect: { x: 220, y: 820, width: 80, height: 40 },
        styles: { position: 'fixed', 'pointer-events': 'auto' },
        paintOrder: 2,
      }),
    ];

    expect(detectFixedContentOcclusions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores coverage below the meaningful threshold', () => {
    const nodes = [
      node(1, -1, {
        tagName: 'BUTTON',
        rect: { x: 100, y: 100, width: 100, height: 40 },
        paintOrder: 1,
      }),
      node(2, -1, {
        rect: { x: 185, y: 100, width: 15, height: 40 },
        styles: { position: 'fixed', 'pointer-events': 'auto' },
        paintOrder: 2,
      }),
    ];

    expect(MIN_TARGET_COVERAGE).toBe(0.2);
    expect(detectFixedContentOcclusions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores disabled and non-interactive targets', () => {
    const occluder = node(3, -1, {
      rect: { x: 100, y: 100, width: 100, height: 40 },
      styles: { position: 'fixed', 'pointer-events': 'auto' },
      paintOrder: 10,
    });
    const nodes = [
      node(1, -1, {
        tagName: 'BUTTON',
        attributes: { disabled: '' },
        rect: { x: 100, y: 100, width: 100, height: 40 },
        paintOrder: 1,
      }),
      node(2, -1, {
        tagName: 'DIV',
        rect: { x: 100, y: 100, width: 100, height: 40 },
        paintOrder: 2,
      }),
      occluder,
    ];

    expect(detectFixedContentOcclusions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores pointer-events none fixed elements', () => {
    const nodes = [
      node(1, -1, {
        tagName: 'BUTTON',
        rect: { x: 100, y: 100, width: 100, height: 40 },
        paintOrder: 1,
      }),
      node(2, -1, {
        rect: { x: 100, y: 100, width: 100, height: 40 },
        styles: { position: 'fixed', 'pointer-events': 'none' },
        paintOrder: 10,
      }),
    ];

    expect(detectFixedContentOcclusions(nodes, { width: 390, height: 900 })).toEqual([]);
  });

  it('ignores targets from the same DOM branch', () => {
    const nodes = [
      node(1, -1, {
        rect: { x: 100, y: 100, width: 100, height: 40 },
        styles: { position: 'fixed', 'pointer-events': 'auto' },
        paintOrder: 10,
      }),
      node(2, 1, {
        tagName: 'BUTTON',
        rect: { x: 100, y: 100, width: 100, height: 40 },
        paintOrder: 11,
      }),
    ];

    expect(detectFixedContentOcclusions(nodes, { width: 390, height: 900 })).toEqual([]);
  });
});
