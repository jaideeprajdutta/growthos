"""Experiment routes tests — create, list, update, delete, results."""


def create_company(client):
    return client.post("/api/v1/companies", json={"name": "Alpha"}).json()


def test_experiment_lifecycle_with_results(client):
    company = create_company(client)
    response = client.post(
        f"/api/v1/companies/{company['id']}/experiments",
        json={"hypothesis": "B2B leads increase with outbound email", "status": "running"},
    )
    assert response.status_code == 201
    experiment = response.json()
    assert experiment["hypothesis"].startswith("B2B leads")
    assert experiment["status"] == "running"
    list_response = client.get(f"/api/v1/companies/{company['id']}/experiments")
    assert [item["id"] for item in list_response.json()] == [experiment["id"]]
    put_response = client.put(
        f"/api/v1/companies/{company['id']}/experiments/{experiment['id']}",
        json={"status": "completed", "actualOutcome": "Lift of 8%"},
    )
    assert put_response.status_code == 200
    assert put_response.json()["actualOutcome"] == "Lift of 8%"
    result_response = client.post(
        f"/api/v1/companies/{company['id']}/experiments/{experiment['id']}/results",
        json={"outcome": "conversion improved", "metrics": {"lift": "8%", "sampleSize": 500}},
    )
    assert result_response.status_code == 201
    assert result_response.json()["metrics"]["lift"] == "8%"
    results_response = client.get(
        f"/api/v1/companies/{company['id']}/experiments/{experiment['id']}/results"
    )
    assert len(results_response.json()) == 1


def test_experiment_delete(client):
    company = create_company(client)
    experiment = client.post(
        f"/api/v1/companies/{company['id']}/experiments",
        json={"hypothesis": "H"},
    ).json()
    response = client.delete(f"/api/v1/companies/{company['id']}/experiments/{experiment['id']}")
    assert response.status_code == 204
