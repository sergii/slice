import { describe, expect, it } from 'vitest';
import { detectWrappingTransitions } from '../src/analyze/wrapping.js';
import type { LayoutNode } from '../src/types.js';

function node(
  index: number,
  parentIndex: number,
  x: number,
  y: number,
  width = 80,
  height = 30,
): LayoutNode {
  return {
    index,
    parentIndex,
    tagName: 'A',
    attributes: {},
    rect: { x, y, width, height },
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
  };
}

function surface(width: number, positions: Array<[number, number]>): { width: number; nodes: LayoutNode[] } {
  return {
    width,
    nodes: [
      node(1, -1, 0, 0, width, 120),
      ...positions.map(([x, y], offset) => node(offset + 2, 1, x, y)),
    ],
  };
}

describe('detectWrappingTransitions', () => {
  it('detects one sibling dropping out of a previously stable row', () => {
    const findings = detectWrappingTransitions([
      surface(430, [
        [0, 10],
        [90, 10],
        [180, 10],
        [270, 10],
      ]),
      surface(320, [
        [0, 10],
        [90, 10],
        [180, 10],
        [0, 50],
      ]),
    ]);

    expect(findings).toEqual([
      expect.objectContaining({
        nodeIndex: 5,
        parentIndex: 1,
        viewportWidth: 320,
        previousViewportWidth: 430,
        previousRowSize: 4,
        currentRowSize: 1,
        stableSiblingCount: 3,
        verticalShiftPx: 40,
      }),
    ]);
  });

  it('does not flag balanced responsive reflow', () => {
    const findings = detectWrappingTransitions([
      surface(430, [
        [0, 10],
        [90, 10],
        [180, 10],
        [270, 10],
      ]),
      surface(320, [
        [0, 10],
        [90, 10],
        [0, 50],
        [90, 50],
      ]),
    ]);

    expect(findings).toEqual([]);
  });

  it('does not flag a row that remains stable across widths', () => {
    const findings = detectWrappingTransitions([
      surface(430, [
        [0, 10],
        [90, 10],
        [180, 10],
      ]),
      surface(320, [
        [0, 10],
        [90, 10],
        [180, 10],
      ]),
    ]);

    expect(findings).toEqual([]);
  });
});
