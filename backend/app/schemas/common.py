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
ExperimentTaskStatus = Literal["pending", "in_progress", "completed", "blocked"]
TaskApprovalStatus = Literal["not_required", "pending", "approved", "rejected"]
LearningOutcome = Literal["successful", "unsuccessful", "inconclusive"]
MeasurementDataSource = Literal["user_entered", "imported", "connected_source", "estimate"]
MeasurementDirection = Literal["increase", "decrease"]
IntegrationProvider = Literal["google_analytics", "google_search_console", "hubspot", "shopify", "stripe", "meta_ads", "google_ads", "crm", "other"]
IntegrationStatus = Literal["configured", "connected", "disconnected", "error"]
