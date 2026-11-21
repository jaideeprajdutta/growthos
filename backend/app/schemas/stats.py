"""Company statistics schema."""

from pydantic import BaseModel


class CompanyStatsOut(BaseModel):
    companyId: str
    opportunities: int
    runningExperiments: int
    objectives: int
