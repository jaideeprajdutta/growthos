import type {
  ActivityLogEntry,
  AIStatus,
  Company,
  CompanyCreate,
  CompanyProfile,
  CompanyProfileCreate,
  CompanyStats,
  CompanyUpdate,
  DiagnosticFinding,
  DiagnosticRun,
  Evidence,
  ExecutionAction,
  ExecutionActionCreate,
  ExecutionActionUpdate,
  CsvPreview,
  Experiment,
  ExperimentCreate,
  ExperimentDetail,
  ExperimentLearning,
  ExperimentLearningCreate,
  ExperimentLearningUpdate,
  ExperimentResult,
  ExperimentResultCreate,
  ExperimentResultUpdate,
  ExperimentStatusUpdate,
  ExperimentTask,
  ExperimentTaskCreate,
  ExperimentTaskUpdate,
  ExperimentUpdate,
  GrowthObjective,
  GrowthObjectiveType,
  Integration,
  IntegrationCreate,
  IntegrationUpdate,
  IntelligenceProfile,
  IntelligenceReport,
  LinkEvidenceOut,
  MeasurementImport,
  Opportunity,
  OpportunityCreate,
  OpportunityDetail,
  OpportunityUpdate,
  ResearchPage,
  ResearchRun,
  TaskNoteCreate,
  TaskStatusUpdate,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8300";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, init?: { status?: number }) {
    super(message);
    this.name = "ApiError";
    this.status = init?.status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      detail = typeof body?.detail === "string" ? body.detail : undefined;
    } catch {
      /* body is not JSON */
    }
    throw new ApiError(`${response.status}${detail ? `: ${detail}` : ""}`, { status: response.status });
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const growthosApi = {
  health: (): Promise<{ status: string }> => request("/health"),
  listCompanies: (): Promise<Company[]> => request("/companies"),
  getCompany: (id: string): Promise<Company> => request(`/companies/${encodeURIComponent(id)}`),
  createCompany: (company: CompanyCreate): Promise<Company> => request("/companies", { method: "POST", body: JSON.stringify(company) }),
  updateCompany: (id: string, company: CompanyUpdate): Promise<Company> =>
    request(`/companies/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(company) }),
  deleteCompany: (id: string): Promise<void> => request(`/companies/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getCompanyProfile: (id: string): Promise<CompanyProfile | null> =>
    request(`/companies/${encodeURIComponent(id)}/profile`),
  upsertCompanyProfile: (companyId: string, profile: CompanyProfileCreate): Promise<CompanyProfile> =>
    request(`/companies/${encodeURIComponent(companyId)}/profile`, { method: "POST", body: JSON.stringify(profile) }),

  listGrowthObjectives: (companyId: string): Promise<GrowthObjective[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/growth-objectives`),
  createGrowthObjective: (
    companyId: string,
    objective: { objectiveType: GrowthObjectiveType; customObjective?: string; isPrimary?: boolean }
  ): Promise<GrowthObjective> =>
    request(`/companies/${encodeURIComponent(companyId)}/growth-objectives`, {
      method: "POST",
      body: JSON.stringify(objective),
    }),
  deleteGrowthObjective: (companyId: string, objectiveId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/growth-objectives/${encodeURIComponent(objectiveId)}`, { method: "DELETE" }),

  listActivity: (companyId: string, limit = 50): Promise<ActivityLogEntry[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/activity?limit=${limit}`),

  getCompanyStats: (id: string): Promise<CompanyStats> => request(`/companies/${encodeURIComponent(id)}/stats`),

  listOpportunities: (companyId: string): Promise<Opportunity[]> => request(`/companies/${encodeURIComponent(companyId)}/opportunities`),
  createOpportunity: (companyId: string, opportunity: OpportunityCreate): Promise<Opportunity> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities`, { method: "POST", body: JSON.stringify(opportunity) }),
  updateOpportunity: (companyId: string, opportunityId: string, opportunity: OpportunityUpdate): Promise<Opportunity> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(opportunityId)}`, { method: "PUT", body: JSON.stringify(opportunity) }),
  deleteOpportunity: (companyId: string, opportunityId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(opportunityId)}`, { method: "DELETE" }),

  listExperiments: (companyId: string): Promise<Experiment[]> => request(`/companies/${encodeURIComponent(companyId)}/experiments`),
  createExperiment: (companyId: string, experiment: ExperimentCreate): Promise<Experiment> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments`, { method: "POST", body: JSON.stringify(experiment) }),
  updateExperiment: (companyId: string, experimentId: string, experiment: ExperimentUpdate): Promise<Experiment> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}`, { method: "PUT", body: JSON.stringify(experiment) }),
  deleteExperiment: (companyId: string, experimentId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}`, { method: "DELETE" }),

  getExperimentDetail: (companyId: string, experimentId: string): Promise<ExperimentDetail> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}`),
  changeExperimentStatus: (companyId: string, experimentId: string, update: ExperimentStatusUpdate): Promise<Experiment> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/status`, {
      method: "POST",
      body: JSON.stringify(update),
    }),

  listTasks: (companyId: string, experimentId: string): Promise<ExperimentTask[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks`),
  createTask: (companyId: string, experimentId: string, task: ExperimentTaskCreate): Promise<ExperimentTask> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    }),
  updateTask: (companyId: string, experimentId: string, taskId: string, task: ExperimentTaskUpdate): Promise<ExperimentTask> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      body: JSON.stringify(task),
    }),
  deleteTask: (companyId: string, experimentId: string, taskId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    }),
  changeTaskStatus: (
    companyId: string,
    experimentId: string,
    taskId: string,
    update: TaskStatusUpdate
  ): Promise<ExperimentTask> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks/${encodeURIComponent(taskId)}/status`, {
      method: "POST",
      body: JSON.stringify(update),
    }),
  approveTask: (companyId: string, experimentId: string, taskId: string, note?: string): Promise<ExperimentTask> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks/${encodeURIComponent(taskId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ note: note ?? "" }),
    }),
  rejectTask: (companyId: string, experimentId: string, taskId: string, note?: string): Promise<ExperimentTask> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks/${encodeURIComponent(taskId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ note: note ?? "" }),
    }),
  addTaskNote: (companyId: string, experimentId: string, taskId: string, note: TaskNoteCreate): Promise<ExperimentTask> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/tasks/${encodeURIComponent(taskId)}/notes`, {
      method: "POST",
      body: JSON.stringify(note),
    }),

  createMeasurement: (
    companyId: string,
    experimentId: string,
    result: ExperimentResultCreate
  ): Promise<ExperimentResult> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/results`, {
      method: "POST",
      body: JSON.stringify(result),
    }),
  listMeasurements: (companyId: string, experimentId: string): Promise<ExperimentResult[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/results`),
  updateMeasurement: (
    companyId: string,
    experimentId: string,
    resultId: string,
    result: ExperimentResultUpdate
  ): Promise<ExperimentResult> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/results/${encodeURIComponent(resultId)}`, {
      method: "PUT",
      body: JSON.stringify(result),
    }),
  deleteMeasurement: (companyId: string, experimentId: string, resultId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/results/${encodeURIComponent(resultId)}`, {
      method: "DELETE",
    }),
  previewMeasurementCsv: (companyId: string, experimentId: string, csv: string): Promise<CsvPreview> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/results/preview-csv`, {
      method: "POST",
      body: JSON.stringify({ csv }),
    }),
  importMeasurements: (
    companyId: string,
    experimentId: string,
    importData: MeasurementImport
  ): Promise<ExperimentResult[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/results/import`, {
      method: "POST",
      body: JSON.stringify(importData),
    }),

  getLearning: (companyId: string, experimentId: string): Promise<ExperimentLearning | null> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/learning`),
  createLearning: (companyId: string, experimentId: string, learning: ExperimentLearningCreate): Promise<ExperimentLearning> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/learning`, {
      method: "POST",
      body: JSON.stringify(learning),
    }),
  updateLearning: (
    companyId: string,
    experimentId: string,
    learning: ExperimentLearningUpdate
  ): Promise<ExperimentLearning> =>
    request(`/companies/${encodeURIComponent(companyId)}/experiments/${encodeURIComponent(experimentId)}/learning`, {
      method: "PUT",
      body: JSON.stringify(learning),
    }),

  listExecutionActions: (companyId: string): Promise<ExecutionAction[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/execution-actions`),
  createExecutionAction: (companyId: string, action: ExecutionActionCreate): Promise<ExecutionAction> =>
    request(`/companies/${encodeURIComponent(companyId)}/execution-actions`, { method: "POST", body: JSON.stringify(action) }),
  updateExecutionAction: (companyId: string, actionId: string, action: ExecutionActionUpdate): Promise<ExecutionAction> =>
    request(`/companies/${encodeURIComponent(companyId)}/execution-actions/${encodeURIComponent(actionId)}`, { method: "PUT", body: JSON.stringify(action) }),
  deleteExecutionAction: (companyId: string, actionId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/execution-actions/${encodeURIComponent(actionId)}`, { method: "DELETE" }),

  listIntegrations: (companyId: string): Promise<Integration[]> => request(`/companies/${encodeURIComponent(companyId)}/integrations`),
  createIntegration: (companyId: string, integration: IntegrationCreate): Promise<Integration> =>
    request(`/companies/${encodeURIComponent(companyId)}/integrations`, { method: "POST", body: JSON.stringify(integration) }),
  updateIntegration: (companyId: string, integrationId: string, integration: IntegrationUpdate): Promise<Integration> =>
    request(`/companies/${encodeURIComponent(companyId)}/integrations/${encodeURIComponent(integrationId)}`, { method: "PUT", body: JSON.stringify(integration) }),
  deleteIntegration: (companyId: string, integrationId: string): Promise<void> =>
    request(`/companies/${encodeURIComponent(companyId)}/integrations/${encodeURIComponent(integrationId)}`, { method: "DELETE" }),

  getAIStatus: (): Promise<AIStatus> => request("/ai/status"),

  startResearch: (companyId: string, sourceUrl: string): Promise<ResearchRun> =>
    request(`/companies/${encodeURIComponent(companyId)}/research`, { method: "POST", body: JSON.stringify({ source_url: sourceUrl }) }),
  listResearchRuns: (companyId: string): Promise<ResearchRun[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/research/runs`),
  listResearchPages: (companyId: string, runId: string): Promise<ResearchPage[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/research/runs/${encodeURIComponent(runId)}/pages`),
  retryResearchPage: (companyId: string, pageId: string): Promise<ResearchPage> =>
    request(`/companies/${encodeURIComponent(companyId)}/research/pages/${encodeURIComponent(pageId)}/retry`, { method: "POST" }),

  listEvidence: (companyId: string): Promise<Evidence[]> => request(`/companies/${encodeURIComponent(companyId)}/evidence`),
  getEvidence: (companyId: string, evidenceId: string): Promise<Evidence> =>
    request(`/companies/${encodeURIComponent(companyId)}/evidence/${encodeURIComponent(evidenceId)}`),

  getIntelligenceProfile: (companyId: string): Promise<IntelligenceProfile | null> =>
    request(`/companies/${encodeURIComponent(companyId)}/intelligence`),
  generateIntelligenceReport: (companyId: string, forceRefresh = false): Promise<IntelligenceReport> =>
    request(`/companies/${encodeURIComponent(companyId)}/intelligence/generate?force_refresh=${forceRefresh}`, { method: "POST" }),
  listIntelligenceReports: (companyId: string): Promise<IntelligenceReport[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/reports`),

  listDiagnosticRuns: (companyId: string): Promise<DiagnosticRun[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/diagnostic-runs`),
  listDiagnosticFindings: (companyId: string): Promise<DiagnosticFinding[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/diagnostic-findings`),
  generateDiagnostics: (companyId: string): Promise<DiagnosticRun> =>
    request(`/companies/${encodeURIComponent(companyId)}/diagnostics/generate`, { method: "POST" }),

  generateOpportunities: (companyId: string): Promise<Opportunity[]> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/generate`, { method: "POST" }),

  getOpportunityDetail: (companyId: string, opportunityId: string): Promise<OpportunityDetail> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(opportunityId)}`),
  updateOpportunityStatus: (companyId: string, opportunityId: string, status: Opportunity["status"]): Promise<Opportunity> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(opportunityId)}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  createExperimentForOpportunity: (companyId: string, opportunityId: string): Promise<Experiment> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(opportunityId)}/experiments`, { method: "POST" }),
  linkEvidenceToOpportunity: (companyId: string, opportunityId: string, evidenceIds: string[]): Promise<LinkEvidenceOut> =>
    request(`/companies/${encodeURIComponent(companyId)}/opportunities/${encodeURIComponent(opportunityId)}/evidence`, { method: "POST", body: JSON.stringify({ evidenceIds }) }),
};
