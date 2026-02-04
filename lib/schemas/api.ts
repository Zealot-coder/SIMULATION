import { z } from "zod";

export const OverviewQuerySchema = z.object({
  orgId: z.string().uuid(),
});

export const EventsListQuery = z.object({
  orgId: z.string().uuid(),
  type: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
});

export const RunsListQuery = z.object({
  orgId: z.string().uuid(),
  status: z.string().optional(),
  workflowId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
});

export const ReplayBody = z.object({
  reason: z.string().min(3),
});

export type OverviewQuery = z.infer<typeof OverviewQuerySchema>;
export type EventsListQueryType = z.infer<typeof EventsListQuery>;
export type RunsListQueryType = z.infer<typeof RunsListQuery>;
export type ReplayBodyType = z.infer<typeof ReplayBody>;
