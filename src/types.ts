export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutNode {
  index: number;
  parentIndex: number;
  tagName: string;
  attributes: Record<string, string>;
  rect: Rect;
  styles: Record<string, string>;
  paintOrder: number;
  isVisible: boolean;
  nthChild?: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface HorizontalOverflowEvidence {
  documentScrollWidth: number;
  documentClientWidth: number;
  elementRight: number;
  computedStyles: {
    display: string;
    position: string;
    'overflow-x': string;
  };
  nearestScrollableAncestor: string | null;
}

export interface HorizontalOverflowIssue {
  id: string;
  type: 'horizontal-overflow';
  severity: 'error';
  selector: string;
  tagName: string;
  side: 'right' | 'left';
  overflowPx: number;
  bbox: [number, number, number, number];
  viewportWidth: number;
  rootCauseId?: string;
  evidence: HorizontalOverflowEvidence;
}

export interface FixedElementCollisionIssue {
  id: string;
  type: 'fixed-element-collision';
  severity: 'error';
  selector: string;
  otherSelector: string;
  tagName: string;
  otherTagName: string;
  overlapWidthPx: number;
  overlapHeightPx: number;
  overlapAreaPx: number;
  bbox: [number, number, number, number];
  otherBbox: [number, number, number, number];
  viewportWidth: number;
  evidence: {
    position: 'fixed';
    otherPosition: 'fixed';
    zIndex: string;
    otherZIndex: string;
  };
}

export interface FixedContentOcclusionIssue {
  id: string;
  type: 'fixed-content-occlusion';
  severity: 'error';
  selector: string;
  targetSelector: string;
  tagName: string;
  targetTagName: string;
  overlapWidthPx: number;
  overlapHeightPx: number;
  overlapAreaPx: number;
  targetCoveragePct: number;
  bbox: [number, number, number, number];
  targetBbox: [number, number, number, number];
  viewportWidth: number;
  evidence: {
    position: 'fixed';
    targetPosition: string;
    zIndex: string;
    targetZIndex: string;
    paintOrder: number;
    targetPaintOrder: number;
  };
}

export type Issue =
  | HorizontalOverflowIssue
  | FixedElementCollisionIssue
  | FixedContentOcclusionIssue;

export interface ViewportResult {
  width: number;
  height: number;
  status: 'pass' | 'fail';
  issues: Issue[];
}

export interface BoundaryResult {
  issueId: string;
  boundary: number;
  lastGoodWidth: number;
  firstBadWidth: number;
  probesUsed: number;
}

export interface CssSourceReference {
  stylesheet: string | null;
  selector: string;
  property: string;
  value: string;
}

export interface RootCauseDiagnosis {
  kind: 'min-width-constraint';
  property: 'min-width';
  value: string;
  suggestion: string;
  source: CssSourceReference | null;
}

export interface RootCauseObservation {
  viewportWidth: number;
  overflowPx: number;
  bbox: [number, number, number, number];
  issueIds: string[];
  computedWidthPx: number;
  availableWidthPx: number;
}

export interface RootCauseBoundary {
  boundary: number;
  lastGoodWidth: number;
  firstBadWidth: number;
  probesUsed: number;
}

export interface RootCause {
  id: string;
  type: 'horizontal-overflow';
  severity: 'error';
  selector: string;
  tagName: string;
  side: 'right' | 'left';
  issueIds: string[];
  observations: RootCauseObservation[];
  boundaries: RootCauseBoundary[];
  diagnosis?: RootCauseDiagnosis;
}

export interface SliceResults {
  version: 1;
  url: string;
  timestamp: string;
  userAgent: string;
  summary: {
    viewportsChecked: number;
    passed: number;
    failed: number;
    totalIssues: number;
    rootCauseGroups: number;
    durationMs: number;
  };
  viewports: ViewportResult[];
  boundaries: BoundaryResult[];
  rootCauses: RootCause[];
}
