"""REST API Blueprints for Emergency Communication Network.

Exposes endpoints for:
- Topology management (nodes, links, link failure/restore)
- Routing algorithms (Dijkstra and Distance Vector)
- CRC error detection & corruption injection
- Go-Back-N ARQ sliding window simulation
- Leaky bucket congestion control
- Full packet transmission simulation
- Analytics, history, and CSV export
"""

import io
import csv
from flask import Blueprint, request, jsonify, Response

from backend.simulation.network import NetworkTopology
from backend.simulation.link_failure import LinkFailureManager
from backend.simulation.simulator import NetworkSimulator
from backend.algorithms.dijkstra import dijkstra_shortest_path
from backend.algorithms.distance_vector import run_distance_vector
from backend.algorithms.crc import crc_encode, crc_verify, inject_error
from backend.algorithms.go_back_n import simulate_go_back_n
from backend.algorithms.leaky_bucket import simulate_leaky_bucket
from backend.database.mongo import db_manager

api_bp = Blueprint("api", __name__, url_prefix="/api")

# Singleton network topology and simulator instances
topology = NetworkTopology()
link_mgr = LinkFailureManager(topology)
simulator = NetworkSimulator(topology)


@api_bp.route("/health", methods=["GET"])
def health_check():
    """Health check diagnostic endpoint."""
    db_status = db_manager.get_status()
    topo_summary = topology.get_topology()
    return jsonify({
        "status": "healthy",
        "service": "ResQNet — Emergency Communication Network Simulation",
        "database": db_status,
        "network": {
            "total_nodes": topo_summary["total_nodes"],
            "total_links": topo_summary["total_links"],
            "active_links": topo_summary["active_links"],
            "failed_links": topo_summary["failed_links"]
        }
    }), 200


# --- Network Topology Endpoints ---

@api_bp.route("/network/topology", methods=["GET"])
def get_topology():
    """Get current network topology."""
    return jsonify(topology.get_topology()), 200


@api_bp.route("/network/reset", methods=["POST"])
def reset_topology():
    """Reset network topology to default emergency configuration."""
    topology.reset_to_default()
    db_manager.save_topology(topology.get_topology())
    return jsonify({
        "message": "Topology reset to default ResQNet configuration.",
        "topology": topology.get_topology()
    }), 200


@api_bp.route("/network/nodes", methods=["POST"])
def add_node():
    """Add a new node to the network."""
    data = request.get_json() or {}
    node_id = data.get("node_id") or data.get("id")
    label = data.get("label", node_id)
    node_type = data.get("type", "custom")
    x = data.get("x", 400)
    y = data.get("y", 200)

    if not node_id:
        return jsonify({"error": "node_id is required."}), 400

    try:
        new_node = topology.add_node(node_id, label, node_type, x, y)
        db_manager.save_topology(topology.get_topology())
        return jsonify({
            "message": f"Node '{node_id}' created successfully.",
            "node": new_node,
            "topology": topology.get_topology()
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@api_bp.route("/network/nodes/<node_id>", methods=["DELETE"])
def remove_node(node_id: str):
    """Remove a node and its attached links."""
    try:
        topology.remove_node(node_id)
        db_manager.save_topology(topology.get_topology())
        return jsonify({
            "message": f"Node '{node_id}' and associated links removed.",
            "topology": topology.get_topology()
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@api_bp.route("/network/links", methods=["POST"])
def add_link():
    """Add a communication link between two nodes."""
    data = request.get_json() or {}
    source = data.get("source")
    destination = data.get("destination")
    cost = data.get("cost", 1.0)
    bandwidth = data.get("bandwidth", 100.0)
    propagation_delay = data.get("propagation_delay", 10.0)
    loss_prob = data.get("loss_prob", 0.02)
    active = data.get("active", True)
    upsert = data.get("upsert", False)

    if not source or not destination:
        return jsonify({"error": "Both 'source' and 'destination' are required."}), 400

    if source == destination:
        return jsonify({"error": "Self-loops are not allowed. Source and destination must be different nodes."}), 400

    try:
        cost = float(cost)
        if cost <= 0:
            return jsonify({"error": "Link cost must be greater than 0."}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Link cost must be a valid number greater than 0."}), 400

    try:
        link = topology.add_link(
            source=source,
            destination=destination,
            cost=cost,
            bandwidth=bandwidth,
            propagation_delay=propagation_delay,
            loss_prob=loss_prob,
            active=active
        )
        db_manager.save_topology(topology.get_topology())
        return jsonify({
            "message": f"Link ({source} <-> {destination}) created.",
            "link": link,
            "topology": topology.get_topology()
        }), 201
    except ValueError as e:
        err_msg = str(e)
        if "already exists" in err_msg and upsert:
            updated = topology.update_link(
                source=source,
                destination=destination,
                cost=cost,
                bandwidth=bandwidth,
                propagation_delay=propagation_delay,
                loss_prob=loss_prob,
                active=active
            )
            db_manager.save_topology(topology.get_topology())
            return jsonify({
                "message": f"Link ({source} <-> {destination}) updated.",
                "link": updated,
                "topology": topology.get_topology()
            }), 200
        return jsonify({"error": err_msg}), 400


@api_bp.route("/network/links/cost", methods=["POST"])
def update_link_cost():
    """Update link weight/cost."""
    data = request.get_json() or {}
    source = data.get("source")
    destination = data.get("destination")
    cost = data.get("cost")

    if not source or not destination or cost is None:
        return jsonify({"error": "'source', 'destination', and 'cost' are required."}), 400

    try:
        updated = topology.update_link_cost(source, destination, float(cost))
        db_manager.save_topology(topology.get_topology())
        return jsonify({
            "message": f"Cost updated for link ({source} <-> {destination}).",
            "link": updated,
            "topology": topology.get_topology()
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@api_bp.route("/network/links/update", methods=["POST"])
def update_link():
    """Update link configuration (cost, bandwidth, propagation delay, loss probability)."""
    data = request.get_json() or {}
    source = data.get("source")
    destination = data.get("destination")

    if not source or not destination:
        return jsonify({"error": "'source' and 'destination' are required."}), 400

    try:
        updated = topology.update_link(
            source=source,
            destination=destination,
            cost=float(data["cost"]) if "cost" in data and data["cost"] is not None else None,
            bandwidth=float(data["bandwidth"]) if "bandwidth" in data and data["bandwidth"] is not None else None,
            propagation_delay=float(data["propagation_delay"]) if "propagation_delay" in data and data["propagation_delay"] is not None else None,
            loss_prob=float(data["loss_prob"]) if "loss_prob" in data and data["loss_prob"] is not None else None,
            active=bool(data["active"]) if "active" in data and data["active"] is not None else None
        )
        db_manager.save_topology(topology.get_topology())
        return jsonify({
            "success": True,
            "message": f"Configuration updated for link ({source} <-> {destination}).",
            "link": updated,
            "topology": topology.get_topology()
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# --- Link Failure and Recovery Endpoints ---

@api_bp.route("/network/link-failure", methods=["POST"])
def fail_link():
    """Simulate link failure and calculate alternative routes."""
    data = request.get_json() or {}
    source = data.get("source")
    destination = data.get("destination")
    check_source = data.get("check_source")
    check_dest = data.get("check_dest")

    if not source or not destination:
        return jsonify({"error": "Both 'source' and 'destination' are required."}), 400

    try:
        result = link_mgr.fail_link(source, destination, check_source, check_dest)
        db_manager.save_topology(topology.get_topology())
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@api_bp.route("/network/link-restore", methods=["POST"])
def restore_link():
    """Restore a previously failed link and recalculate routing."""
    data = request.get_json() or {}
    source = data.get("source")
    destination = data.get("destination")
    check_source = data.get("check_source")
    check_dest = data.get("check_dest")

    if not source or not destination:
        return jsonify({"error": "Both 'source' and 'destination' are required."}), 400

    try:
        result = link_mgr.restore_link(source, destination, check_source, check_dest)
        db_manager.save_topology(topology.get_topology())
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# --- Routing Algorithm Endpoints ---

@api_bp.route("/routing/dijkstra", methods=["POST"])
def calculate_dijkstra():
    """Calculate shortest path using manual Dijkstra algorithm."""
    data = request.get_json() or {}
    source = data.get("source", "N0")
    destination = data.get("destination", "N5")

    adj = topology.get_adjacency_list(only_active=True)
    result = dijkstra_shortest_path(adj, source, destination)
    return jsonify(result), 200


@api_bp.route("/routing/distance-vector", methods=["POST"])
def calculate_distance_vector():
    """Execute Distance Vector algorithm with iterative step logs."""
    data = request.get_json() or {}
    max_iterations = int(data.get("max_iterations", 20))
    use_split_horizon = bool(data.get("use_split_horizon", True))

    adj = topology.get_adjacency_list(only_active=True)
    result = run_distance_vector(adj, max_iterations=max_iterations, use_split_horizon=use_split_horizon)
    return jsonify(result), 200


@api_bp.route("/routing/tables", methods=["GET"])
def get_routing_tables():
    """Fetch current Distance Vector routing tables for all nodes."""
    adj = topology.get_adjacency_list(only_active=True)
    result = run_distance_vector(adj)
    return jsonify(result), 200


# --- CRC Error Detection Endpoints ---

@api_bp.route("/crc/encode", methods=["POST"])
def encode_crc():
    """Encode binary data using polynomial division."""
    data = request.get_json() or {}
    data_bits = data.get("data_bits", "1101011011")
    generator = data.get("generator", "10011")

    try:
        result = crc_encode(data_bits, generator)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@api_bp.route("/crc/verify", methods=["POST"])
def verify_crc():
    """Verify received codeword and optionally inject corruption."""
    data = request.get_json() or {}
    received_codeword = data.get("codeword")
    generator = data.get("generator", "10011")
    corrupt_position = data.get("corrupt_position")

    if not received_codeword:
        return jsonify({"error": "'codeword' is required."}), 400

    try:
        actual_codeword = received_codeword
        corruption_applied = False

        if corrupt_position is not None:
            pos = int(corrupt_position)
            actual_codeword = inject_error(received_codeword, pos)
            corruption_applied = True

        result = crc_verify(actual_codeword, generator)
        result["corruption_applied"] = corruption_applied
        result["evaluated_codeword"] = actual_codeword
        result["original_codeword"] = received_codeword

        return jsonify(result), 200
    except (ValueError, IndexError) as e:
        return jsonify({"error": str(e)}), 400


# --- ARQ Go-Back-N Endpoints ---

@api_bp.route("/arq/go-back-n", methods=["POST"])
def run_go_back_n():
    """Simulate Go-Back-N ARQ protocol."""
    data = request.get_json() or {}
    total_frames = int(data.get("total_frames", 10))
    window_size = int(data.get("window_size", 4))
    timeout = float(data.get("timeout_duration", 3.0))
    frame_loss = float(data.get("frame_loss_prob", 0.1))
    ack_loss = float(data.get("ack_loss_prob", 0.05))
    corruption = float(data.get("corruption_prob", 0.05))
    seed = data.get("random_seed")
    if seed is not None:
        seed = int(seed)

    try:
        result = simulate_go_back_n(
            total_frames=total_frames,
            window_size=window_size,
            timeout_duration=timeout,
            frame_loss_prob=frame_loss,
            ack_loss_prob=ack_loss,
            corruption_prob=corruption,
            random_seed=seed
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# --- Leaky Bucket Congestion Control Endpoints ---

@api_bp.route("/congestion/leaky-bucket", methods=["POST"])
def run_leaky_bucket():
    """Simulate Leaky Bucket congestion control algorithm."""
    data = request.get_json() or {}
    capacity = int(data.get("bucket_capacity", 15))
    leak_rate = int(data.get("leak_rate", 3))
    pattern = data.get("incoming_pattern")
    steps = int(data.get("simulation_steps", 15))

    try:
        result = simulate_leaky_bucket(
            bucket_capacity=capacity,
            leak_rate=leak_rate,
            incoming_rate_pattern=pattern,
            simulation_steps=steps
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


# --- Simulation Endpoints ---

@api_bp.route("/simulation/start", methods=["POST"])
def start_simulation():
    """Run full emergency network packet transmission simulation."""
    data = request.get_json() or {}

    source = data.get("source", "N0")
    destination = data.get("destination", "N5")
    message = data.get("emergency_message", "URGENT: Flash flood alert in Sector 4. Evacuate to Emergency Shelter.")
    num_packets = int(data.get("num_packets", 10))
    packet_size = int(data.get("packet_size_bits", 1024))
    packet_rate = float(data.get("packet_rate", 5.0))
    loss_prob = float(data.get("loss_prob", 0.05))
    corruption_prob = float(data.get("corruption_prob", 0.05))
    routing_algo = data.get("routing_algorithm", "dijkstra")
    enable_leaky = bool(data.get("enable_leaky_bucket", True))
    capacity = int(data.get("bucket_capacity", 15))
    leak_rate = int(data.get("leak_rate", 4))
    enable_arq = bool(data.get("enable_arq", True))
    window_size = int(data.get("window_size", 4))
    timeout = float(data.get("timeout_duration", 0.5))
    scenario = data.get("scenario", "custom")
    seed = data.get("random_seed")
    if seed is not None:
        seed = int(seed)

    result = simulator.run_simulation(
        source=source,
        destination=destination,
        emergency_message=message,
        num_packets=num_packets,
        packet_size_bits=packet_size,
        packet_rate=packet_rate,
        loss_prob=loss_prob,
        corruption_prob=corruption_prob,
        routing_algorithm=routing_algo,
        enable_leaky_bucket=enable_leaky,
        bucket_capacity=capacity,
        leak_rate=leak_rate,
        enable_arq=enable_arq,
        window_size=window_size,
        timeout_duration=timeout,
        random_seed=seed,
        scenario=scenario
    )

    # Persist simulation in MongoDB
    sim_id = db_manager.save_simulation(result)
    result["simulation_id"] = sim_id

    return jsonify(result), 201


@api_bp.route("/simulation/<simulation_id>", methods=["GET"])
def get_simulation(simulation_id: str):
    """Retrieve details for a specific simulation."""
    sim = db_manager.get_simulation_by_id(simulation_id)
    if not sim:
        return jsonify({"error": f"Simulation '{simulation_id}' not found."}), 404
    return jsonify(sim), 200


@api_bp.route("/simulation/<simulation_id>/results", methods=["GET"])
def get_simulation_results(simulation_id: str):
    """Retrieve only the performance and analytics results of a simulation."""
    sim = db_manager.get_simulation_by_id(simulation_id)
    if not sim:
        return jsonify({"error": f"Simulation '{simulation_id}' not found."}), 404
    return jsonify({
        "simulation_id": simulation_id,
        "performance": sim.get("performance", {}),
        "time_series": sim.get("time_series", []),
        "routing": sim.get("routing", {})
    }), 200


@api_bp.route("/simulation/history", methods=["GET"])
def get_simulation_history():
    """Retrieve historical simulation runs."""
    limit = int(request.args.get("limit", 20))
    history = db_manager.get_simulation_history(limit)
    return jsonify(history), 200


# --- Analytics & Export Endpoints ---

@api_bp.route("/analytics/summary", methods=["GET"])
def get_analytics_summary():
    """Fetch aggregated performance statistics across scenarios."""
    history = db_manager.get_simulation_history(limit=50)

    total_runs = len(history)
    if total_runs == 0:
        return jsonify({
            "total_simulations": 0,
            "average_pdr": 0.0,
            "average_throughput_kbps": 0.0,
            "average_delay_ms": 0.0,
            "scenario_breakdown": {}
        }), 200

    pdrs = []
    throughputs = []
    delays = []
    scenarios = {}

    for sim in history:
        perf = sim.get("performance", {})
        pdr = perf.get("packet_delivery_ratio_pct")
        tp = perf.get("throughput_kbps")
        delay = perf.get("avg_end_to_end_delay_ms")

        if pdr is not None:
            pdrs.append(pdr)
        if tp is not None:
            throughputs.append(tp)
        if delay is not None:
            delays.append(delay)

        scen = sim.get("scenario", "custom")
        scenarios[scen] = scenarios.get(scen, 0) + 1

    return jsonify({
        "total_simulations": total_runs,
        "average_pdr": round(sum(pdrs) / len(pdrs), 2) if pdrs else 0.0,
        "average_throughput_kbps": round(sum(throughputs) / len(throughputs), 2) if throughputs else 0.0,
        "average_delay_ms": round(sum(delays) / len(delays), 2) if delays else 0.0,
        "scenario_breakdown": scenarios
    }), 200


@api_bp.route("/analytics/export", methods=["GET"])
def export_analytics_csv():
    """Export simulation metrics as downloadable CSV."""
    history = db_manager.get_simulation_history(limit=100)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Simulation ID",
        "Scenario",
        "Source",
        "Destination",
        "Original Packets Sent",
        "Packets Received",
        "Packets Lost",
        "Dropped Packets",
        "Retransmissions",
        "Packet Delivery Ratio (%)",
        "Packet Loss Rate (%)",
        "Throughput (kbps)",
        "Avg Delay (ms)",
        "Routing Algorithm"
    ])

    for sim in history:
        cfg = sim.get("config", {})
        perf = sim.get("performance", {})
        writer.writerow([
            sim.get("simulation_id", "N/A"),
            sim.get("scenario", "custom"),
            cfg.get("source", "N0"),
            cfg.get("destination", "N5"),
            perf.get("sent_original_packets", 0),
            perf.get("received_original_packets", 0),
            perf.get("lost_original_packets", 0),
            perf.get("dropped_packets", 0),
            perf.get("total_retransmissions", 0),
            perf.get("packet_delivery_ratio_pct", 0.0),
            perf.get("packet_loss_rate_pct", 0.0),
            perf.get("throughput_kbps", 0.0),
            perf.get("avg_end_to_end_delay_ms", 0.0),
            cfg.get("routing_algorithm", "dijkstra")
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=resqnet_simulation_metrics.csv"}
    )
