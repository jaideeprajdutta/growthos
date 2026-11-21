"""Opportunity routes tests — create, list, update, delete."""


def create_company(client):
    return client.post("/api/v1/companies", json={"name": "Alpha"}).json()


def test_opportunity_lifecycle(client):
    company = create_company(client)
    response = client.post(
        f"/api/v1/companies/{company['id']}/opportunities",
        json={"title": "Win enterprise deals", "confidence": 70, "status": "prioritized"},
    )
    assert response.status_code == 201
    opportunity = response.json()
    assert opportunity["title"] == "Win enterprise deals"
    assert opportunity["confidence"] == 70
    assert opportunity["status"] == "prioritized"
    list_response = client.get(f"/api/v1/companies/{company['id']}/opportunities")
    assert [item["id"] for item in list_response.json()] == [opportunity["id"]]
    put_response = client.put(
        f"/api/v1/companies/{company['id']}/opportunities/{opportunity['id']}",
        json={"status": "in_progress"},
    )
    assert put_response.status_code == 200
    assert put_response.json()["status"] == "in_progress"
    delete_response = client.delete(
        f"/api/v1/companies/{company['id']}/opportunities/{opportunity['id']}"
    )
    assert delete_response.status_code == 204


def test_opportunity_validation(client):
    company = create_company(client)
    response = client.post(
        f"/api/v1/companies/{company['id']}/opportunities",
        json={"title": "x", "confidence": 101},
    )
    assert response.status_code == 422
