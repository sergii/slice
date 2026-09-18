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

export interface IssueEvidence {
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

export interface Issue {
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
  evidence: IssueEvidence;
}

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

export interface RootCauseObservation {
  viewportWidth: number;
  overflowPx: number;
  bbox: [number, number, number, number];
  issueIds: string[];
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
