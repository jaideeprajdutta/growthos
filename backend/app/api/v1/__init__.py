"""Versioned v1 API router: every GrowthOS route lives under /api/v1."""

from fastapi import APIRouter

from app.api.v1.ai import router as ai_router
from app.api.v1.activity_log import router as activity_log_router
from app.api.v1.auth import router as auth_router
from app.api.v1.companies import router as companies_router
from app.api.v1.company_profiles import router as company_profiles_router
from app.api.v1.diagnostics import router as diagnostics_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.experiment_learnings import router as experiment_learnings_router
from app.api.v1.experiment_results import router as experiment_results_router
from app.api.v1.experiment_tasks import router as experiment_tasks_router
from app.api.v1.experiments import router as experiments_router
from app.api.v1.execution_actions import router as execution_actions_router
from app.api.v1.growth_objectives import router as growth_objectives_router
from app.api.v1.health import router as health_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.opportunities import router as opportunities_router
from app.api.v1.research import router as research_router

router = APIRouter()
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(ai_router)
router.include_router(companies_router)
router.include_router(company_profiles_router)
router.include_router(research_router)
router.include_router(evidence_router)
router.include_router(intelligence_router)
router.include_router(diagnostics_router)
router.include_router(growth_objectives_router)
router.include_router(opportunities_router)
router.include_router(experiments_router)
router.include_router(experiment_results_router)
router.include_router(experiment_tasks_router)
router.include_router(experiment_learnings_router)
router.include_router(execution_actions_router)
router.include_router(integrations_router)
router.include_router(activity_log_router)
