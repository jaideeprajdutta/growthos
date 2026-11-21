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
export const EXECUTION_ACTION_STATUSES = ["pending", "approved", "scheduled", "in_progress", "executed", "failed", "paused", "cancelled"] as const;
export const INTEGRATION_PROVIDERS = ["google_analytics", "google_search_console", "hubspot", "shopify", "stripe", "meta_ads", "google_ads", "crm", "other"] as const;
export const INTEGRATION_STATUSES = ["configured", "connected", "disconnected", "error"] as const;

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

export const experimentSchema = z.object({
  hypothesis: z.string().min(1, "Hypothesis is required.").max(1000),
  problem: shortText(2000).optional(),
  action: shortText(2000).optional(),
  targetAudience: shortText(2000).optional(),
  successMetric: shortText(2000).optional(),
  baseline: shortText(2000).optional(),
  target: shortText(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(EXPERIMENT_STATUSES).default("proposed"),
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
