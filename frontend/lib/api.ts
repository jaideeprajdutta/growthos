import type {
  ActivityLogEntry,
  Company,
  CompanyCreate,
  CompanyProfile,
  CompanyProfileCreate,
  CompanyStats,
  CompanyUpdate,
  ExecutionAction,
  ExecutionActionCreate,
  ExecutionActionUpdate,
  Experiment,
  ExperimentCreate,
  ExperimentUpdate,
  GrowthObjective,
  GrowthObjectiveType,
  Integration,
  IntegrationCreate,
  IntegrationUpdate,
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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
};
