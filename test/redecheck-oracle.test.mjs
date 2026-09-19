import { describe, expect, it } from 'vitest';
import { classifyFailure, parseOracle, widthsForPage } from '../scripts/lib/redecheck-oracle.mjs';

const archive = `### True Positives### {#TP}

| **Report Type** | **Web Page** | **Distinct RLF** | **Viewport Range** | **Classification** | **Reason** |
| Viewport Protrusion| Example | [1](../Example-failure-1.html#About-drlf) | 320px-340px | TP | viewport report |
| Small-Range| Example | [1](../Example-failure-2.html#About-drlf) | 330px-330px | TP | same distinct defect, another report type |
| Wrapping| Other | [2](../Other-failure-1.html#About-drlf) | 476px-480px | TP | wrapped |

### False Positives### {#FP}
`;

describe('ReDeCheck benchmark oracle', () => {
  it('groups multiple report types under one Distinct RLF identity', () => {
    const failures = parseOracle(archive, { expectedDistinct: 2 });

    expect(failures).toHaveLength(2);
    expect(failures[0]).toMatchObject({
      id: 1,
      page: 'Example',
      reportTypes: ['Viewport Protrusion', 'Small-Range'],
      reports: [
        {
          type: 'Viewport Protrusion',
          range: { min: 320, max: 340 },
        },
        {
          type: 'Small-Range',
          range: { min: 330, max: 330 },
        },
      ],
    });
  });

  it('samples narrow oracle ranges directly', () => {
    const failures = parseOracle(archive, { expectedDistinct: 2 });
    const widths = widthsForPage([failures[1]]);

    expect(widths).toContain(476);
    expect(widths).toContain(478);
    expect(widths).toContain(480);
  });

  it('marks compatible report-family findings as candidates, not confirmed detections', () => {
    const [failure] = parseOracle(archive, { expectedDistinct: 2 });
    const classified = classifyFailure(failure, {
      status: 'ok',
      result: {
        viewports: [
          {
            width: 330,
            issues: [
              {
                id: 'issue-1',
                type: 'horizontal-overflow',
                selector: '.example',
              },
            ],
          },
        ],
      },
    });

    expect(classified.classification).toBe('candidate-match');
    expect(classified.support).toBe('compatible');
    expect(classified.matches).toHaveLength(1);
    expect(classified.matches[0].oracleReportTypes).toEqual(['Viewport Protrusion']);
  });

  it('keeps fully unsupported distinct RLFs separate from misses', () => {
    const [, failure] = parseOracle(archive, { expectedDistinct: 2 });
    const classified = classifyFailure(failure, {
      status: 'ok',
      result: { viewports: [] },
    });

    expect(classified.classification).toBe('unsupported');
  });
});
