"""Evidence route tests (app/api/v1/evidence.py)."""

from app.models import Evidence, ResearchRun
from app.models.base import utc_now
from tests.helpers import make_company


def test_list_and_get_evidence(client, db):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    run = ResearchRun(company_id=company["id"], source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    evidence = Evidence(
        run_id=run.id,
        company_id=company["id"],
        source_url="https://8.8.8.8/page",
        source_type="website",
        dimension="website",
        extracted_statement="Homepage positioning statement.",
        supporting_excerpt="...excerpt...",
        classification="observed",
        verification_status="unverified",
        collected_at=utc_now(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    listed = client.get(f"/api/v1/companies/{company['id']}/evidence").json()
    assert [e["id"] for e in listed] == [evidence.id]
    detail = client.get(f"/api/v1/companies/{company['id']}/evidence/{evidence.id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["sourceUrl"] == "https://8.8.8.8/page"
    assert body["dimension"] == "website"
    assert body["classification"] == "observed"
    missing = client.get(f"/api/v1/companies/{company['id']}/evidence/nope")
    assert missing.status_code == 404
