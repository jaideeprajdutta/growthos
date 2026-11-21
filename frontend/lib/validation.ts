// Zod validation schemas — GrowthOS forms, mirrors the backend pydantic schemas.

import { z } from "zod";

export const BUSINESS_MODELS = ["saas", "ecommerce", "agency", "services", "other"] as const;
export const COMPANY_STAGES = ["startup", "growth", "scale", "enterprise"] as const;
export const REVENUE_MODELS = ["subscription", "transactional", "freemium", "sales_led", "other"] as const;
export const GROWTH_OBJECTIVE_TYPES = [
  "revenue",
  "customer_acquisition",
  "conversion",
  "retention",
  "lead_generation",
  "other",
] as const;

const shortText = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);

export const companyBasicsSchema = z.object({
  name: z.string().min(1, "Company name is required.").max(120, "Company names can be at most 120 characters."),
  website: z.string().url("Enter a valid website URL, e.g. https://example.com").optional(),
  businessModel: z.enum(BUSINESS_MODELS),
  industry: shortText(200),
});

export const businessOverviewSchema = z.object({
  companyDescription: shortText(2000),
  targetAudience: shortText(2000),
  mainProductOrService: shortText(2000),
});

export const companyContextSchema = z.object({
  businessStage: z.enum(COMPANY_STAGES),
  revenueModel: z.enum(REVENUE_MODELS),
  primaryMarket: shortText(2000),
});

export const companyProfileSchema = z.object({
  positioningStatement: shortText(2000).optional(),
  competitiveLandscape: shortText(2000).optional(),
  marketContext: shortText(2000).optional(),
  productDescription: shortText(2000).optional(),
});

/** Full company edit form (company + business context). */
export const companyProfileFormSchema = z.object({
  ...companyBasicsSchema.shape,
  ...businessOverviewSchema.shape,
  ...companyContextSchema.shape,
  ...companyProfileSchema.shape,
});

/** Company fields collected during onboarding. */
export const companyFormSchema = z.object({
  ...companyBasicsSchema.shape,
  ...businessOverviewSchema.shape,
  ...companyContextSchema.shape,
});

export const growthObjectiveSchema = z
  .object({
    objectiveType: z.enum(GROWTH_OBJECTIVE_TYPES),
    customObjective: shortText(500).optional(),
    isPrimary: z.boolean(),
  })
  .refine((data) => data.objectiveType !== "other" || Boolean(data.customObjective), {
    message: "Describe your custom objective.",
    path: ["customObjective"],
  });

export const growthObjectivesSchema = z.array(growthObjectiveSchema).min(1, "Add at least one growth objective.");

export const OPPORTUNITY_STATUSES = ["proposed", "prioritized", "selected", "in_progress", "completed", "rejected", "discovered", "reviewing", "approved", "experimenting", "implemented", "archived", "deferred"] as const;
export const EXPERIMENT_STATUSES = ["proposed", "approved", "running", "completed", "paused", "cancelled"] as const;
export const EXPERIMENT_TASK_STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;
export const TASK_APPROVAL_STATUSES = ["not_required", "pending", "approved", "rejected"] as const;
export const LEARNING_OUTCOMES = ["successful", "unsuccessful", "inconclusive"] as const;
export const MEASUREMENT_DATA_SOURCES = ["user_entered", "imported", "connected_source", "estimate"] as const;
export const MEASUREMENT_DIRECTIONS = ["increase", "decrease"] as const;
export const EXECUTION_ACTION_STATUSES = ["pending", "approved", "scheduled", "in_progress", "executed", "failed", "paused", "cancelled"] as const;
export const INTEGRATION_PROVIDERS = ["google_analytics", "google_search_console", "hubspot", "shopify", "stripe", "meta_ads", "google_ads", "crm", "other"] as const;
export const INTEGRATION_STATUSES = ["configured", "connected", "disconnected", "error"] as const;

export const EXPERIMENT_TRANSITIONS: Record<string, readonly string[]> = {
  proposed: ["approved", "cancelled"],
  approved: ["running", "paused", "cancelled"],
  running: ["paused", "completed", "cancelled"],
  paused: ["running", "cancelled"],
  completed: [],
  cancelled: [],
};

export const TASK_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["in_progress", "blocked"],
  in_progress: ["completed", "blocked", "pending"],
  blocked: ["in_progress", "pending"],
  completed: [],
};

export const opportunitySchema = z.object({
  title: z.string().min(1, "Title is required.").max(200, "Titles can be at most 200 characters."),
  description: shortText(2000).optional(),
  supportingEvidence: shortText(2000).optional(),
  expectedImpact: shortText(2000).optional(),
  confidence: z.number().int().min(0, "Confidence is between 0 and 100.").max(100, "Confidence is between 0 and 100.").default(50),
  effort: z.number().int().min(1, "Effort is between 1 and 10.").max(10, "Effort is between 1 and 10.").default(5),
  risk: shortText(2000).optional(),
  priorityScore: z.number().int().min(0).max(100).nullable().optional(),
  status: z.enum(OPPORTUNITY_STATUSES).default("proposed"),
  recommendedNextAction: shortText(2000).optional(),
});

export const experimentSchema = z
  .object({
    name: shortText(200).optional(),
    description: shortText(4000).optional(),
    hypothesis: z.string().min(1, "Hypothesis is required.").max(1000),
    problem: shortText(2000).optional(),
    action: shortText(2000).optional(),
    targetAudience: shortText(2000).optional(),
    successMetric: shortText(2000).optional(),
    baseline: shortText(2000).optional(),
    target: shortText(2000).optional(),
    guardrailMetrics: z.array(shortText(200)).max(20).default([]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    owner: shortText(200).optional(),
    status: z.enum(EXPERIMENT_STATUSES).default("proposed"),
    opportunityId: z.string().optional(),
    diagnosticFindingId: z.string().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });

export const executionActionSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: shortText(2000).optional(),
  status: z.enum(EXECUTION_ACTION_STATUSES).default("pending"),
});

export const integrationSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS),
  status: z.enum(INTEGRATION_STATUSES),
  settings: z.string().optional(),
  connectedAt: z.string().optional(),
});

export const experimentTaskSchema = z.object({
  title: z.string().min(1, "Task title is required.").max(200),
  description: shortText(2000).optional(),
  owner: shortText(200).optional(),
  dueDate: z.string().optional(),
  requiresApproval: z.boolean().default(true),
});

export const taskNoteSchema = z.object({
  note: z.string().min(1, "Add a note before saving.").max(2000),
  evidenceIds: z.array(z.string()).default([]),
});

const numberOrNull = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : typeof value === "number" ? value : Number(value)),
  z.number().finite().nullable()
);

const requiredNumber = z.preprocess(
  (value) => (typeof value === "number" ? value : Number(value)),
  z.number().finite()
);

export const measurementSchema = z
  .object({
    outcome: shortText(2000).optional(),
    baselineValue: numberOrNull,
    observedValue: requiredNumber,
    targetValue: numberOrNull,
    direction: z.enum(MEASUREMENT_DIRECTIONS).default("increase"),
    measurementStart: z.string().optional(),
    measurementEnd: z.string().optional(),
    dataSource: z.enum(MEASUREMENT_DATA_SOURCES).default("user_entered"),
    sourceName: shortText(200).optional(),
    evidenceIds: z.array(z.string()).default([]),
    notes: shortText(2000).optional(),
    interpretation: shortText(4000).optional(),
  })
  .refine((data) => !data.measurementStart || !data.measurementEnd || data.measurementEnd >= data.measurementStart, {
    message: "Measurement end must be after the start.",
    path: ["measurementEnd"],
  });

export const csvTextSchema = z.string().min(1, "Paste CSV data to preview.").max(1_000_000);

export const learningSchema = z.object({
  outcome: z.enum(LEARNING_OUTCOMES),
  metTarget: z.union([z.boolean(), z.null()]).default(null),
  whatChanged: shortText(4000),
  evidenceIds: z.array(z.string()).default([]),
  whatWorked: shortText(4000),
  whatFailed: shortText(4000),
  nextSteps: shortText(4000),
});

export const statusNoteSchema = z.object({
  note: shortText(2000).optional(),
});
