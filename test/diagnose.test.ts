import { describe, expect, it } from 'vitest';
import { diagnoseHorizontalOverflowRoot } from '../src/diagnose.js';
import type { LayoutNode } from '../src/types.js';

function node(overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    index: 1,
    parentIndex: -1,
    tagName: 'SECTION',
    attributes: { class: 'plan-grid' },
    rect: { x: 18, y: 0, width: 720, height: 200 },
    styles: {
      display: 'grid',
      position: 'static',
      overflow: 'visible',
      'overflow-x': 'visible',
      'min-width': '720px',
      width: '720px',
      'max-width': 'none',
      'grid-template-columns': '229.328px 229.328px 229.344px',
      'flex-wrap': 'nowrap',
    },
    paintOrder: 1,
    isVisible: true,
    ...overrides,
  };
}

describe('diagnoseHorizontalOverflowRoot', () => {
  it('explains a min-width constraint with available and computed width', () => {
    expect(diagnoseHorizontalOverflowRoot(node(), 390)).toEqual({
      diagnosis: {
        kind: 'min-width-constraint',
        property: 'min-width',
        value: '720px',
        suggestion: 'remove or constrain min-width, or let the layout reflow',
      },
      computedWidthPx: 720,
      availableWidthPx: 372,
    });
  });

  it('explains a fixed width when min-width does not constrain the layout', () => {
    expect(
      diagnoseHorizontalOverflowRoot(
        node({
          styles: {
            'min-width': '0px',
            width: '720px',
          },
        }),
        390,
      ),
    ).toEqual({
      diagnosis: {
        kind: 'fixed-width-constraint',
        property: 'width',
        value: '720px',
        suggestion: 'remove the fixed width, constrain it, or let the layout size responsively',
      },
      computedWidthPx: 720,
      availableWidthPx: 372,
    });
  });

  it('does not claim a width root cause when the computed width fits', () => {
    expect(
      diagnoseHorizontalOverflowRoot(
        node({
          rect: { x: 18, y: 0, width: 300, height: 200 },
          styles: {
            'min-width': '0px',
            width: '300px',
          },
        }),
        390,
      ).diagnosis,
    ).toBeNull();
  });
});
