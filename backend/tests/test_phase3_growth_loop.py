"""Phase 3 growth-loop tests: experiment → approval → execution → measurement → learning."""

from sqlalchemy import select

from app.models import Company, CompanyIntelligenceProfile

VALID_CSV = """baseline,observed,target,direction,measurement_start,measurement_end,source_name,notes
10,8,9,decrease,2026-11-01T00:00:00Z,2026-11-07T00:00:00Z,CSV export,Week one
"""


def _create_company(client, name="Growth Co"):
    response = client.post("/api/v1/companies", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()


def _create_opportunity(client, company_id):
    response = client.post(
        f"/api/v1/companies/{company_id}/opportunities",
        json={
            "title": "Improve onboarding conversion",
            "description": "Reduce friction in the first-run checklist.",
            "supportingEvidence": "Support tickets mention a confusing setup step.",
            "expectedImpact": "Increase completed activations.",
            "confidence": 80,
            "effort": 3,
            "status": "approved",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _create_experiment(client, company_id, opportunity_id):
    response = client.post(
        f"/api/v1/companies/{company_id}/experiments",
        json={
            "name": "Checklist simplification test",
            "description": "Test a shorter setup checklist against the current flow.",
            "hypothesis": "A shorter checklist increases activation.",
            "problem": "Users abandon during setup.",
            "action": "Remove two optional steps from the first-run checklist.",
            "targetAudience": "New trial users",
            "successMetric": "Activation rate",
            "baseline": "40%",
            "target": "50%",
            "guardrailMetrics": ["Support ticket volume", "Time to first value"],
            "startDate": "2026-11-10T00:00:00Z",
            "endDate": "2026-11-24T00:00:00Z",
            "owner": "Growth lead",
            "status": "proposed",
            "opportunityId": opportunity_id,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_full_growth_loop_is_persisted_and_feeds_back(client, db):
    company = _create_company(client)
    company_id = company["id"]
    opportunity = _create_opportunity(client, company_id)
    db.add(
        CompanyIntelligenceProfile(
            company_id=company_id, version=1, source="test", experiment_outcomes=[]
        )
    )
    db.commit()

    experiment = _create_experiment(client, company_id, opportunity["id"])
    assert experiment["name"] == "Checklist simplification test"
    assert experiment["guardrailMetrics"] == ["Support ticket volume", "Time to first value"]
    assert experiment["opportunityId"] == opportunity["id"]
    assert len(experiment["decisionHistory"]) == 1

    invalid_start = client.post(
        f"/api/v1/companies/{company_id}/experiments/{experiment['id']}/status",
        json={"status": "running", "note": "Trying to skip approval"},
    )
    assert invalid_start.status_code == 422

    approved = client.post(
        f"/api/v1/companies/{company_id}/experiments/{experiment['id']}/status",
        json={"status": "approved", "note": "Approved in weekly growth review"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["approvedBy"] == "Local User"
    assert approved.json()["approvedAt"] is not None
    assert len(approved.json()["decisionHistory"]) == 2

    tasks_base = f"/api/v1/companies/{company_id}/experiments/{experiment['id']}/tasks"
    gated = client.post(
        tasks_base,
        json={
            "title": "Ship updated checklist",
            "description": "Deploy the two-step removal to the treatment group.",
            "owner": "Product",
            "dueDate": "2026-11-12T00:00:00Z",
            "requiresApproval": True,
        },
    )
    assert gated.status_code == 201, gated.text
    gated_task = gated.json()
    assert gated_task["approvalStatus"] == "pending"

    manual = client.post(
        tasks_base,
        json={"title": "Notify support team", "owner": "CS", "requiresApproval": False},
    )
    assert manual.status_code == 201, manual.text
    manual_task = manual.json()
    assert manual_task["approvalStatus"] == "not_required"

    blocked = client.post(
        f"{tasks_base}/{gated_task['id']}/status",
        json={"status": "in_progress"},
    )
    assert blocked.status_code == 422
    assert "approval" in blocked.json()["detail"].lower()

    approved_task = client.post(
        f"{tasks_base}/{gated_task['id']}/approve",
        json={"note": "Change window confirmed"},
    )
    assert approved_task.status_code == 200, approved_task.text
    assert approved_task.json()["approvedBy"] == "Local User"
    assert approved_task.json()["approvalStatus"] == "approved"

    for task_id in (gated_task["id"], manual_task["id"]):
        for status in ("in_progress", "completed"):
            response = client.post(f"{tasks_base}/{task_id}/status", json={"status": status, "note": status})
            assert response.status_code == 200, response.text
    task_list = client.get(tasks_base).json()
    done = next(task for task in task_list if task["id"] == gated_task["id"])
    assert done["status"] == "completed"
    assert done["executedBy"] == "Local User"
    assert done["executedAt"] is not None
    assert any(note["kind"] == "approval" for note in done["notes"])

    exp_base = f"/api/v1/companies/{company_id}/experiments/{experiment['id']}"
    running = client.post(f"{exp_base}/status", json={"status": "running"})
    assert running.status_code == 200, running.text
    finished = client.post(f"{exp_base}/status", json={"status": "completed", "note": "Measurement window closed"})
    assert finished.status_code == 200, finished.text
    assert finished.json()["completedAt"] is not None

    result_response = client.post(
        f"{exp_base}/results",
        json={
            "baselineValue": 100,
            "observedValue": 126,
            "targetValue": 125,
            "direction": "increase",
            "measurementStart": "2026-11-10T00:00:00Z",
            "measurementEnd": "2026-11-24T00:00:00Z",
            "dataSource": "estimate",
            "sourceName": "Activation dashboard screenshot",
            "notes": "Manual read at the end of the window.",
            "interpretation": "Observed value exceeded the recorded target.",
        },
    )
    assert result_response.status_code == 201, result_response.text
    result = result_response.json()
    assert result["absoluteChange"] == 26
    assert result["percentChange"] == 26
    assert result["targetAttainmentPct"] == 104
    assert result["metTarget"] is True
    assert result["dataSource"] == "estimate"

    preview = client.post(f"{exp_base}/results/preview-csv", json={"csv": VALID_CSV})
    assert preview.status_code == 200, preview.text
    assert preview.json()["errors"] == []
    assert len(preview.json()["rows"]) == 1
    assert client.get(f"{exp_base}/results").json().__len__() == 1

    imported = client.post(
        f"{exp_base}/results/import",
        json={"rows": preview.json()["rows"], "sourceName": "CSV export"},
    )
    assert imported.status_code == 201, imported.text
    imported_result = imported.json()[0]
    assert imported_result["dataSource"] == "imported"
    assert imported_result["sourceName"] == "CSV export"
    assert imported_result["percentChange"] == -20
    assert imported_result["targetAttainmentPct"] == 200
    assert imported_result["metTarget"] is True
    assert len(client.get(f"{exp_base}/results").json()) == 2

    learning = client.post(
        f"{exp_base}/learning",
        json={
            "outcome": "successful",
            "metTarget": True,
            "whatChanged": "Activation rose from 40% to 50.4% with no support increase.",
            "whatWorked": "Removing optional steps reduced hesitation.",
            "whatFailed": "The welcome email was not changed.",
            "nextSteps": "Roll out to all new users and monitor for two weeks.",
        },
    )
    assert learning.status_code == 201, learning.text
    assert learning.json()["recordedBy"] == "Local User"

    detail = client.get(exp_base).json()
    assert detail["experiment"]["outcome"] == "successful"
    assert len(detail["tasks"]) == 2
    assert len(detail["results"]) == 2
    assert detail["learning"]["outcome"] == "successful"

    updated_opportunity = client.get(
        f"/api/v1/companies/{company_id}/opportunities/{opportunity['id']}"
    ).json()["opportunity"]
    assert updated_opportunity["lastLearningOutcome"] == "successful"
    assert "Activation rose" in updated_opportunity["lastLearningSummary"]
    assert updated_opportunity["outcomeAdjustment"] == 5
    assert updated_opportunity["priorityScore"] == 68

    profile = db.execute(
        select(CompanyIntelligenceProfile).where(CompanyIntelligenceProfile.company_id == company_id)
    ).scalar_one()
    assert len(profile.experiment_outcomes) == 1
    assert profile.experiment_outcomes[0]["outcome"] == "successful"
    assert profile.experiment_outcomes[0]["experimentId"] == experiment["id"]

    stats = client.get(f"/api/v1/companies/{company_id}/stats")
    assert stats.status_code == 200, stats.text
    payload = stats.json()
    assert payload["totalExperiments"] == 1
    assert payload["completedExperiments"] == 1
    assert payload["tasksTotal"] == 2
    assert payload["tasksCompleted"] == 2
    assert payload["tasksAwaitingApproval"] == 0
    assert payload["measurementsRecorded"] == 2
    assert payload["successfulExperiments"] == 1
    assert payload["outcomesBySource"]["estimate"] == 1
    assert payload["outcomesBySource"]["imported"] == 1
    assert payload["experimentSummaries"][0]["latestMeasurement"]["dataSource"] == "imported"


def test_lifecycle_validation_and_cross_company_isolation(client):
    first = _create_company(client, "First Co")
    second = _create_company(client, "Second Co")
    other_opportunity = _create_opportunity(client, second["id"])
    experiment = _create_experiment(client, first["id"], None)

    exp_base = f"/api/v1/companies/{first['id']}/experiments/{experiment['id']}"
    assert client.post(f"{exp_base}/status", json={"status": "completed"}).status_code == 422
    cancelled = client.post(f"{exp_base}/status", json={"status": "cancelled"})
    assert cancelled.status_code == 200
    assert client.post(f"{exp_base}/status", json={"status": "running"}).status_code == 422

    assert client.get(
        f"/api/v1/companies/{second['id']}/experiments/{experiment['id']}"
    ).status_code == 404
    assert client.post(
        f"/api/v1/companies/{second['id']}/experiments/{experiment['id']}/status",
        json={"status": "running"},
    ).status_code == 404

    invalid_dates = client.post(
        f"/api/v1/companies/{first['id']}/experiments",
        json={
            "hypothesis": "Bad dates",
            "startDate": "2026-11-20T00:00:00Z",
            "endDate": "2026-11-01T00:00:00Z",
        },
    )
    assert invalid_dates.status_code == 422

    invalid_link = client.post(
        f"/api/v1/companies/{first['id']}/experiments",
        json={"hypothesis": "Bad link", "opportunityId": other_opportunity["id"]},
    )
    assert invalid_link.status_code == 422

    invalid_evidence = client.post(
        f"{exp_base}/results",
        json={"outcome": "Recorded", "evidenceIds": ["not-an-evidence-id"]},
    )
    assert invalid_evidence.status_code == 422


def test_csv_preview_reports_errors_and_never_persists(client):
    company = _create_company(client, "CSV Co")
    experiment = _create_experiment(client, company["id"], None)
    exp_base = f"/api/v1/companies/{company['id']}/experiments/{experiment['id']}"

    bad_headers = client.post(
        f"{exp_base}/results/preview-csv", json={"csv": "foo,bar\n1,2\n"}
    )
    assert bad_headers.status_code == 200
    assert "Missing required column(s)" in bad_headers.json()["errors"][0]

    bad_row = client.post(
        f"{exp_base}/results/preview-csv",
        json={"csv": "baseline,observed,target\n10,not-a-number,12\n"},
    )
    assert bad_row.status_code == 200
    assert bad_row.json()["rows"] == []
    assert any("Row 2" in error for error in bad_row.json()["errors"])

    assert client.get(f"{exp_base}/results").json() == []
