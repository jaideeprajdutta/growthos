"""Activity log route tests."""


def test_activity_log_lists_company_activity(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.get(f"/api/v1/companies/{company['id']}/activity")
    assert response.status_code == 200
    assert response.json() != []
    titles = [entry["title"] for entry in response.json()]
    assert any("Alpha" in title for title in titles)


def test_activity_log_pagination(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    page = client.get(f"/api/v1/companies/{company['id']}/activity?limit=1").json()
    assert len(page) == 1
