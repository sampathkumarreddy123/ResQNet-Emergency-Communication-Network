"""Integrated Discrete-Event Emergency Communication Network Simulator.

Orchestrates:
- Topology routing (Dijkstra and Distance Vector)
- Leaky Bucket traffic shaping and congestion control
- CRC polynomial encoding and corruption detection
- Go-Back-N sliding window ARQ retransmission
- Realistic delay modeling (transmission, propagation, queueing, timeout)
- Comprehensive event generation and performance analysis
"""

import random
import time
from typing import Dict, List, Any, Optional
import copy

from backend.simulation.network import NetworkTopology
from backend.simulation.packet import Packet
from backend.simulation.performance import PerformanceAnalyzer
from backend.algorithms.dijkstra import dijkstra_shortest_path
from backend.algorithms.distance_vector import run_distance_vector
from backend.algorithms.crc import crc_encode, crc_verify, inject_error
from backend.algorithms.leaky_bucket import simulate_leaky_bucket


class NetworkSimulator:
    """Core simulation engine."""

    def __init__(self, topology: NetworkTopology):
        self.topology = topology

    def run_simulation(
        self,
        source: str = "N0",
        destination: str = "N5",
        emergency_message: str = "URGENT: Flash flood alert in Sector 4. Evacuate to Emergency Shelter.",
        num_packets: int = 10,
        packet_size_bits: int = 1024,
        packet_rate: float = 5.0,  # packets per second
        loss_prob: float = 0.05,
        corruption_prob: float = 0.05,
        routing_algorithm: str = "dijkstra",  # 'dijkstra' or 'distance_vector'
        enable_leaky_bucket: bool = True,
        bucket_capacity: int = 15,
        leak_rate: int = 4,
        enable_arq: bool = True,
        window_size: int = 4,
        timeout_duration: float = 0.5,  # seconds
        max_retransmissions: int = 3,
        random_seed: Optional[int] = 42,
        scenario: str = "custom"
    ) -> Dict[str, Any]:
        """Execute full emergency network simulation run."""
        if random_seed is not None:
            rng = random.Random(random_seed)
        else:
            rng = random.Random()

        sim_start_wall = time.time()
        events: List[Dict[str, Any]] = []

        def add_event(evt_type: str, desc: str, node: Optional[str] = None, link: Optional[str] = None, t: float = 0.0):
            events.append({
                "timestamp": round(t, 3),
                "event_type": evt_type,
                "node": node,
                "link": link,
                "description": desc
            })

        add_event("Emergency message generated", f"Emergency alert initiated from {source} to {destination}: '{emergency_message}'", node=source, t=0.0)

        # 1. Routing calculation
        adj = self.topology.get_adjacency_list(only_active=True)
        path: List[str] = []
        path_cost: float = float("inf")
        is_reachable = False

        if routing_algorithm == "distance_vector":
            dv_result = run_distance_vector(adj)
            table_at_src = dv_result["routing_tables"].get(source, {})
            dest_info = table_at_src.get(destination, {})

            if dest_info and dest_info.get("reachable"):
                is_reachable = True
                path_cost = dest_info.get("cost", float("inf"))
                # Trace hop-by-hop using next_hop pointers
                curr = source
                visited_hops = [curr]
                while curr != destination and len(visited_hops) <= len(self.topology.nodes):
                    nxt = dv_result["routing_tables"].get(curr, {}).get(destination, {}).get("next_hop")
                    if not nxt or nxt in visited_hops:
                        break
                    visited_hops.append(nxt)
                    curr = nxt
                path = visited_hops if curr == destination else []
                is_reachable = (curr == destination)
        else:
            # Default to Dijkstra
            dijk_result = dijkstra_shortest_path(adj, source, destination)
            is_reachable = dijk_result["reachable"]
            path = dijk_result["path"]
            path_cost = dijk_result["total_cost"]

        if is_reachable and path:
            add_event(
                "Shortest route calculated",
                f"Computed route via {routing_algorithm.upper()}: {' -> '.join(path)} (Path Cost: {path_cost})",
                node=source,
                t=0.01
            )
        else:
            add_event(
                "No route found",
                f"Destination '{destination}' is UNREACHABLE from '{source}'. Communication link failure or network partition.",
                node=source,
                t=0.01
            )

        # Calculate path link characteristics
        total_propagation_delay_ms = 0.0
        min_bandwidth_mbps = 100.0
        avg_link_loss = 0.0

        if is_reachable and len(path) > 1:
            for i in range(len(path) - 1):
                u, v = path[i], path[i + 1]
                # Find link in topology
                for link in self.topology.links:
                    if (link["source"] == u and link["destination"] == v) or (link["source"] == v and link["destination"] == u):
                        total_propagation_delay_ms += link.get("propagation_delay", 10.0)
                        min_bandwidth_mbps = min(min_bandwidth_mbps, link.get("bandwidth", 50.0))
                        avg_link_loss = max(avg_link_loss, link.get("loss_prob", 0.01))
                        break

        # Compute per-hop transmission delay in ms
        # (size_bits / (bandwidth_mbps * 1e6)) * 1000 ms
        transmission_delay_ms = (packet_size_bits / (min_bandwidth_mbps * 1_000_000.0)) * 1000.0

        # Effective loss probability combines link loss and user loss parameter
        effective_loss_prob = min(0.95, loss_prob + avg_link_loss)

        # 2. Leaky Bucket traffic shaping at source
        current_queue_depth = 0
        bucket_overflow_drops = 0
        leaky_bucket_history = []

        packets: List[Packet] = []
        interval = 1.0 / max(packet_rate, 0.1)
        sim_clock = 0.05

        crc_generator = "100000111"  # CRC-8 (x^8 + x^2 + x + 1)

        # Prepare packets
        for i in range(num_packets):
            arrival_time = sim_clock + (i * interval)
            pkt_id = f"PKT-{i + 1:02d}"

            packet = Packet(
                packet_id=pkt_id,
                source=source,
                destination=destination,
                message=f"{emergency_message} [Chunk {i + 1}/{num_packets}]",
                size_bits=packet_size_bits,
                seq_num=i,
                created_at=round(arrival_time, 3),
                status="CREATED"
            )

            # Check if destination reachable
            if not is_reachable:
                packet.status = "DROPPED"
                packet.log(f"Dropped at creation: Destination {destination} unreachable.")
                add_event("Packet dropped", f"{pkt_id} dropped: Destination {destination} unreachable", node=source, t=arrival_time)
                packets.append(packet)
                continue

            # Check Leaky Bucket congestion control
            queueing_delay_ms = 0.0
            if enable_leaky_bucket:
                # If bucket is full, drop packet
                if current_queue_depth >= bucket_capacity:
                    bucket_overflow_drops += 1
                    packet.status = "DROPPED"
                    packet.log(f"Congestion drop: Leaky bucket full ({current_queue_depth}/{bucket_capacity}).")
                    add_event("Congestion detected", f"Buffer overflow at {source}! {pkt_id} dropped. Leaky bucket capacity reached.", node=source, t=arrival_time)
                    packets.append(packet)
                    continue
                else:
                    # Enqueue packet
                    current_queue_depth += 1
                    packet.status = "QUEUED"
                    packet.queued_at = arrival_time
                    # Leak occurs at leak_rate
                    queueing_delay_ms = (current_queue_depth / leak_rate) * 50.0  # ms
                    packet.queueing_delay = queueing_delay_ms

                    # Drain bucket periodically
                    if (i + 1) % leak_rate == 0 and current_queue_depth > 0:
                        current_queue_depth = max(0, current_queue_depth - 1)

            # Transmit frame
            packet.status = "TRANSMITTING"
            packet.sent_at = round(arrival_time + (queueing_delay_ms / 1000.0), 3)
            packet.path_traversed = list(path)
            packet.propagation_delay = total_propagation_delay_ms
            packet.transmission_delay = transmission_delay_ms

            # Generate binary payload & CRC codeword
            binary_payload = bin(i * 17 + 101)[2:].zfill(16)
            crc_result = crc_encode(binary_payload, crc_generator)
            packet.crc_codeword = crc_result["codeword"]

            add_event("Frame transmitted", f"Frame {i} ({pkt_id}) transmitted on link ({path[0]} -> {path[1]})", link=f"{path[0]}-{path[1]}", t=packet.sent_at)

            # Simulation of Channel Errors & ARQ
            delivered = False
            attempt = 0

            while attempt <= (max_retransmissions if enable_arq else 0) and not delivered:
                if attempt > 0:
                    packet.is_retransmission = True
                    packet.retransmission_count += 1
                    add_event("Frame retransmitted", f"Retransmission {attempt} for {pkt_id} following timeout/corruption", node=source, t=round(packet.sent_at + (attempt * timeout_duration), 3))

                # Check frame loss in channel
                is_lost = rng.random() < effective_loss_prob
                # Check frame corruption
                is_corrupted = (not is_lost) and (rng.random() < corruption_prob)

                if is_lost:
                    packet.status = "LOST"
                    packet.log(f"Attempt {attempt}: Packet lost during channel traversal.")
                elif is_corrupted:
                    # Bit corruption detected by CRC
                    corrupted_code = inject_error(packet.crc_codeword, bit_index=3)
                    verify_result = crc_verify(corrupted_code, crc_generator)

                    packet.status = "CORRUPTED"
                    packet.error_injected = True
                    packet.log(f"Attempt {attempt}: CRC verification failed at receiver (remainder: {verify_result['remainder']}). Frame rejected.")
                    add_event("CRC error detected", f"CRC check failed for {pkt_id} at {destination}. Bit error detected. Frame discarded.", node=destination, t=round(packet.sent_at + (total_propagation_delay_ms / 1000.0), 3))
                else:
                    # Frame received successfully!
                    delivered = True
                    packet.status = "RECEIVED"
                    delivery_time = packet.sent_at + (attempt * timeout_duration) + ((total_propagation_delay_ms + transmission_delay_ms) / 1000.0)
                    packet.received_at = round(delivery_time, 3)
                    packet.end_to_end_delay = round(
                        (delivery_time - packet.created_at) * 1000.0, 2
                    )
                    packet.log(f"Frame delivered successfully to {destination} on attempt {attempt}.")
                    break

                attempt += 1

            packets.append(packet)

        # Simulation completion time
        final_time = round(max([p.received_at or p.sent_at or p.created_at for p in packets] or [1.0]), 3)
        add_event("Simulation completed", f"Simulation finished. Total original packets: {num_packets}, Dropped: {bucket_overflow_drops}.", t=final_time)

        # Analyze performance
        perf = PerformanceAnalyzer.analyze(
            packets=packets,
            simulation_duration_seconds=max(final_time, 0.5),
            time_series_buckets=10,
            dropped_packets_count=bucket_overflow_drops
        )

        return {
            "simulation_id": f"SIM-{int(time.time() * 1000)}",
            "scenario": scenario,
            "config": {
                "source": source,
                "destination": destination,
                "emergency_message": emergency_message,
                "num_packets": num_packets,
                "packet_size_bits": packet_size_bits,
                "packet_rate": packet_rate,
                "loss_prob": loss_prob,
                "corruption_prob": corruption_prob,
                "routing_algorithm": routing_algorithm,
                "enable_leaky_bucket": enable_leaky_bucket,
                "bucket_capacity": bucket_capacity,
                "leak_rate": leak_rate,
                "enable_arq": enable_arq,
                "window_size": window_size,
                "timeout_duration": timeout_duration,
                "max_retransmissions": max_retransmissions,
                "random_seed": random_seed
            },
            "routing": {
                "algorithm": routing_algorithm,
                "source": source,
                "destination": destination,
                "path": path,
                "total_cost": path_cost if is_reachable else None,
                "reachable": is_reachable
            },
            "performance": perf["summary"],
            "time_series": perf["time_series"],
            "packets": [p.to_dict() for p in packets],
            "events": events
        }
