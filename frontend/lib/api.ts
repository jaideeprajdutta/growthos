import type { Company, CompanyCreate, CompanyUpdate } from "@/types";

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
};
