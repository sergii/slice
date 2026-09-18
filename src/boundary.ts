export interface BoundarySearchResult {
  boundary: number;
  lastGoodWidth: number;
  firstBadWidth: number;
  probesUsed: number;
}

export async function findBoundary(
  check: (width: number) => Promise<boolean>,
  passWidth: number,
  failWidth: number,
): Promise<BoundarySearchResult> {
  let good = passWidth;
  let bad = failWidth;
  let probesUsed = 0;

  while (Math.abs(bad - good) > 1) {
    const mid = Math.round((good + bad) / 2);
    const broken = await check(mid);
    probesUsed += 1;

    if (broken) {
      bad = mid;
    } else {
      good = mid;
    }
  }

  return {
    boundary: bad,
    lastGoodWidth: good,
    firstBadWidth: bad,
    probesUsed,
  };
}
