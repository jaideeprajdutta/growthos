"""Company domain tests — profiles and growth objectives."""


def create_company(client, name="Alpha", **extra):
    return client.post("/api/v1/companies", json={"name": name, **extra}).json()


def test_company_profile_create_and_read(client):
    company = create_company(client)
    response = client.post(
        f"/api/v1/companies/{company['id']}/profile",
        json={"positioningStatement": "We power growth", "marketContext": "Mid-market SaaS"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["positioningStatement"] == "We power growth"
    assert data["marketContext"] == "Mid-market SaaS"
    get_response = client.get(f"/api/v1/companies/{company['id']}/profile")
    assert get_response.status_code == 200
    assert get_response.json()["marketContext"] == "Mid-market SaaS"


def test_growth_objective_lifecycle(client):
    company = create_company(client)
    response = client.post(
        f"/api/v1/companies/{company['id']}/growth-objectives",
        json={"objectiveType": "revenue", "isPrimary": True},
    )
    assert response.status_code == 201
    objective = response.json()
    assert objective["objectiveType"] == "revenue"
    assert objective["isPrimary"] is True
    list_response = client.get(f"/api/v1/companies/{company['id']}/growth-objectives")
    assert [item["id"] for item in list_response.json()] == [objective["id"]]
    put_response = client.put(
        f"/api/v1/companies/{company['id']}/growth-objectives/{objective['id']}",
        json={"objectiveType": "retention"},
    )
    assert put_response.status_code == 200
    assert put_response.json()["objectiveType"] == "retention"
    delete_response = client.delete(
        f"/api/v1/companies/{company['id']}/growth-objectives/{objective['id']}"
    )
    assert delete_response.status_code == 204
    assert client.get(f"/api/v1/companies/{company['id']}/growth-objectives").json() == []


def test_growth_objective_requires_valid_type(client):
    company = create_company(client)
    response = client.post(
        f"/api/v1/companies/{company['id']}/growth-objectives",
        json={"objectiveType": "not-a-type"},
    )
    assert response.status_code == 422
