"""Execution action routes tests — create, list, update."""


def test_execution_action_lifecycle(client):
    company = client.post("/api/v1/companies", json={"name": "Alpha"}).json()
    response = client.post(
        f"/api/v1/companies/{company['id']}/execution-actions",
        json={"title": "Add pricing page variants", "status": "pending"},
    )
    assert response.status_code == 201
    action = response.json()
    assert action["status"] == "pending"
    list_response = client.get(f"/api/v1/companies/{company['id']}/execution-actions")
    assert [item["id"] for item in list_response.json()] == [action["id"]]
    put_response = client.put(
        f"/api/v1/companies/{company['id']}/execution-actions/{action['id']}",
        json={"status": "executed"},
    )
    assert put_response.status_code == 200
    assert put_response.json()["status"] == "executed"
    assert put_response.json()["executedAt"] is not None
