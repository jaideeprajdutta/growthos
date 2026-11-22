export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  workspaceId: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

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

export interface ExperimentAnalyticsSummary {
  id: string;
  name: string;
  status: ExperimentStatus;
  opportunityId: string | null;
  opportunityTitle: string | null;
  learningOutcome: LearningOutcome | null;
  latestMeasurement: ExperimentResult | null;
  tasksTotal: number;
  tasksCompleted: number;
  tasksAwaitingApproval: number;
}

export interface CompanyStats {
  companyId: string;
  opportunities: number;
  runningExperiments: number;
  objectives: number;
  totalExperiments: number;
  completedExperiments: number;
  experimentsByStatus: Record<string, number>;
  opportunitiesByStatus: Record<string, number>;
  outcomesBySource: Record<string, number>;
  tasksTotal: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksBlocked: number;
  tasksAwaitingApproval: number;
  measurementsRecorded: number;
  successfulExperiments: number;
  unsuccessfulExperiments: number;
  inconclusiveExperiments: number;
  experimentSummaries: ExperimentAnalyticsSummary[];
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
export type ExperimentTaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type TaskApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type LearningOutcome = "successful" | "unsuccessful" | "inconclusive";
export type MeasurementDataSource = "user_entered" | "imported" | "connected_source" | "estimate";
export type MeasurementDirection = "increase" | "decrease";

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
  lastLearningOutcome: LearningOutcome | null;
  lastLearningSummary: string | null;
  outcomeAdjustment: number | null;
  createdAt?: string;
  updatedAt?: string;
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

export interface ExperimentDecision {
  from: ExperimentStatus | null;
  to: ExperimentStatus;
  status: ExperimentStatus;
  actor: string;
  at: string;
  note: string;
}

export interface Experiment {
  id: string;
  companyId: string;
  opportunityId: string | null;
  diagnosticFindingId: string | null;
  name: string;
  description: string;
  hypothesis: string;
  problem: string;
  action: string;
  targetAudience: string;
  successMetric: string;
  baseline: string;
  target: string;
  guardrailMetrics: string[];
  startDate: string | null;
  endDate: string | null;
  owner: string;
  status: ExperimentStatus;
  decisionHistory: ExperimentDecision[];
  approvedAt: string | null;
  approvedBy: string | null;
  completedAt: string | null;
  outcome: LearningOutcome | null;
  actualOutcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentCreate {
  name?: string;
  description?: string;
  hypothesis: string;
  problem?: string;
  action?: string;
  targetAudience?: string;
  successMetric?: string;
  baseline?: string;
  target?: string;
  guardrailMetrics?: string[];
  startDate?: string;
  endDate?: string;
  owner?: string;
  status?: ExperimentStatus;
  opportunityId?: string;
  diagnosticFindingId?: string;
}

export type ExperimentUpdate = Partial<ExperimentCreate> & { actualOutcome?: string };

export interface ExperimentStatusUpdate {
  status: ExperimentStatus;
  note?: string;
}

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

export interface TaskNote {
  at: string;
  actor: string;
  kind: "status" | "note" | "approval";
  text: string;
}

export interface ExperimentTask {
  id: string;
  companyId: string;
  experimentId: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string | null;
  status: ExperimentTaskStatus;
  requiresApproval: boolean;
  approvalStatus: TaskApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  executedBy: string | null;
  executedAt: string | null;
  notes: TaskNote[];
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentTaskCreate {
  title: string;
  description?: string;
  owner?: string;
  dueDate?: string;
  requiresApproval?: boolean;
}

export type ExperimentTaskUpdate = Partial<ExperimentTaskCreate>;

export interface TaskStatusUpdate {
  status: ExperimentTaskStatus;
  note?: string;
}

export interface TaskNoteCreate {
  note: string;
  evidenceIds?: string[];
}

export interface MeasurementRow {
  rowNumber?: number;
  baselineValue: number;
  observedValue: number;
  targetValue: number;
  direction: MeasurementDirection;
  measurementStart?: string | null;
  measurementEnd?: string | null;
  sourceName?: string;
  notes?: string;
}

export interface CsvPreview {
  headers: string[];
  rows: MeasurementRow[];
  errors: string[];
}

export interface MeasurementImport {
  rows: MeasurementRow[];
  sourceName: string;
}

export interface ExperimentResult {
  id: string;
  companyId: string;
  experimentId: string;
  outcome: string;
  metrics: Record<string, unknown> | null;
  baselineValue: number | null;
  observedValue: number | null;
  targetValue: number | null;
  direction: MeasurementDirection;
  measurementStart: string | null;
  measurementEnd: string | null;
  dataSource: MeasurementDataSource;
  sourceName: string;
  evidenceIds: string[];
  notes: string;
  interpretation: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  absoluteChange: number | null;
  percentChange: number | null;
  targetAttainmentPct: number | null;
  metTarget: boolean | null;
}

export interface ExperimentResultCreate {
  outcome?: string;
  baselineValue?: number | null;
  observedValue?: number | null;
  targetValue?: number | null;
  direction?: MeasurementDirection;
  measurementStart?: string;
  measurementEnd?: string;
  dataSource?: MeasurementDataSource;
  sourceName?: string;
  evidenceIds?: string[];
  notes?: string;
  interpretation?: string;
}

export type ExperimentResultUpdate = Partial<ExperimentResultCreate>;

export interface ExperimentLearning {
  id: string;
  companyId: string;
  experimentId: string;
  outcome: LearningOutcome;
  metTarget: boolean | null;
  whatChanged: string;
  evidenceIds: string[];
  whatWorked: string;
  whatFailed: string;
  nextSteps: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentLearningCreate {
  outcome: LearningOutcome;
  metTarget?: boolean | null;
  whatChanged?: string;
  evidenceIds?: string[];
  whatWorked?: string;
  whatFailed?: string;
  nextSteps?: string;
}

export type ExperimentLearningUpdate = Partial<ExperimentLearningCreate>;

export interface ExperimentDetail {
  experiment: Experiment;
  tasks: ExperimentTask[];
  results: ExperimentResult[];
  learning: ExperimentLearning | null;
}
