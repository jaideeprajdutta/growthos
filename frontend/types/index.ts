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
  businessModel?: CompanyBusinessModel;
  industry?: string;
  businessStage?: CompanyStage;
  revenueModel?: RevenueModel;
  companyDescription?: string;
  targetAudience?: string;
  mainProductOrService?: string;
  primaryMarket?: string;
}

export interface GrowthObjective {
  id: string;
  companyId: string;
  objectiveType: GrowthObjectiveType;
  customObjective?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}
