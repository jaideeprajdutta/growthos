"""Company CRUD tests — create, list, get, update, delete and validation."""


def test_create_company_returns_camel_case_fields(client):
    response = client.post(
        "/api/v1/companies",
        json={"name": "Acme Co", "website": "https://acme.dev", "businessModel": "saas"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Acme Co"
    assert data["website"] == "https://acme.dev"
    assert data["businessModel"] == "saas"
    assert data["isActive"] is False
    assert data["businessStage"] == "startup"
    assert data["revenueModel"] == "other"


def test_create_company_requires_name(client):
    response = client.post("/api/v1/companies", json={"website": "https://acme.dev"})
    assert response.status_code == 422


def test_create_duplicate_company_name_is_409(client):
    assert client.post("/api/v1/companies", json={"name": "Acme Co"}).status_code == 201
    response = client.post("/api/v1/companies", json={"name": "Acme Co"})
    assert response.status_code == 409


def test_get_company(client):
    created = client.post("/api/v1/companies", json={"name": "Acme Co"}).json()
    response = client.get(f"/api/v1/companies/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
    assert response.json()["name"] == "Acme Co"


def test_get_missing_company_is_404(client):
    response = client.get("/api/v1/companies/does-not-exist")
    assert response.status_code == 404


def test_list_companies(client):
    client.post("/api/v1/companies", json={"name": "Alpha"})
    client.post("/api/v1/companies", json={"name": "Beta"})
    response = client.get("/api/v1/companies")
    assert response.status_code == 200
    assert [company["name"] for company in response.json()] == ["Alpha", "Beta"]


def test_update_company(client):
    created = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.put(
        f"/api/v1/companies/{created['id']}",
        json={"name": "Renamed", "businessModel": "ecommerce"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Renamed"
    assert data["businessModel"] == "ecommerce"


def test_update_missing_company_is_404(client):
    response = client.put("/api/v1/companies/does-not-exist", json={"name": "X"})
    assert response.status_code == 404


def test_delete_company(client):
    created = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.delete(f"/api/v1/companies/{created['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/v1/companies/{created['id']}").status_code == 404


def test_validation_error_shape(client):
    response = client.post("/api/v1/companies", json={"name": ""})
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert any("name" in str(item.get("field")) for item in detail)
