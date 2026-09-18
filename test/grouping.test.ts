import { describe, expect, it } from 'vitest';
import { detectHorizontalOverflow } from '../src/detect/overflow.js';
import { groupHorizontalOverflow } from '../src/grouping.js';
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

describe('groupHorizontalOverflow', () => {
  it('groups sibling leaf findings under their overflowing grid container', () => {
    const nodes = [
      node(1, -1, {
        attributes: { class: 'plan-grid' },
        rect: { x: 0, y: 0, width: 720, height: 200 },
        styles: {
          position: 'static',
          overflow: 'visible',
          'overflow-x': 'visible',
          display: 'grid',
          visibility: 'visible',
          transform: 'none',
        },
      }),
      node(2, 1, { rect: { x: 240, y: 0, width: 220, height: 180 } }),
      node(3, 2, { rect: { x: 250, y: 20, width: 200, height: 20 } }),
      node(4, 1, { rect: { x: 480, y: 0, width: 220, height: 180 } }),
      node(5, 4, { rect: { x: 490, y: 20, width: 200, height: 20 } }),
    ];
    const viewport = { width: 390, height: 900 };
    const leaves = detectHorizontalOverflow(nodes, viewport);
    const groups = groupHorizontalOverflow(nodes, viewport, leaves);

    expect(leaves.map((finding) => finding.nodeIndex)).toEqual([3, 5]);
    expect(groups).toEqual([
      expect.objectContaining({
        rootNodeIndex: 1,
        side: 'right',
        overflowPx: 330,
        leafNodeIndices: [3, 5],
      }),
    ]);
  });

  it('does not merge unrelated leaf findings without a shared layout root', () => {
    const nodes = [
      node(1, -1, { rect: { x: 0, y: 0, width: 500, height: 40 } }),
      node(2, -1, { rect: { x: 0, y: 60, width: 520, height: 40 } }),
    ];
    const viewport = { width: 390, height: 900 };
    const leaves = detectHorizontalOverflow(nodes, viewport);

    expect(groupHorizontalOverflow(nodes, viewport, leaves)).toEqual([]);
  });
});
