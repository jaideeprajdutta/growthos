"""Evidence API schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models import Evidence


class EvidenceOut(BaseModel):
    id: str
    companyId: str
    runId: str
    sourceUrl: str
    sourceTitle: Optional[str]
    sourceType: str
    extractedStatement: Optional[str]
    supportingExcerpt: Optional[str]
    observationDate: Optional[str]
    collectedAt: datetime
    dimension: str
    classification: str
    reliability: Optional[dict]
    verificationStatus: str


def evidence_out(evidence: Evidence) -> EvidenceOut:
    return EvidenceOut(
        id=evidence.id,
        companyId=evidence.company_id,
        runId=evidence.run_id,
        sourceUrl=evidence.source_url,
        sourceTitle=evidence.source_title,
        sourceType=evidence.source_type,
        extractedStatement=evidence.extracted_statement,
        supportingExcerpt=evidence.supporting_excerpt,
        observationDate=evidence.observation_date,
        collectedAt=evidence.collected_at,
        dimension=evidence.dimension,
        classification=evidence.classification,
        reliability=evidence.reliability_json,
        verificationStatus=evidence.verification_status,
    )
