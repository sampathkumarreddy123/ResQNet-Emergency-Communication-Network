"""API Integration Tests for Flask REST Endpoints."""

import pytest
from backend.app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "network" in data


def test_api_topology_and_reset(client):
    res = client.get("/api/network/topology")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total_nodes"] == 7
    assert data["total_links"] == 10

    reset_res = client.post("/api/network/reset")
    assert reset_res.status_code == 200


def test_api_dijkstra(client):
    res = client.post("/api/routing/dijkstra", json={"source": "N0", "destination": "N5"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["reachable"] is True
    assert data["path"][0] == "N0"
    assert data["path"][-1] == "N5"


def test_api_distance_vector(client):
    res = client.post("/api/routing/distance-vector", json={"max_iterations": 15})
    assert res.status_code == 200
    data = res.get_json()
    assert data["converged"] is True
    assert "routing_tables" in data


def test_api_crc_encode_verify(client):
    enc_res = client.post("/api/crc/encode", json={"data_bits": "110101", "generator": "10011"})
    assert enc_res.status_code == 200
    enc_data = enc_res.get_json()
    codeword = enc_data["codeword"]

    # Verify unaltered
    ver_res = client.post("/api/crc/verify", json={"codeword": codeword, "generator": "10011"})
    assert ver_res.status_code == 200
    assert ver_res.get_json()["is_valid"] is True

    # Verify with error injected at position 2
    corrupt_res = client.post("/api/crc/verify", json={"codeword": codeword, "generator": "10011", "corrupt_position": 2})
    assert corrupt_res.status_code == 200
    assert corrupt_res.get_json()["is_valid"] is False


def test_api_simulation_start_and_analytics(client):
    res = client.post("/api/simulation/start", json={
        "source": "N0",
        "destination": "N5",
        "num_packets": 6,
        "random_seed": 42
    })
    assert res.status_code == 201
    sim_data = res.get_json()
    assert "simulation_id" in sim_data
    assert "performance" in sim_data
    assert "packets" in sim_data
    assert len(sim_data["packets"]) == 6

    # Test summary analytics
    sum_res = client.get("/api/analytics/summary")
    assert sum_res.status_code == 200

    # Test CSV export
    export_res = client.get("/api/analytics/export")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("Content-Type", "")


def test_api_update_link_parameters(client):
    res = client.post("/api/network/links/update", json={
        "source": "N0",
        "destination": "N1",
        "cost": 7.5,
        "bandwidth": 250.0,
        "propagation_delay": 4.0,
        "loss_prob": 0.08
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    updated = data["link"]
    assert updated["cost"] == 7.5
    assert updated["bandwidth"] == 250.0
    assert updated["propagation_delay"] == 4.0
    assert updated["loss_prob"] == 0.08

