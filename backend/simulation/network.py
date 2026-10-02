"""Network Topology Manager.

Manages nodes and links with adjacency list representation,
link capacities, propagation delays, costs, and active/failure states.
"""

from typing import Dict, List, Any, Optional
import copy


class NetworkTopology:
    """Represents the emergency communication network topology."""

    DEFAULT_NODES = [
        {"id": "N0", "label": "Emergency Control Center", "type": "control_center", "x": 100, "y": 200},
        {"id": "N1", "label": "Police Station", "type": "police", "x": 300, "y": 80},
        {"id": "N2", "label": "Fire Services", "type": "fire_service", "x": 300, "y": 320},
        {"id": "N3", "label": "Ambulance Unit", "type": "ambulance", "x": 520, "y": 140},
        {"id": "N4", "label": "Field Response Team", "type": "field_team", "x": 520, "y": 20},
        {"id": "N5", "label": "Emergency Shelter", "type": "shelter", "x": 750, "y": 200},
        {"id": "N6", "label": "Backup Control Center", "type": "backup_center", "x": 520, "y": 360},
    ]

    DEFAULT_LINKS = [
        {"source": "N0", "destination": "N1", "cost": 2.0, "bandwidth": 100.0, "propagation_delay": 10.0, "active": True, "loss_prob": 0.02},
        {"source": "N0", "destination": "N2", "cost": 4.0, "bandwidth": 100.0, "propagation_delay": 15.0, "active": True, "loss_prob": 0.02},
        {"source": "N1", "destination": "N3", "cost": 3.0, "bandwidth": 50.0, "propagation_delay": 12.0, "active": True, "loss_prob": 0.03},
        {"source": "N2", "destination": "N3", "cost": 1.0, "bandwidth": 50.0, "propagation_delay": 5.0, "active": True, "loss_prob": 0.01},
        {"source": "N3", "destination": "N5", "cost": 2.0, "bandwidth": 100.0, "propagation_delay": 8.0, "active": True, "loss_prob": 0.02},
        {"source": "N1", "destination": "N4", "cost": 5.0, "bandwidth": 20.0, "propagation_delay": 25.0, "active": True, "loss_prob": 0.05},
        {"source": "N4", "destination": "N5", "cost": 2.0, "bandwidth": 20.0, "propagation_delay": 20.0, "active": True, "loss_prob": 0.04},
        {"source": "N2", "destination": "N6", "cost": 3.0, "bandwidth": 100.0, "propagation_delay": 10.0, "active": True, "loss_prob": 0.02},
        {"source": "N6", "destination": "N5", "cost": 3.0, "bandwidth": 100.0, "propagation_delay": 15.0, "active": True, "loss_prob": 0.03},
        {"source": "N0", "destination": "N6", "cost": 6.0, "bandwidth": 50.0, "propagation_delay": 30.0, "active": True, "loss_prob": 0.05},
    ]

    def __init__(self):
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.links: List[Dict[str, Any]] = []
        self.reset_to_default()

    def reset_to_default(self) -> None:
        """Reset topology to default emergency network configuration."""
        self.nodes = {node["id"]: copy.deepcopy(node) for node in self.DEFAULT_NODES}
        self.links = copy.deepcopy(self.DEFAULT_LINKS)

    def get_topology(self) -> Dict[str, Any]:
        """Return complete network topology state."""
        return {
            "nodes": list(self.nodes.values()),
            "links": copy.deepcopy(self.links),
            "total_nodes": len(self.nodes),
            "total_links": len(self.links),
            "active_links": sum(1 for link in self.links if link.get("active", True)),
            "failed_links": sum(1 for link in self.links if not link.get("active", True)),
            "configuration_type": "SIMULATED_BASELINE",
            "telemetry_disclaimer": "Predefined default values represent simulated baseline configuration parameters, not real-world field telemetry."
        }

    def add_node(self, node_id: str, label: str, node_type: str = "custom", x: int = 400, y: int = 200) -> Dict[str, Any]:
        """Add a new node to the network."""
        if not node_id:
            raise ValueError("node_id cannot be empty.")
        if node_id in self.nodes:
            raise ValueError(f"Node '{node_id}' already exists.")

        node_data = {
            "id": node_id,
            "label": label or node_id,
            "type": node_type,
            "x": x,
            "y": y
        }
        self.nodes[node_id] = node_data
        return node_data

    def remove_node(self, node_id: str) -> None:
        """Remove a node and all connected links."""
        if node_id not in self.nodes:
            raise ValueError(f"Node '{node_id}' does not exist.")

        del self.nodes[node_id]
        # Remove any links involving this node
        self.links = [
            link for link in self.links
            if link["source"] != node_id and link["destination"] != node_id
        ]

    def add_link(
        self,
        source: str,
        destination: str,
        cost: float = 1.0,
        bandwidth: float = 100.0,
        propagation_delay: float = 10.0,
        loss_prob: float = 0.02,
        active: bool = True
    ) -> Dict[str, Any]:
        """Add an undirected/bidirectional communication link."""
        if source not in self.nodes:
            raise ValueError(f"Source node '{source}' does not exist.")
        if destination not in self.nodes:
            raise ValueError(f"Destination node '{destination}' does not exist.")
        if source == destination:
            raise ValueError("Self-loops are not allowed.")

        # Check if link already exists in either direction
        for link in self.links:
            if (link["source"] == source and link["destination"] == destination) or \
               (link["source"] == destination and link["destination"] == source):
                raise ValueError(f"Link between '{source}' and '{destination}' already exists.")

        link_data = {
            "source": source,
            "destination": destination,
            "cost": float(cost),
            "bandwidth": float(bandwidth),
            "propagation_delay": float(propagation_delay),
            "loss_prob": float(loss_prob),
            "active": active
        }
        self.links.append(link_data)
        return link_data

    def remove_link(self, source: str, destination: str) -> None:
        """Remove a link between source and destination."""
        initial_count = len(self.links)
        self.links = [
            l for l in self.links
            if not ((l["source"] == source and l["destination"] == destination) or
                    (l["source"] == destination and l["destination"] == source))
        ]
        if len(self.links) == initial_count:
            raise ValueError(f"Link between '{source}' and '{destination}' not found.")

    def set_link_status(self, source: str, destination: str, active: bool) -> Dict[str, Any]:
        """Enable or disable a link (simulating failure or restoration)."""
        found = False
        target_link = None
        for link in self.links:
            if (link["source"] == source and link["destination"] == destination) or \
               (link["source"] == destination and link["destination"] == source):
                link["active"] = active
                found = True
                target_link = link
                break

        if not found:
            raise ValueError(f"Link between '{source}' and '{destination}' not found.")

        return target_link

    def update_link_cost(self, source: str, destination: str, cost: float) -> Dict[str, Any]:
        """Update the routing cost/weight of a link."""
        return self.update_link(source, destination, cost=cost)

    def update_link(
        self,
        source: str,
        destination: str,
        cost: Optional[float] = None,
        bandwidth: Optional[float] = None,
        propagation_delay: Optional[float] = None,
        loss_prob: Optional[float] = None,
        active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Update any link parameters (cost, bandwidth, delay, loss probability, active status)."""
        for link in self.links:
            if (link["source"] == source and link["destination"] == destination) or \
               (link["source"] == destination and link["destination"] == source):
                if cost is not None:
                    link["cost"] = float(cost)
                if bandwidth is not None:
                    link["bandwidth"] = float(bandwidth)
                if propagation_delay is not None:
                    link["propagation_delay"] = float(propagation_delay)
                if loss_prob is not None:
                    link["loss_prob"] = float(loss_prob)
                if active is not None:
                    link["active"] = bool(active)
                return link
        raise ValueError(f"Link between '{source}' and '{destination}' not found.")

    def get_adjacency_list(self, only_active: bool = False) -> Dict[str, List[Dict[str, Any]]]:
        """Construct adjacency list mapping node_id -> list of edge dicts."""
        adj: Dict[str, List[Dict[str, Any]]] = {node_id: [] for node_id in self.nodes}

        for link in self.links:
            if only_active and not link.get("active", True):
                continue

            u = link["source"]
            v = link["destination"]

            if u in adj and v in adj:
                adj[u].append({
                    "node": v,
                    "cost": link["cost"],
                    "bandwidth": link["bandwidth"],
                    "propagation_delay": link["propagation_delay"],
                    "loss_prob": link.get("loss_prob", 0.0),
                    "active": link.get("active", True)
                })
                # Symmetric/bidirectional emergency network link
                adj[v].append({
                    "node": u,
                    "cost": link["cost"],
                    "bandwidth": link["bandwidth"],
                    "propagation_delay": link["propagation_delay"],
                    "loss_prob": link.get("loss_prob", 0.0),
                    "active": link.get("active", True)
                })

        return adj
