import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

export const expenseCreateSchema = z.object({
  amountCents: z.number().int().positive(),
  categoryId: z.string().uuid(),
  spentOn: isoDateSchema,
  payee: z.string().trim().min(1).max(200),
  note: z.string().trim().max(4000).optional(),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export const incomeCreateSchema = z.object({
  amountCents: z.number().int().positive(),
  earnedOn: isoDateSchema,
  source: z.string().trim().min(1).max(200),
  note: z.string().trim().max(4000).optional(),
});

export const incomeUpdateSchema = incomeCreateSchema.partial();

export const netWorthSnapshotCreateSchema = z.object({
  snapshotOn: isoDateSchema,
  totalAssetsCents: z.number().int().nonnegative(),
  totalLiabilitiesCents: z.number().int().nonnegative(),
  note: z.string().trim().max(4000).optional(),
});

export const netWorthSnapshotUpdateSchema = netWorthSnapshotCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const dateRangeQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const groupedReportQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  groupBy: z.enum(["month", "year"]).default("month"),
});
