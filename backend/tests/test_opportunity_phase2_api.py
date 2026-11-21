"""Opportunity Phase-2 route tests: detail, status, experiments, evidence links."""

from app.models import Evidence, ResearchRun
from app.models.base import utc_now


def test_opportunity_detail_status_experiments_and_evidence(client, db):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    opp = client.post(f"/api/v1/companies/{company['id']}/opportunities", json={"title": "Opp A", "confidence": 60}).json()
    opp_id = opp["id"]

    detail = client.get(f"/api/v1/companies/{company['id']}/opportunities/{opp_id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["opportunity"]["title"] == "Opp A"
    assert body["evidenceIds"] == []
    assert body["diagnosticFindingId"] is None
    assert body["experiments"] == []

    for status in ("reviewing", "approved", "experimenting", "implemented", "archived", "deferred"):
        response = client.put(
            f"/api/v1/companies/{company['id']}/opportunities/{opp_id}/status", json={"status": status}
        )
        assert response.status_code == 200, status
        assert response.json()["status"] == status

    bad = client.put(f"/api/v1/companies/{company['id']}/opportunities/{opp_id}/status", json={"status": "nonsense"})
    assert bad.status_code == 422

    exp = client.post(f"/api/v1/companies/{company['id']}/opportunities/{opp_id}/experiments")
    assert exp.status_code == 201
    assert exp.json()["opportunityId"] == opp_id
    assert exp.json()["status"] == "proposed"

    run = ResearchRun(company_id=company["id"], source_url="https://8.8.8.8/")
    db.add(run)
    db.commit()
    db.refresh(run)
    evidence = Evidence(
        run_id=run.id,
        company_id=company["id"],
        source_url="https://8.8.8.8/e1",
        source_type="website",
        dimension="website",
        classification="observed",
        verification_status="unverified",
        collected_at=utc_now(),
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    response = client.post(
        f"/api/v1/companies/{company['id']}/opportunities/{opp_id}/evidence", json={"evidenceIds": [evidence.id]}
    )
    assert response.status_code == 200
    assert response.json()["linkedEvidenceIds"] == [evidence.id]

    detail = client.get(f"/api/v1/companies/{company['id']}/opportunities/{opp_id}").json()
    assert detail["evidenceIds"] == [evidence.id]
    assert len(detail["experiments"]) == 1

    missing = client.get(f"/api/v1/companies/{company['id']}/opportunities/nope")
    assert missing.status_code == 404
