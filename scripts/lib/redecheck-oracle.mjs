export const STANDARD_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1400];

export const CLASS_MAPPING = {
  'Viewport Protrusion': {
    support: 'compatible',
    issueTypes: ['horizontal-overflow'],
  },
  'Element Collision': {
    support: 'partial',
    issueTypes: ['fixed-element-collision'],
  },
  'Element Protrusion': {
    support: 'unsupported',
    issueTypes: [],
  },
  'Small-Range': {
    support: 'unsupported',
    issueTypes: [],
  },
  Wrapping: {
    support: 'unsupported',
    issueTypes: [],
  },
};

export function parseOracle(markdown, options = {}) {
  const expectedDistinct = options.expectedDistinct ?? 33;
  const start = markdown.indexOf('### True Positives');
  const end = markdown.indexOf('### False Positives');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not isolate the true-positive table in results-archive.md');
  }

  const failures = new Map();

  for (const line of markdown.slice(start, end).split('\n')) {
    if (!line.startsWith('|')) continue;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 6 || cells[4] !== 'TP') continue;

    const [type, page, distinctCell, rangeCell, , reasonCell] = cells;
    const idMatch = distinctCell.match(/\[(\d+)\]/);
    const rangeMatch = rangeCell.match(/(\d+)px-(\d+)px/);
    const reportMatch = distinctCell.match(/\(([^)]+)\)/);

    if (!idMatch || !rangeMatch) continue;

    const id = Number(idMatch[1]);
    const range = {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
    };
    const existing = failures.get(id);

    if (existing) {
      if (existing.type !== type || existing.page !== page) {
        throw new Error(
          `Distinct RLF ${id} changed identity: ${existing.type}/${existing.page} vs ${type}/${page}`,
        );
      }

      if (
        !existing.ranges.some(
          (candidate) => candidate.min === range.min && candidate.max === range.max,
        )
      ) {
        existing.ranges.push(range);
      }

      if (reportMatch && !existing.reports.includes(reportMatch[1])) {
        existing.reports.push(reportMatch[1]);
      }

      if (reasonCell && !existing.reasons.includes(reasonCell)) {
        existing.reasons.push(reasonCell);
      }
      continue;
    }

    failures.set(id, {
      id,
      type,
      page,
      ranges: [range],
      reports: reportMatch ? [reportMatch[1]] : [],
      reasons: reasonCell ? [reasonCell] : [],
    });
  }

  const distinctFailures = [...failures.values()].sort((a, b) => a.id - b.id);

  if (distinctFailures.length !== expectedDistinct) {
    throw new Error(
      `Expected ${expectedDistinct} distinct ReDeCheck true-positive RLFs, parsed ${distinctFailures.length}`,
    );
  }

  return distinctFailures;
}

export function midpoint(range) {
  return Math.floor((range.min + range.max) / 2);
}

export function widthsForPage(failures) {
  const widths = new Set(STANDARD_WIDTHS);

  for (const failure of failures) {
    for (const range of failure.ranges) {
      widths.add(range.min);
      widths.add(midpoint(range));
      widths.add(range.max);
    }
  }

  return [...widths].filter((width) => width >= 320 && width <= 1400).sort((a, b) => a - b);
}

export function compatibleFindings(pageResult, failure) {
  const mapping = CLASS_MAPPING[failure.type];
  if (!mapping || mapping.issueTypes.length === 0) return [];

  const compatibleTypes = new Set(mapping.issueTypes);
  const matches = [];

  for (const viewport of pageResult.viewports ?? []) {
    const insideOracleRange = failure.ranges.some(
      (range) => viewport.width >= range.min && viewport.width <= range.max,
    );
    if (!insideOracleRange) continue;

    for (const issue of viewport.issues ?? []) {
      if (!compatibleTypes.has(issue.type)) continue;

      matches.push({
        viewportWidth: viewport.width,
        issueId: issue.id,
        issueType: issue.type,
        selector: issue.selector,
      });
    }
  }

  return matches;
}

export function classifyFailure(failure, pageRun) {
  const mapping = CLASS_MAPPING[failure.type];

  if (!pageRun || pageRun.status === 'environment-error') {
    return {
      classification: 'environment-error',
      support: mapping?.support ?? 'unknown',
      matches: [],
    };
  }

  if (!mapping || mapping.support === 'unsupported') {
    return {
      classification: 'unsupported',
      support: mapping?.support ?? 'unsupported',
      matches: [],
    };
  }

  const matches = compatibleFindings(pageRun.result, failure);

  return {
    classification: matches.length > 0 ? 'candidate-match' : 'missed',
    support: mapping.support,
    matches,
  };
}
