import { inferSiblingRows } from '../relationships/rows.js';
import type { LayoutNode } from '../types.js';

export interface WrappingSample {
  width: number;
  nodes: LayoutNode[];
}

export interface DetectedWrappingTransition {
  nodeIndex: number;
  parentIndex: number;
  viewportWidth: number;
  previousViewportWidth: number;
  previousRowSize: number;
  currentRowSize: number;
  stableSiblingCount: number;
  previousRowIndex: number;
  currentRowIndex: number;
  verticalShiftPx: number;
  bbox: [number, number, number, number];
  tagName: string;
}

function rowGroups(
  nodeIndices: number[],
  rowByNodeIndex: Map<number, number>,
): Map<number, number[]> {
  const groups = new Map<number, number[]>();

  for (const nodeIndex of nodeIndices) {
    const rowIndex = rowByNodeIndex.get(nodeIndex);
    if (rowIndex === undefined) continue;
    const members = groups.get(rowIndex) ?? [];
    members.push(nodeIndex);
    groups.set(rowIndex, members);
  }

  return groups;
}

export function detectWrappingTransitions(
  samples: WrappingSample[],
): DetectedWrappingTransition[] {
  const ordered = [...samples].sort((first, second) => second.width - first.width);
  const findings: DetectedWrappingTransition[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const wider = ordered[index];
    const narrower = ordered[index + 1];
    if (!wider || !narrower || wider.width === narrower.width) continue;

    const widerRows = inferSiblingRows(wider.nodes);
    const narrowerRows = inferSiblingRows(narrower.nodes);
    const widerByIndex = new Map(wider.nodes.map((node) => [node.index, node]));
    const narrowerByIndex = new Map(narrower.nodes.map((node) => [node.index, node]));

    for (const [parentIndex, widerParent] of widerRows) {
      const narrowerParent = narrowerRows.get(parentIndex);
      if (!narrowerParent) continue;

      for (let widerRowIndex = 0; widerRowIndex < widerParent.rows.length; widerRowIndex += 1) {
        const widerRow = widerParent.rows[widerRowIndex];
        if (!widerRow || widerRow.nodeIndices.length < 3) continue;

        const commonNodes = widerRow.nodeIndices.filter(
          (nodeIndex) =>
            narrowerByIndex.has(nodeIndex) &&
            narrowerParent.rowByNodeIndex.has(nodeIndex),
        );
        if (commonNodes.length < 3) continue;

        const groups = rowGroups(commonNodes, narrowerParent.rowByNodeIndex);
        if (groups.size < 2) continue;

        const rankedGroups = [...groups.entries()].sort(
          (first, second) => second[1].length - first[1].length || first[0] - second[0],
        );
        const stableGroup = rankedGroups[0];
        if (!stableGroup || stableGroup[1].length < 2) continue;

        for (const [currentRowIndex, movedNodes] of rankedGroups.slice(1)) {
          if (movedNodes.length >= stableGroup[1].length) continue;
          if (currentRowIndex <= stableGroup[0]) continue;

          for (const nodeIndex of movedNodes) {
            const previousNode = widerByIndex.get(nodeIndex);
            const currentNode = narrowerByIndex.get(nodeIndex);
            if (!previousNode || !currentNode) continue;

            const verticalShiftPx = Math.round(currentNode.rect.y - previousNode.rect.y);
            if (verticalShiftPx <= 4) continue;

            const key = `${narrower.width}|${parentIndex}|${nodeIndex}`;
            if (seen.has(key)) continue;
            seen.add(key);

            findings.push({
              nodeIndex,
              parentIndex,
              viewportWidth: narrower.width,
              previousViewportWidth: wider.width,
              previousRowSize: commonNodes.length,
              currentRowSize: movedNodes.length,
              stableSiblingCount: stableGroup[1].length,
              previousRowIndex: widerRowIndex,
              currentRowIndex,
              verticalShiftPx,
              bbox: [
                currentNode.rect.x,
                currentNode.rect.y,
                currentNode.rect.width,
                currentNode.rect.height,
              ],
              tagName: currentNode.tagName,
            });
          }
        }
      }
    }
  }

  return findings;
}
