import type { LayoutNode, Viewport } from '../types.js';

export const OVERFLOW_TOLERANCE_PX = 1;

export interface DetectedOverflow {
  nodeIndex: number;
  overflowPx: number;
  side: 'right' | 'left';
  bbox: [number, number, number, number];
  tagName: string;
}

function nodeMap(nodes: LayoutNode[]): Map<number, LayoutNode> {
  return new Map(nodes.map((node) => [node.index, node]));
}

function ancestorsOf(
  node: LayoutNode,
  nodesByIndex: Map<number, LayoutNode>,
): LayoutNode[] {
  const ancestors: LayoutNode[] = [];
  let currentIndex = node.parentIndex;
  const seen = new Set<number>();

  while (currentIndex !== -1 && !seen.has(currentIndex)) {
    seen.add(currentIndex);
    const current = nodesByIndex.get(currentIndex);
    if (!current) break;
    ancestors.push(current);
    currentIndex = current.parentIndex;
  }

  return ancestors;
}

function isAncestorOf(
  ancestor: LayoutNode,
  descendant: LayoutNode,
  nodesByIndex: Map<number, LayoutNode>,
): boolean {
  return ancestorsOf(descendant, nodesByIndex)
    .some((node) => node.index === ancestor.index);
}

function clipsHorizontalOverflow(node: LayoutNode): boolean {
  const overflowX = node.styles['overflow-x']?.toLowerCase();
  const overflow = node.styles.overflow?.toLowerCase();
  const clippingValues = new Set(['hidden', 'auto', 'scroll']);

  return clippingValues.has(overflowX) || clippingValues.has(overflow);
}

function hasTranslatedTransform(node: LayoutNode): boolean {
  const transform = node.styles.transform?.trim().toLowerCase();
  if (!transform || transform === 'none') return false;

  return transform.includes('translate')
    || transform.startsWith('matrix(')
    || transform.startsWith('matrix3d(');
}

function isLegitimateOverflow(
  node: LayoutNode,
  nodesByIndex: Map<number, LayoutNode>,
): boolean {
  if (node.tagName === 'HTML' || node.tagName === 'BODY') return true;
  if (node.styles.position?.toLowerCase() === 'fixed') return true;
  if (hasTranslatedTransform(node)) return true;
  if (node.attributes['aria-hidden']?.toLowerCase() === 'true') return true;

  return ancestorsOf(node, nodesByIndex).some((ancestor) => (
    clipsHorizontalOverflow(ancestor)
    || ancestor.attributes['aria-hidden']?.toLowerCase() === 'true'
  ));
}

function overflowFor(
  node: LayoutNode,
  viewport: Viewport,
): { side: 'right' | 'left'; overflowPx: number } | null {
  const rightOverflow = node.rect.x + node.rect.width - viewport.width;
  const leftOverflow = -node.rect.x;

  const rightBad = rightOverflow > OVERFLOW_TOLERANCE_PX;
  const leftBad = leftOverflow > OVERFLOW_TOLERANCE_PX;

  if (!rightBad && !leftBad) return null;

  if (rightBad && (!leftBad || rightOverflow >= leftOverflow)) {
    return { side: 'right', overflowPx: Math.round(rightOverflow) };
  }

  return { side: 'left', overflowPx: Math.round(leftOverflow) };
}

export function detectHorizontalOverflow(
  nodes: LayoutNode[],
  viewport: Viewport,
): DetectedOverflow[] {
  const nodesByIndex = nodeMap(nodes);

  const candidates = nodes
    .map((node) => ({ node, overflow: overflowFor(node, viewport) }))
    .filter(
      (entry): entry is {
        node: LayoutNode;
        overflow: { side: 'right' | 'left'; overflowPx: number };
      } => entry.overflow !== null,
    )
    .filter(({ node }) => !isLegitimateOverflow(node, nodesByIndex));

  return candidates
    .filter(({ node }) => !candidates.some(
      ({ node: other }) => other.index !== node.index
        && isAncestorOf(node, other, nodesByIndex),
    ))
    .map(({ node, overflow }) => ({
      nodeIndex: node.index,
      overflowPx: overflow.overflowPx,
      side: overflow.side,
      bbox: [node.rect.x, node.rect.y, node.rect.width, node.rect.height],
      tagName: node.tagName,
    }));
}
