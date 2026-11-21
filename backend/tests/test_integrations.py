"""Integration routes tests — create, update, validation."""


def test_integration_lifecycle(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(
        f"/api/v1/companies/{company['id']}/integrations",
        json={"provider": "hubspot", "status": "configured", "settings": {"apiVersion": "v3"}},
    )
    assert response.status_code == 201
    integration = response.json()
    assert integration["provider"] == "hubspot"
    assert integration["settings"]["apiVersion"] == "v3"
    put_response = client.put(
        f"/api/v1/companies/{company['id']}/integrations/{integration['id']}",
        json={"status": "disconnected"},
    )
    assert put_response.status_code == 200
    assert put_response.json()["status"] == "disconnected"


def test_integration_validation(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(
        f"/api/v1/companies/{company['id']}/integrations",
        json={"provider": "not-a-provider"},
    )
    assert response.status_code == 422
