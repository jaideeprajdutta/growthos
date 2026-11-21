"""Models package: imports every model so Base.metadata knows the schema."""

from app.models.activity_log import ActivityLogEntry
from app.models.base import Base, TimestampMixin, new_id, utc_now
from app.models.companies import Company
from app.models.company_intelligence_profiles import CompanyIntelligenceProfile
from app.models.company_profiles import CompanyProfile
from app.models.diagnostics import DiagnosticFinding, DiagnosticRun
from app.models.evidence import Evidence
from app.models.experiment_results import ExperimentResult
from app.models.experiments import Experiment
from app.models.execution_actions import ExecutionAction
from app.models.growth_objectives import GrowthObjective
from app.models.integrations import Integration
from app.models.intelligence_findings import IntelligenceFinding
from app.models.intelligence_reports import IntelligenceReport
from app.models.opportunities import Opportunity
from app.models.opportunity_evidence import OpportunityEvidence
from app.models.research_pages import ResearchPage
from app.models.research_runs import ResearchRun
from app.models.workspaces import User, Workspace

__all__ = [
    "ActivityLogEntry",
    "Base",
    "Company",
    "CompanyIntelligenceProfile",
    "CompanyProfile",
    "DiagnosticFinding",
    "DiagnosticRun",
    "Evidence",
    "ExperimentResult",
    "Experiment",
    "ExecutionAction",
    "GrowthObjective",
    "Integration",
    "IntelligenceFinding",
    "IntelligenceReport",
    "Opportunity",
    "OpportunityEvidence",
    "ResearchPage",
    "ResearchRun",
    "TimestampMixin",
    "User",
    "Workspace",
    "new_id",
    "utc_now",
]
