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

export type OpportunityStatus = "proposed" | "prioritized" | "selected" | "in_progress" | "completed" | "rejected" | "discovered" | "reviewing" | "approved" | "experimenting" | "implemented" | "archived" | "deferred";

export interface ResearchRun {
  id: string;
  companyId: string;
  sourceUrl: string;
  status: "pending" | "running" | "completed" | "partially_completed" | "failed";
  pageCount: number;
  pagesScanned: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchPage {
  id: string;
  runId: string;
  url: string;
  status: "pending" | "scanned" | "failed";
  statusDetail: string | null;
  title: string | null;
  extractedText: string | null;
  wordCount: number;
  extractedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  companyId: string;
  runId: string;
  sourceUrl: string;
  sourceTitle: string | null;
  sourceType: string;
  extractedStatement: string | null;
  supportingExcerpt: string | null;
  observationDate: string | null;
  collectedAt: string;
  dimension: string;
  classification: string;
  reliability: Record<string, unknown> | null;
  verificationStatus: string;
}

export interface IntelligenceProfile {
  id: string;
  companyId: string;
  version: number;
  source: string | null;
  generatedAt: string | null;
  refreshedAt: string | null;
  valueProposition: string | null;
  targetAudience: string | null;
  customerPainPoints: string | null;
  geographicMarkets: string | null;
  companySize: string | null;
  keyDifferentiators: string | null;
  pricingModel: string | null;
  mainProducts: string | null;
  customerAcquisitionChannels: string | null;
  salesConversionJourney: string | null;
  retentionApproach: string | null;
  competitors: string | null;
  strategicPriorities: string | null;
}

export interface IntelligenceFinding {
  id: string;
  companyId: string;
  runId: string | null;
  dimension: string;
  title: string;
  category: string;
  description: string | null;
  confidence: number | null;
  severity: string | null;
  evidenceIds: string[];
  rootCauseHypothesis: string | null;
  validationMethod: string | null;
  suggestedNextStep: string | null;
  status: string;
}

export interface IntelligenceReport {
  id: string;
  companyId: string;
  version: number;
  generatedAt: string;
  executiveSummary: string | null;
  sections: Record<string, string>;
  findings: IntelligenceFinding[];
  findingsCount: number;
}

export interface DiagnosticRun {
  id: string;
  companyId: string;
  runAt: string;
  model: string | null;
  aiUsage: Record<string, number> | null;
  inputSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticFinding {
  id: string;
  runId: string;
  companyId: string;
  dimension: string;
  problemStatement: string | null;
  description: string | null;
  category: string;
  severity: number | null;
  confidence: number | null;
  evidenceIds: string[];
  rootCauseHypothesis: string | null;
  validationMethod: string | null;
  suggestedNextStep: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityDetail {
  opportunity: Opportunity;
  evidenceIds: string[];
  diagnosticFindingId: string | null;
  experiments: Experiment[];
}

export interface LinkEvidenceOut {
  opportunityId: string;
  linkedEvidenceIds: string[];
}

export interface AIStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
}

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
