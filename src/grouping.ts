import {
  detectHorizontalOverflowCandidates,
  type DetectedOverflow,
} from './detect/overflow.js';
import type { LayoutNode, Viewport } from './types.js';

const LAYOUT_DISPLAYS = new Set(['flex', 'grid', 'inline-flex', 'inline-grid']);

export interface OverflowRootCauseFinding {
  rootNodeIndex: number;
  side: 'right' | 'left';
  overflowPx: number;
  bbox: [number, number, number, number];
  tagName: string;
  leafNodeIndices: number[];
}

function ancestorIndices(node: LayoutNode, nodesByIndex: Map<number, LayoutNode>): number[] {
  const indices: number[] = [];
  const seen = new Set<number>();
  let currentIndex = node.parentIndex;

  while (currentIndex !== -1 && !seen.has(currentIndex)) {
    seen.add(currentIndex);
    indices.push(currentIndex);
    const current = nodesByIndex.get(currentIndex);
    if (!current) break;
    currentIndex = current.parentIndex;
  }

  return indices;
}

export function groupHorizontalOverflow(
  nodes: LayoutNode[],
  viewport: Viewport,
  leafFindings: DetectedOverflow[],
): OverflowRootCauseFinding[] {
  if (leafFindings.length < 2) return [];

  const nodesByIndex = new Map(nodes.map((node) => [node.index, node]));
  const candidates = detectHorizontalOverflowCandidates(nodes, viewport);
  const candidateByIndex = new Map(candidates.map((candidate) => [candidate.nodeIndex, candidate]));
  const leafAncestorSets = new Map<number, Set<number>>();

  for (const leaf of leafFindings) {
    const node = nodesByIndex.get(leaf.nodeIndex);
    if (!node) continue;
    leafAncestorSets.set(leaf.nodeIndex, new Set(ancestorIndices(node, nodesByIndex)));
  }

  const descendantCount = (ancestorIndex: number, side: 'right' | 'left'): number =>
    leafFindings.filter(
      (leaf) => leaf.side === side && leafAncestorSets.get(leaf.nodeIndex)?.has(ancestorIndex),
    ).length;

  const rootByLeaf = new Map<number, DetectedOverflow>();

  for (const leaf of leafFindings) {
    const node = nodesByIndex.get(leaf.nodeIndex);
    if (!node) continue;

    for (const ancestorIndex of ancestorIndices(node, nodesByIndex)) {
      const ancestor = nodesByIndex.get(ancestorIndex);
      const candidate = candidateByIndex.get(ancestorIndex);
      if (!ancestor || !candidate || candidate.side !== leaf.side) continue;

      const display = ancestor.styles.display?.toLowerCase();
      if (!display || !LAYOUT_DISPLAYS.has(display)) continue;
      if (descendantCount(ancestorIndex, leaf.side) < 2) continue;

      rootByLeaf.set(leaf.nodeIndex, candidate);
      break;
    }
  }

  const grouped = new Map<string, OverflowRootCauseFinding>();

  for (const leaf of leafFindings) {
    const root = rootByLeaf.get(leaf.nodeIndex);
    if (!root) continue;

    const key = `${root.nodeIndex}|${root.side}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.leafNodeIndices.push(leaf.nodeIndex);
      continue;
    }

    grouped.set(key, {
      rootNodeIndex: root.nodeIndex,
      side: root.side,
      overflowPx: root.overflowPx,
      bbox: root.bbox,
      tagName: root.tagName,
      leafNodeIndices: [leaf.nodeIndex],
    });
  }

  return [...grouped.values()];
}
