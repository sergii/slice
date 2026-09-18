import { z } from 'zod';

export const issueSchema = z.object({
  id: z.string().min(1),
  type: z.literal('horizontal-overflow'),
  severity: z.literal('error'),
  selector: z.string().min(1),
  tagName: z.string().min(1),
  side: z.enum(['right', 'left']),
  overflowPx: z.number().int().positive(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  viewportWidth: z.number().int().positive(),
  rootCauseId: z.string().min(1).optional(),
  evidence: z.object({
    documentScrollWidth: z.number().nonnegative(),
    documentClientWidth: z.number().nonnegative(),
    elementRight: z.number(),
    computedStyles: z.object({
      display: z.string(),
      position: z.string(),
      'overflow-x': z.string(),
    }),
    nearestScrollableAncestor: z.string().nullable(),
  }),
});

export const viewportResultSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  status: z.enum(['pass', 'fail']),
  issues: z.array(issueSchema),
});

export const boundaryResultSchema = z.object({
  issueId: z.string().min(1),
  boundary: z.number().int().positive(),
  lastGoodWidth: z.number().int().positive(),
  firstBadWidth: z.number().int().positive(),
  probesUsed: z.number().int().nonnegative(),
});

const rootCauseObservationSchema = z.object({
  viewportWidth: z.number().int().positive(),
  overflowPx: z.number().int().positive(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  issueIds: z.array(z.string().min(1)).min(2),
});

const rootCauseBoundarySchema = z.object({
  boundary: z.number().int().positive(),
  lastGoodWidth: z.number().int().positive(),
  firstBadWidth: z.number().int().positive(),
  probesUsed: z.number().int().nonnegative(),
});

const rootCauseSchema = z.object({
  id: z.string().min(1),
  type: z.literal('horizontal-overflow'),
  severity: z.literal('error'),
  selector: z.string().min(1),
  tagName: z.string().min(1),
  side: z.enum(['right', 'left']),
  issueIds: z.array(z.string().min(1)).min(2),
  observations: z.array(rootCauseObservationSchema).min(1),
  boundaries: z.array(rootCauseBoundarySchema),
});

export const resultsSchema = z.object({
  version: z.literal(1),
  url: z.string().min(1),
  timestamp: z.string().datetime(),
  userAgent: z.string().min(1),
  summary: z.object({
    viewportsChecked: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    totalIssues: z.number().int().nonnegative(),
    rootCauseGroups: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  }),
  viewports: z.array(viewportResultSchema),
  boundaries: z.array(boundaryResultSchema),
  rootCauses: z.array(rootCauseSchema),
});
