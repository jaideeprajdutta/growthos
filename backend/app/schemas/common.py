"""Shared schema enums — mirrors ``frontend/types/index.ts``."""

from typing import Literal

CompanyBusinessModel = Literal["saas", "ecommerce", "agency", "services", "other"]
CompanyStage = Literal["startup", "growth", "scale", "enterprise"]
RevenueModel = Literal["subscription", "transactional", "freemium", "sales_led", "other"]
GrowthObjectiveType = Literal["revenue", "customer_acquisition", "conversion", "retention", "lead_generation", "other"]
OpportunityStatus = Literal[
    "proposed",
    "prioritized",
    "selected",
    "in_progress",
    "completed",
    "rejected",
    "discovered",
    "reviewing",
    "approved",
    "experimenting",
    "implemented",
    "archived",
    "deferred",
]
ExperimentStatus = Literal["proposed", "approved", "running", "completed", "paused", "cancelled"]
ExecutionActionStatus = Literal["pending", "approved", "scheduled", "in_progress", "executed", "failed", "paused", "cancelled"]
IntegrationProvider = Literal["google_analytics", "google_search_console", "hubspot", "shopify", "stripe", "meta_ads", "google_ads", "crm", "other"]
IntegrationStatus = Literal["configured", "connected", "disconnected", "error"]
