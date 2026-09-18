import type { CDPSession } from 'playwright';
import type { LayoutNode } from './types.js';

const COMPUTED_STYLES = [
  'position',
  'overflow',
  'overflow-x',
  'display',
  'visibility',
  'z-index',
  'transform',
  'clip-path',
] as const;

interface NodeTreeSnapshot {
  parentIndex?: number[];
  nodeType?: number[];
  nodeName?: number[];
  attributes?: number[][];
}

interface LayoutTreeSnapshot {
  nodeIndex: number[];
  styles: number[][];
  bounds: Array<[number, number, number, number]>;
  paintOrders?: number[];
}

interface DocumentSnapshot {
  nodes: NodeTreeSnapshot;
  layout: LayoutTreeSnapshot;
}

interface CaptureSnapshotResult {
  documents: DocumentSnapshot[];
  strings: string[];
}

function decodeAttributes(
  encoded: number[] | undefined,
  strings: string[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (!encoded) return attributes;

  for (let i = 0; i < encoded.length; i += 2) {
    const name = strings[encoded[i] ?? -1];
    const value = strings[encoded[i + 1] ?? -1];
    if (name !== undefined && value !== undefined) {
      attributes[name] = value;
    }
  }

  return attributes;
}

export async function captureLayout(cdp: CDPSession): Promise<LayoutNode[]> {
  const snapshot = await cdp.send('DOMSnapshot.captureSnapshot', {
    computedStyles: [...COMPUTED_STYLES],
    includeDOMRects: true,
    includePaintOrder: true,
  }) as CaptureSnapshotResult;

  const document = snapshot.documents[0];
  if (!document) return [];

  const { nodes, layout } = document;
  const result: LayoutNode[] = [];

  for (let layoutIndex = 0; layoutIndex < layout.nodeIndex.length; layoutIndex += 1) {
    const nodeIndex = layout.nodeIndex[layoutIndex];
    if (nodeIndex === undefined) continue;
    if (nodes.nodeType?.[nodeIndex] !== 1) continue;

    const bounds = layout.bounds[layoutIndex];
    if (!bounds) continue;

    const [x, y, width, height] = bounds;
    if (width === 0 || height === 0) continue;

    const styleValues = layout.styles[layoutIndex] ?? [];
    const styles = Object.fromEntries(
      COMPUTED_STYLES.map((name, styleIndex) => [
        name,
        snapshot.strings[styleValues[styleIndex] ?? -1] ?? '',
      ]),
    );

    const visibility = styles.visibility.toLowerCase();
    const display = styles.display.toLowerCase();
    const isVisible = display !== 'none'
      && visibility !== 'hidden'
      && visibility !== 'collapse';

    if (!isVisible) continue;

    result.push({
      index: nodeIndex,
      parentIndex: nodes.parentIndex?.[nodeIndex] ?? -1,
      tagName: (snapshot.strings[nodes.nodeName?.[nodeIndex] ?? -1] ?? '').toUpperCase(),
      attributes: decodeAttributes(nodes.attributes?.[nodeIndex], snapshot.strings),
      rect: { x, y, width, height },
      styles,
      paintOrder: layout.paintOrders?.[layoutIndex] ?? 0,
      isVisible,
    });
  }

  return result;
}
