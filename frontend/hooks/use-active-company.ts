"use client";

import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import type { Company } from "@/types";

/** The active (or first) company in the workspace, from the same list the shell uses. */
export function useActiveCompany(): { company: Company | null; loading: boolean; error: string | null } {
  const companies = useApi<Company[]>(() => growthosApi.listCompanies(), "companies");
  const company = companies.data?.find((item) => item.isActive) ?? companies.data?.[0] ?? null;
  return { company, loading: companies.loading, error: companies.error };
}
