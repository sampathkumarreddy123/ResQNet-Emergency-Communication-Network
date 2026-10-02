"""Comprehensive Automated Test Suite for Emergency Communication Network.

Covers all 14 required test areas:
1. Dijkstra shortest path.
2. Dijkstra unreachable destination.
3. Distance Vector convergence.
4. Routing table updates after link failure.
5. CRC valid frame.
6. CRC corrupted frame.
7. Go-Back-N lost frame retransmission.
8. Go-Back-N corrupted frame recovery.
9. Leaky Bucket queue overflow.
10. Packet loss calculation.
11. Throughput calculation.
12. Average delay calculation.
13. No-route packet handling.
14. Reproducibility using random seed.
"""

import pytest
from backend.simulation.network import NetworkTopology
from backend.simulation.link_failure import LinkFailureManager
from backend.simulation.packet import Packet
from backend.simulation.simulator import NetworkSimulator
from backend.simulation.performance import PerformanceAnalyzer
from backend.algorithms.dijkstra import dijkstra_shortest_path
from backend.algorithms.distance_vector import run_distance_vector
from backend.algorithms.crc import crc_encode, crc_verify, inject_error
from backend.algorithms.go_back_n import simulate_go_back_n
from backend.algorithms.leaky_bucket import simulate_leaky_bucket


# 1. Dijkstra shortest path
def test_1_dijkstra_shortest_path():
    topology = NetworkTopology()
    adj = topology.get_adjacency_list(only_active=True)
    result = dijkstra_shortest_path(adj, source="N0", destination="N5")

    assert result["reachable"] is True
    assert result["path"][0] == "N0"
    assert result["path"][-1] == "N5"
    assert result["total_cost"] > 0
    # Expected route N0 -> N1 -> N3 -> N5 (cost: 2 + 3 + 2 = 7)
    # or N0 -> N2 -> N3 -> N5 (cost: 4 + 1 + 2 = 7)
    assert result["total_cost"] == 7.0


# 2. Dijkstra unreachable destination
def test_2_dijkstra_unreachable_destination():
    topology = NetworkTopology()
    # Add an isolated node with no links
    topology.add_node("ISOLATED_NODE", "Isolated Shelter", "shelter")
    adj = topology.get_adjacency_list(only_active=True)

    result = dijkstra_shortest_path(adj, source="N0", destination="ISOLATED_NODE")
    assert result["reachable"] is False
    assert result["path"] == []
    assert result["total_cost"] == float("inf")


# 3. Distance Vector convergence
def test_3_distance_vector_convergence():
    topology = NetworkTopology()
    adj = topology.get_adjacency_list(only_active=True)

    result = run_distance_vector(adj, max_iterations=20)
    assert result["converged"] is True
    assert result["iterations_count"] > 0
    # Every connected node should have a route to N5
    assert result["routing_tables"]["N0"]["N5"]["cost"] == 7.0
    assert result["routing_tables"]["N0"]["N5"]["next_hop"] in ("N1", "N2")


# 4. Routing table updates after link failure
def test_4_routing_table_updates_after_link_failure():
    topology = NetworkTopology()
    mgr = LinkFailureManager(topology)

    # Disable N0-N1
    res1 = mgr.fail_link("N0", "N1", check_source="N0", check_dest="N3")
    assert res1["action"] == "LINK_FAILURE"
    # Alternative path should be via N2
    assert res1["new_route"]["reachable"] is True
    assert res1["new_route"]["path"][1] == "N2"
    assert res1["new_route"]["total_cost"] == 5.0  # N0 -> N2 (4) -> N3 (1)

    # Now restore N0-N1
    res2 = mgr.restore_link("N0", "N1", check_source="N0", check_dest="N3")
    assert res2["action"] == "LINK_RESTORE"
    assert res2["new_route"]["reachable"] is True


# 5. CRC valid frame
def test_5_crc_valid_frame():
    data = "1101011011"
    poly = "10011"
    encoded = crc_encode(data, poly)

    codeword = encoded["codeword"]
    assert codeword.startswith(data)
    assert len(encoded["remainder"]) == len(poly) - 1

    # Verification on unaltered codeword
    verify = crc_verify(codeword, poly)
    assert verify["is_valid"] is True
    assert verify["error_detected"] is False
    assert all(b == "0" for b in verify["remainder"])


# 6. CRC corrupted frame
def test_6_crc_corrupted_frame():
    data = "1101011011"
    poly = "10011"
    encoded = crc_encode(data, poly)
    codeword = encoded["codeword"]

    # Inject bit error at bit position 4
    corrupted = inject_error(codeword, bit_index=4)
    assert corrupted != codeword

    # Verification must detect corruption
    verify = crc_verify(corrupted, poly)
    assert verify["is_valid"] is False
    assert verify["error_detected"] is True
    assert any(b == "1" for b in verify["remainder"])


# 7. Go-Back-N lost frame retransmission
def test_7_go_back_n_lost_frame_retransmission():
    # Force frame loss with 50% probability
    res = simulate_go_back_n(
        total_frames=6,
        window_size=3,
        timeout_duration=1.0,
        frame_loss_prob=0.4,
        ack_loss_prob=0.0,
        corruption_prob=0.0,
        random_seed=42
    )

    stats = res["stats"]
    assert stats["original_transmissions"] == 6
    # With loss and timeout, retransmissions must have occurred
    assert stats["retransmissions"] > 0
    assert stats["total_transmission_attempts"] > 6
    # Eventually all frames delivered or attempted
    assert stats["successful_deliveries"] > 0


# 8. Go-Back-N corrupted frame recovery
def test_8_go_back_n_corrupted_frame_recovery():
    # Force corruption with frame loss 0%
    res = simulate_go_back_n(
        total_frames=5,
        window_size=3,
        timeout_duration=1.0,
        frame_loss_prob=0.0,
        ack_loss_prob=0.0,
        corruption_prob=0.3,
        random_seed=123
    )

    stats = res["stats"]
    assert stats["corrupted_frames"] > 0
    assert stats["retransmissions"] > 0
    assert stats["successful_deliveries"] == 5


# 9. Leaky Bucket queue overflow
def test_9_leaky_bucket_queue_overflow():
    # Small capacity (5), high incoming burst (12), leak rate (2)
    res = simulate_leaky_bucket(
        bucket_capacity=5,
        leak_rate=2,
        incoming_rate_pattern=[12],
        simulation_steps=1
    )

    metrics = res["metrics"]
    assert metrics["total_incoming"] == 12
    assert metrics["total_accepted"] == 5
    assert metrics["total_dropped"] == 7
    assert metrics["congestion_events"] >= 1
    assert metrics["drop_rate_pct"] > 50.0


# 10. Packet loss calculation
def test_10_packet_loss_calculation():
    # Create 4 original packets: 3 received, 1 lost
    p1 = Packet(packet_id="P1", source="N0", destination="N1", message="m", status="RECEIVED", created_at=0.0, received_at=0.1)
    p2 = Packet(packet_id="P2", source="N0", destination="N1", message="m", status="RECEIVED", created_at=0.1, received_at=0.2)
    p3 = Packet(packet_id="P3", source="N0", destination="N1", message="m", status="RECEIVED", created_at=0.2, received_at=0.3)
    p4 = Packet(packet_id="P4", source="N0", destination="N1", message="m", status="LOST", created_at=0.3)

    perf = PerformanceAnalyzer.analyze([p1, p2, p3, p4], simulation_duration_seconds=1.0)
    summary = perf["summary"]

    assert summary["sent_original_packets"] == 4
    assert summary["received_original_packets"] == 3
    assert summary["lost_original_packets"] == 1
    assert summary["packet_loss_rate_pct"] == 25.0
    assert summary["packet_delivery_ratio_pct"] == 75.0


# 11. Throughput calculation
def test_11_throughput_calculation():
    # 2 packets of 1000 bits delivered in 2.0 seconds -> 2000 bits / 2.0s = 1000 bps = 1.0 kbps
    p1 = Packet(packet_id="P1", source="N0", destination="N1", message="m", size_bits=1000, status="RECEIVED", created_at=0.0, received_at=1.0)
    p2 = Packet(packet_id="P2", source="N0", destination="N1", message="m", size_bits=1000, status="RECEIVED", created_at=0.5, received_at=2.0)

    perf = PerformanceAnalyzer.analyze([p1, p2], simulation_duration_seconds=2.0)
    summary = perf["summary"]

    assert summary["throughput_bps"] == 1000.0
    assert summary["throughput_kbps"] == 1.0


# 12. Average delay calculation
def test_12_average_delay_calculation():
    # P1 delay: 20ms, P2 delay: 40ms -> Avg: 30ms
    p1 = Packet(packet_id="P1", source="N0", destination="N1", message="m", status="RECEIVED", end_to_end_delay=20.0)
    p2 = Packet(packet_id="P2", source="N0", destination="N1", message="m", status="RECEIVED", end_to_end_delay=40.0)

    perf = PerformanceAnalyzer.analyze([p1, p2], simulation_duration_seconds=1.0)
    summary = perf["summary"]

    assert summary["avg_end_to_end_delay_ms"] == 30.0


# 13. No-route packet handling
def test_13_no_route_packet_handling():
    topology = NetworkTopology()
    topology.add_node("ISOLATED", "Isolated Post", "shelter")
    sim = NetworkSimulator(topology)

    res = sim.run_simulation(
        source="N0",
        destination="ISOLATED",
        num_packets=5
    )

    assert res["routing"]["reachable"] is False
    assert res["performance"]["received_original_packets"] == 0
    assert res["performance"]["dropped_packets"] >= 0
    # Packets should be marked dropped
    dropped_pkts = [p for p in res["packets"] if p["status"] == "DROPPED"]
    assert len(dropped_pkts) == 5


# 14. Reproducibility using random seed
def test_14_reproducibility_using_random_seed():
    topology1 = NetworkTopology()
    sim1 = NetworkSimulator(topology1)
    res1 = sim1.run_simulation(num_packets=10, random_seed=999)

    topology2 = NetworkTopology()
    sim2 = NetworkSimulator(topology2)
    res2 = sim2.run_simulation(num_packets=10, random_seed=999)

    # Compare exact metrics and packet statuses
    assert res1["performance"] == res2["performance"]
    statuses1 = [p["status"] for p in res1["packets"]]
    statuses2 = [p["status"] for p in res2["packets"]]
    assert statuses1 == statuses2
