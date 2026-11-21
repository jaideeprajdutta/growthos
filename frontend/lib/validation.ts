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
