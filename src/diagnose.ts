import type { LayoutNode, RootCauseDiagnosisCandidate } from './types.js';

export interface RootCauseMeasurement {
  diagnosis: RootCauseDiagnosisCandidate | null;
  computedWidthPx: number;
  availableWidthPx: number;
}

function parsePixelValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function diagnoseHorizontalOverflowRoot(
  node: LayoutNode,
  viewportWidth: number,
): RootCauseMeasurement {
  const computedWidthPx = Math.round(node.rect.width);
  const availableWidthPx = Math.max(0, Math.round(viewportWidth - Math.max(0, node.rect.x)));
  const minWidthValue = node.styles['min-width']?.trim() ?? '';
  const minWidthPx = parsePixelValue(minWidthValue);
  const widthValue = node.styles.width?.trim() ?? '';
  const widthPx = parsePixelValue(widthValue);

  if (
    minWidthPx !== null &&
    minWidthPx > availableWidthPx + 1 &&
    node.rect.width + 1 >= minWidthPx
  ) {
    return {
      diagnosis: {
        kind: 'min-width-constraint',
        property: 'min-width',
        value: minWidthValue,
        suggestion: 'remove or constrain min-width, or let the layout reflow',
      },
      computedWidthPx,
      availableWidthPx,
    };
  }

  if (widthPx !== null && widthPx > availableWidthPx + 1 && node.rect.width + 1 >= widthPx) {
    return {
      diagnosis: {
        kind: 'fixed-width-constraint',
        property: 'width',
        value: widthValue,
        suggestion: 'remove the fixed width, constrain it, or let the layout size responsively',
      },
      computedWidthPx,
      availableWidthPx,
    };
  }

  return {
    diagnosis: null,
    computedWidthPx,
    availableWidthPx,
  };
}
