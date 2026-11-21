"""Research API schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models import ResearchPage, ResearchRun

ResearchStatus = Literal["pending", "running", "completed", "partially_completed", "failed"]
ResearchPageStatus = Literal["pending", "scanned", "failed"]


class ResearchRunStart(BaseModel):
    source_url: str = Field(min_length=1, max_length=512)


class ResearchRunOut(BaseModel):
    id: str
    companyId: str
    sourceUrl: str
    status: ResearchStatus
    pageCount: int
    pagesScanned: int
    errorMessage: Optional[str]
    startedAt: Optional[datetime]
    finishedAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime


class ResearchPageOut(BaseModel):
    id: str
    runId: str
    url: str
    status: ResearchPageStatus
    statusDetail: Optional[str]
    title: Optional[str]
    extractedText: Optional[str]
    wordCount: int
    extractedAt: Optional[datetime]
    durationMs: Optional[int]
    createdAt: datetime
    updatedAt: datetime


def research_run_out(run: ResearchRun) -> ResearchRunOut:
    return ResearchRunOut(
        id=run.id,
        companyId=run.company_id,
        sourceUrl=run.source_url,
        status=run.status,
        pageCount=run.pages_scanned,
        pagesScanned=run.pages_scanned,
        errorMessage=run.error_message,
        startedAt=run.started_at,
        finishedAt=run.finished_at,
        createdAt=run.created_at,
        updatedAt=run.updated_at,
    )


def research_page_out(page: ResearchPage) -> ResearchPageOut:
    return ResearchPageOut(
        id=page.id,
        runId=page.run_id,
        url=page.url,
        status=page.status,
        statusDetail=page.status_detail,
        title=page.title,
        extractedText=page.extracted_text,
        wordCount=page.word_count,
        extractedAt=page.extracted_at,
        durationMs=page.duration_ms,
        createdAt=page.created_at,
        updatedAt=page.updated_at,
    )
