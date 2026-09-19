import { describe, expect, it } from 'vitest';
import { renderGitHubSummary } from '../scripts/github-summary.mjs';

describe('GitHub summary', () => {
  it('renders failing viewports, causes, boundaries, and suppressions', () => {
    const markdown = renderGitHubSummary({
      summary: {
        viewportsChecked: 2,
        suppressedIssues: 1,
      },
      viewports: [
        {
          width: 390,
          status: 'fail',
          issues: [
            {
              type: 'fixed-content-occlusion',
              selector: 'button.help',
              targetSelector: 'button.apply',
              targetCoveragePct: 63,
            },
          ],
          suppressedIssues: [],
        },
        {
          width: 768,
          status: 'pass',
          issues: [],
          suppressedIssues: [{ type: 'horizontal-overflow' }],
        },
      ],
      rootCauses: [
        {
          selector: 'section.grid',
          boundaries: [{ boundary: 742 }],
          diagnosis: {
            property: 'width',
            value: '720px',
          },
        },
      ],
      boundaries: [
        {
          issueId: 'issue-2',
          issueType: 'fixed-content-occlusion',
          boundary: 768,
        },
      ],
    });

    expect(markdown).toContain('**1 failing viewports / 2 checked** · 1 suppressed');
    expect(markdown).toContain('button.help covers button.apply (63%)');
    expect(markdown).toContain('| 768px | PASS | 1 suppressed |');
    expect(markdown).toContain('| section.grid | 742px | width: 720px |');
    expect(markdown).toContain('| issue-2 | fixed-content-occlusion | 768px |');
  });
});
