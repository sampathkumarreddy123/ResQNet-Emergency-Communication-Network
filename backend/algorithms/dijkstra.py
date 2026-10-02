"""Dijkstra's Shortest Path Algorithm Implementation.

Manual implementation using a binary min-heap priority queue.
Designed for Emergency Communication Network path calculation.
"""

import heapq
from typing import Dict, List, Tuple, Any, Optional


def dijkstra_shortest_path(
    graph: Dict[str, List[Dict[str, Any]]],
    source: str,
    destination: Optional[str] = None
) -> Dict[str, Any]:
    """Calculate shortest path from source to destination (or all nodes) using Dijkstra's algorithm.

    Args:
        graph: Adjacency list mapping node_id -> list of edge dicts:
               [{'node': target_node_id, 'cost': numeric_weight, 'active': bool, ...}]
        source: Source node identifier.
        destination: Optional destination node identifier.

    Returns:
        Dictionary containing:
            - source: str
            - destination: Optional[str]
            - reachable: bool
            - path: List[str] (nodes in order from source to destination)
            - total_cost: float (infinity if unreachable)
            - distances: Dict[str, float] (shortest distance to all reached nodes)
            - previous_nodes: Dict[str, Optional[str]] (predecessor map)
            - visited_order: List[str] (order nodes were finalized)
            - step_logs: List[str] (human-readable step log for visualization)
    """
    if source not in graph:
        return {
            "source": source,
            "destination": destination,
            "reachable": False,
            "path": [],
            "total_cost": float("inf"),
            "distances": {},
            "previous_nodes": {},
            "visited_order": [],
            "step_logs": [f"Source node '{source}' does not exist in network."]
        }

    # Initialize distances and predecessors
    distances: Dict[str, float] = {node: float("inf") for node in graph}
    previous_nodes: Dict[str, Optional[str]] = {node: None for node in graph}
    visited_order: List[str] = []
    step_logs: List[str] = []

    distances[source] = 0.0
    # Priority queue stores tuples of (distance, node)
    pq: List[Tuple[float, str]] = [(0.0, source)]
    visited_set = set()

    step_logs.append(f"Initialized Dijkstra search from source '{source}'.")

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_node in visited_set:
            continue

        visited_set.add(current_node)
        visited_order.append(current_node)
        step_logs.append(
            f"Finalized node '{current_node}' with cumulative cost {current_dist}."
        )

        # Early exit if target destination reached
        if destination and current_node == destination:
            step_logs.append(f"Reached destination '{destination}'.")
            break

        # Explore outgoing links to neighbors
        for edge in graph.get(current_node, []):
            neighbor = edge.get("node")
            cost = edge.get("cost", 1.0)
            is_active = edge.get("active", True)

            # Skip inactive (failed) links or invalid neighbors
            if not is_active:
                step_logs.append(
                    f"Link ({current_node} -> {neighbor}) is INACTIVE / FAILED; skipping."
                )
                continue

            if neighbor not in graph:
                continue

            new_dist = current_dist + cost
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                previous_nodes[neighbor] = current_node
                heapq.heappush(pq, (new_dist, neighbor))
                step_logs.append(
                    f"Relaxed edge ({current_node} -> {neighbor}): updated cost to {new_dist}."
                )

    # Reconstruct path if destination is provided
    path: List[str] = []
    reachable = False
    total_cost = float("inf")

    if destination:
        if destination in graph and distances[destination] < float("inf"):
            reachable = True
            total_cost = distances[destination]
            curr: Optional[str] = destination
            while curr is not None:
                path.append(curr)
                curr = previous_nodes[curr]
            path.reverse()
            step_logs.append(
                f"Path found to '{destination}': {' -> '.join(path)} (Total Cost: {total_cost})."
            )
        else:
            step_logs.append(f"Destination '{destination}' is UNREACHABLE from '{source}'.")
    else:
        # Source to all
        reachable = True
        total_cost = 0.0

    return {
        "source": source,
        "destination": destination,
        "reachable": reachable,
        "path": path,
        "total_cost": total_cost if reachable else float("inf"),
        "distances": {k: (v if v < float("inf") else None) for k, v in distances.items()},
        "previous_nodes": previous_nodes,
        "visited_order": visited_order,
        "step_logs": step_logs
    }
