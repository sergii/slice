import { describe, expect, it } from 'vitest';
import { isIssueSuppressed, partitionSuppressedIssues } from '../src/suppress.js';
import type { Issue } from '../src/types.js';

const collision: Issue = {
  id: 'issue-1',
  type: 'fixed-element-collision',
  severity: 'error',
  selector: 'button.alpha',
  otherSelector: 'button.beta',
  tagName: 'BUTTON',
  otherTagName: 'BUTTON',
  overlapWidthPx: 20,
  overlapHeightPx: 10,
  overlapAreaPx: 200,
  bbox: [0, 0, 100, 40],
  otherBbox: [80, 0, 100, 40],
  viewportWidth: 390,
  evidence: {
    position: 'fixed',
    otherPosition: 'fixed',
    zIndex: '10',
    otherZIndex: '11',
  },
};

describe('issue suppressions', () => {
  it('matches fixed collision selector pairs in either order', () => {
    expect(
      isIssueSuppressed(collision, [
        {
          type: 'fixed-element-collision',
          selector: 'button.beta',
          otherSelector: 'button.alpha',
        },
      ]),
    ).toBe(true);
  });

  it('keeps unmatched issues active and retains suppressed evidence', () => {
    const result = partitionSuppressedIssues(
      [collision],
      [
        {
          type: 'fixed-element-collision',
          selector: 'button.alpha',
          otherSelector: 'button.beta',
        },
      ],
    );

    expect(result.issues).toEqual([]);
    expect(result.suppressedIssues).toEqual([collision]);
  });
});
