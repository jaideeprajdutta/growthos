export type CompanyBusinessModel = "saas" | "ecommerce" | "agency" | "services" | "other";

export type CompanyStage = "startup" | "growth" | "scale" | "enterprise";

export type RevenueModel = "subscription" | "transactional" | "freemium" | "sales_led" | "other";

export type GrowthObjectiveType = "revenue" | "customer_acquisition" | "conversion" | "retention" | "lead_generation" | "other";

export interface Company {
  id: string;
  name: string;
  website: string;
  isActive: boolean;
  businessModel: CompanyBusinessModel;
  industry: string;
  businessStage: CompanyStage;
  revenueModel: RevenueModel;
  companyDescription: string;
  targetAudience: string;
  mainProductOrService: string;
  primaryMarket: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreate {
  name: string;
  website?: string;
  isActive?: boolean;
  businessModel?: CompanyBusinessModel;
  industry?: string;
  businessStage?: CompanyStage;
  revenueModel?: RevenueModel;
  companyDescription?: string;
  targetAudience?: string;
  mainProductOrService?: string;
  primaryMarket?: string;
}

export interface CompanyUpdate {
  name?: string;
  website?: string;
  isActive?: boolean;
  businessModel?: CompanyBusinessModel;
  industry?: string;
  businessStage?: CompanyStage;
  revenueModel?: RevenueModel;
  companyDescription?: string;
  targetAudience?: string;
  mainProductOrService?: string;
  primaryMarket?: string;
}

export interface CompanyProfileCreate {
  positioningStatement?: string;
  competitiveLandscape?: string;
  marketContext?: string;
  productDescription?: string;
}

export interface CompanyProfile {
  id: string;
  companyId: string;
  positioningStatement: string;
  competitiveLandscape: string;
  marketContext: string;
  productDescription: string;
}

export interface GrowthObjective {
  id: string;
  companyId: string;
  objectiveType: GrowthObjectiveType;
  customObjective?: string;
  isPrimary: boolean;
}

export interface ActivityLogEntry {
  id: string;
  companyId: string;
  actorId?: string;
  action: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CompanyStats {
  companyId: string;
  opportunities: number;
  runningExperiments: number;
  objectives: number;
}

export type OpportunityStatus = "proposed" | "prioritized" | "selected" | "in_progress" | "completed" | "rejected";

export type ExperimentStatus = "proposed" | "approved" | "running" | "completed" | "paused" | "cancelled";

export type ExecutionActionStatus = "pending" | "approved" | "scheduled" | "in_progress" | "executed" | "failed" | "paused" | "cancelled";

export type IntegrationProvider =
  | "google_analytics"
  | "google_search_console"
  | "hubspot"
  | "shopify"
  | "stripe"
  | "meta_ads"
  | "google_ads"
  | "crm"
  | "other";

export type IntegrationStatus = "configured" | "connected" | "disconnected" | "error";

export interface Opportunity {
  id: string;
  companyId: string;
  title: string;
  description: string;
  supportingEvidence: string;
  expectedImpact: string;
  confidence: number;
  effort: number;
  risk: string;
  priorityScore: number | null;
  status: OpportunityStatus;
  recommendedNextAction: string;
}

export interface OpportunityCreate {
  title: string;
  description?: string;
  supportingEvidence?: string;
  expectedImpact?: string;
  confidence?: number;
  effort?: number;
  risk?: string;
  priorityScore?: number | null;
  status?: OpportunityStatus;
  recommendedNextAction?: string;
}

export type OpportunityUpdate = Partial<OpportunityCreate>;

export interface Experiment {
  id: string;
  companyId: string;
  hypothesis: string;
  problem: string;
  action: string;
  targetAudience: string;
  successMetric: string;
  baseline: string;
  target: string;
  startDate: string | null;
  endDate: string | null;
  status: ExperimentStatus;
  actualOutcome: string | null;
}

export interface ExperimentCreate {
  hypothesis: string;
  problem?: string;
  action?: string;
  targetAudience?: string;
  successMetric?: string;
  baseline?: string;
  target?: string;
  startDate?: string;
  endDate?: string;
  status?: ExperimentStatus;
}

export type ExperimentUpdate = Partial<ExperimentCreate>;

export interface ExecutionAction {
  id: string;
  companyId: string;
  title: string;
  description: string;
  status: ExecutionActionStatus;
  executedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface ExecutionActionCreate {
  title: string;
  description?: string;
  status?: ExecutionActionStatus;
}

export type ExecutionActionUpdate = Partial<ExecutionActionCreate>;

export interface Integration {
  id: string;
  companyId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  settings: Record<string, unknown> | null;
  connectedAt: string | null;
}

export interface IntegrationCreate {
  provider: IntegrationProvider;
  status?: IntegrationStatus;
  settings?: Record<string, unknown>;
  connectedAt?: string;
}

export type IntegrationUpdate = Partial<IntegrationCreate>;
