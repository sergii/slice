import type { LayoutNode } from '../types.js';

const ROW_CENTER_TOLERANCE_PX = 4;
const MIN_VERTICAL_OVERLAP_RATIO = 0.5;

export interface InferredRow {
  top: number;
  bottom: number;
  nodeIndices: number[];
}

export interface ParentRows {
  parentIndex: number;
  rows: InferredRow[];
  rowByNodeIndex: Map<number, number>;
}

function verticalOverlapRatio(
  first: LayoutNode['rect'],
  second: { top: number; bottom: number },
): number {
  const overlap = Math.max(
    0,
    Math.min(first.y + first.height, second.bottom) - Math.max(first.y, second.top),
  );
  const rowHeight = second.bottom - second.top;
  const denominator = Math.min(first.height, rowHeight);

  return denominator > 0 ? overlap / denominator : 0;
}

function belongsToRow(node: LayoutNode, row: InferredRow): boolean {
  const nodeCenter = node.rect.y + node.rect.height / 2;
  const rowCenter = row.top + (row.bottom - row.top) / 2;

  return (
    Math.abs(nodeCenter - rowCenter) <= ROW_CENTER_TOLERANCE_PX ||
    verticalOverlapRatio(node.rect, row) >= MIN_VERTICAL_OVERLAP_RATIO
  );
}

function participatesInFlow(node: LayoutNode): boolean {
  const position = node.styles.position?.toLowerCase();
  const transform = node.styles.transform?.trim().toLowerCase();

  if (position === 'absolute' || position === 'fixed') return false;
  if (transform && transform !== 'none') return false;

  return node.isVisible && node.rect.width > 0 && node.rect.height > 0;
}

export function inferSiblingRows(nodes: LayoutNode[]): Map<number, ParentRows> {
  const childrenByParent = new Map<number, LayoutNode[]>();

  for (const node of nodes) {
    if (node.parentIndex === -1 || !participatesInFlow(node)) continue;

    const children = childrenByParent.get(node.parentIndex) ?? [];
    children.push(node);
    childrenByParent.set(node.parentIndex, children);
  }

  const result = new Map<number, ParentRows>();

  for (const [parentIndex, children] of childrenByParent) {
    if (children.length < 3) continue;

    const sorted = [...children].sort(
      (first, second) => first.rect.y - second.rect.y || first.rect.x - second.rect.x,
    );
    const rows: InferredRow[] = [];

    for (const node of sorted) {
      let rowIndex = rows.findIndex((row) => belongsToRow(node, row));

      if (rowIndex === -1) {
        rows.push({
          top: node.rect.y,
          bottom: node.rect.y + node.rect.height,
          nodeIndices: [node.index],
        });
        rowIndex = rows.length - 1;
      } else {
        const row = rows[rowIndex];
        if (!row) continue;
        row.top = Math.min(row.top, node.rect.y);
        row.bottom = Math.max(row.bottom, node.rect.y + node.rect.height);
        row.nodeIndices.push(node.index);
      }
    }

    const rowByNodeIndex = new Map<number, number>();
    rows.forEach((row, rowIndex) => {
      row.nodeIndices.forEach((nodeIndex) => rowByNodeIndex.set(nodeIndex, rowIndex));
    });

    result.set(parentIndex, {
      parentIndex,
      rows,
      rowByNodeIndex,
    });
  }

  return result;
}
