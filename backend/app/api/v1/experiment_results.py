"""Experiment result routes: structured measurements and explicit CSV import."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_workspace
from app.db.session import get_db
from app.measurement.csv_import import parse_measurement_csv
from app.models.workspaces import Workspace
from app.repositories import company_repository, experiment_result_repository
from app.schemas.experiment_results import (
    CsvPreviewOut,
    CsvPreviewRequest,
    ExperimentResultCreate,
    ExperimentResultOut,
    ExperimentResultUpdate,
    MeasurementImport,
    experiment_result_out,
)

router = APIRouter(tags=["experiment-results"])


@router.post(
    "/companies/{company_id}/experiments/{experiment_id}/results/preview-csv",
    response_model=CsvPreviewOut,
)
def preview_measurement_csv(
    company_id: str,
    experiment_id: str,
    data: CsvPreviewRequest,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> CsvPreviewOut:
    """Validate and preview CSV rows without writing anything."""
    company_repository.require_company(db, company_id, workspace.id)
    rows, errors, headers = parse_measurement_csv(data.csv)
    return CsvPreviewOut(rows=rows, errors=errors, headers=headers)


@router.post(
    "/companies/{company_id}/experiments/{experiment_id}/results/import",
    response_model=list[ExperimentResultOut],
    status_code=201,
)
def import_measurements(
    company_id: str,
    experiment_id: str,
    data: MeasurementImport,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[ExperimentResultOut]:
    """Import only rows the user has already previewed and confirmed."""
    company_repository.require_company(db, company_id, workspace.id)
    results = experiment_result_repository.import_measurements(db, experiment_id, company_id, data)
    return [experiment_result_out(result) for result in results]


@router.post(
    "/companies/{company_id}/experiments/{experiment_id}/results",
    response_model=ExperimentResultOut,
    status_code=201,
)
def create_experiment_result(
    company_id: str,
    experiment_id: str,
    data: ExperimentResultCreate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentResultOut:
    company_repository.require_company(db, company_id, workspace.id)
    result = experiment_result_repository.create_experiment_result(db, experiment_id, company_id, data)
    return experiment_result_out(result)


@router.get("/companies/{company_id}/experiments/{experiment_id}/results", response_model=list[ExperimentResultOut])
def list_experiment_results(
    company_id: str,
    experiment_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> list[ExperimentResultOut]:
    company_repository.require_company(db, company_id, workspace.id)
    return [
        experiment_result_out(result)
        for result in experiment_result_repository.list_experiment_results(db, experiment_id, company_id)
    ]


@router.put(
    "/companies/{company_id}/experiments/{experiment_id}/results/{result_id}",
    response_model=ExperimentResultOut,
)
def update_experiment_result(
    company_id: str,
    experiment_id: str,
    result_id: str,
    data: ExperimentResultUpdate,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> ExperimentResultOut:
    company_repository.require_company(db, company_id, workspace.id)
    result = experiment_result_repository.update_experiment_result(db, result_id, experiment_id, company_id, data)
    return experiment_result_out(result)


@router.delete(
    "/companies/{company_id}/experiments/{experiment_id}/results/{result_id}",
    status_code=204,
)
def delete_experiment_result(
    company_id: str,
    experiment_id: str,
    result_id: str,
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(get_workspace),
) -> None:
    company_repository.require_company(db, company_id, workspace.id)
    experiment_result_repository.delete_experiment_result(db, result_id, experiment_id, company_id)
