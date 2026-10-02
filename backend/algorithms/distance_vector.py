"""Distance Vector Routing Algorithm Implementation.

Bellman-Ford-based distributed distance vector routing algorithm.
Each node iteratively computes and updates its routing table (Destination, Next Hop, Cost).
Includes Split Horizon loop prevention and detailed iteration logging.
"""

from typing import Dict, List, Any, Optional
import copy


def _clean_table_for_json(raw_table: Dict[str, Dict[str, Dict[str, Any]]]) -> Dict[str, Dict[str, Dict[str, Any]]]:
    clean: Dict[str, Dict[str, Dict[str, Any]]] = {}
    for node, dest_map in raw_table.items():
        clean[node] = {}
        for dest, info in dest_map.items():
            cost_val = info.get("cost")
            is_reachable = cost_val is not None and cost_val < float("inf")
            clean[node][dest] = {
                "next_hop": info.get("next_hop") if is_reachable else None,
                "cost": cost_val if is_reachable else None,
                "reachable": is_reachable
            }
    return clean


def run_distance_vector(
    graph: Dict[str, List[Dict[str, Any]]],
    max_iterations: int = 20,
    use_split_horizon: bool = True
) -> Dict[str, Any]:
    """Execute Distance Vector algorithm until convergence or max iterations reached.

    Args:
        graph: Adjacency list mapping node_id -> list of edge dicts:
               [{'node': target_node_id, 'cost': numeric_weight, 'active': bool, ...}]
        max_iterations: Safety cap on routing update iterations.
        use_split_horizon: If True, uses Split Horizon loop-prevention rule.

    Returns:
        Dictionary containing:
            - routing_tables: Final routing tables per node {node: {dest: {'next_hop': str, 'cost': float}}}
            - iterations: List of step snapshots showing vector exchanges and changes
            - converged: bool
            - iterations_count: int
            - summary: str
    """
    nodes = sorted(list(graph.keys()))
    if not nodes:
        return {
            "routing_tables": {},
            "iterations": [],
            "converged": True,
            "iterations_count": 0,
            "summary": "Empty graph."
        }

    # Step 0: Initialize routing tables
    # For each node u and destination v:
    # If u == v: cost = 0, next_hop = u
    # If v is directly connected neighbor with active link: cost = link_cost, next_hop = v
    # Else: cost = infinity, next_hop = None
    tables: Dict[str, Dict[str, Dict[str, Any]]] = {}

    for u in nodes:
        tables[u] = {}
        # Direct active link costs to neighbors
        direct_links: Dict[str, float] = {}
        for edge in graph.get(u, []):
            if edge.get("active", True):
                v = edge["node"]
                c = float(edge.get("cost", 1.0))
                # Keep the minimum cost in case of multiple edges
                if v not in direct_links or c < direct_links[v]:
                    direct_links[v] = c

        for v in nodes:
            if u == v:
                tables[u][v] = {"next_hop": u, "cost": 0.0}
            elif v in direct_links:
                tables[u][v] = {"next_hop": v, "cost": direct_links[v]}
            else:
                tables[u][v] = {"next_hop": None, "cost": float("inf")}

    iterations_history: List[Dict[str, Any]] = []

    # Record initial state (Iteration 0) with JSON-safe numbers
    iterations_history.append({
        "iteration": 0,
        "description": "Initial routing tables based on direct physical neighbors.",
        "updates": [],
        "routing_tables": _clean_table_for_json(tables)
    })

    converged = False
    iteration_idx = 0

    while iteration_idx < max_iterations and not converged:
        iteration_idx += 1
        iteration_updates: List[str] = []
        new_tables = copy.deepcopy(tables)
        changed_in_this_round = False

        # In a distance vector exchange, each node u prepares its distance vector to share with active neighbors
        for u in nodes:
            # Find active neighbors of u
            active_neighbors = []
            for edge in graph.get(u, []):
                if edge.get("active", True) and edge["node"] in graph:
                    active_neighbors.append((edge["node"], float(edge.get("cost", 1.0))))

            for neighbor, link_cost in active_neighbors:
                # Neighbor shares its vector with u
                # If split horizon is enabled: neighbor does not advertise routes whose next_hop is u
                for dest in nodes:
                    if dest == u:
                        continue

                    advertised_cost = tables[neighbor][dest]["cost"]
                    advertised_next_hop = tables[neighbor][dest]["next_hop"]

                    if use_split_horizon and advertised_next_hop == u:
                        # Poison or do not advertise
                        advertised_cost = float("inf")

                    if advertised_cost < float("inf"):
                        possible_cost = link_cost + advertised_cost
                        current_cost = new_tables[u][dest]["cost"]

                        # Bellman-Ford relaxation: if new path is strictly shorter
                        if possible_cost < current_cost:
                            new_tables[u][dest] = {
                                "next_hop": neighbor,
                                "cost": possible_cost
                            }
                            curr_str = "∞" if current_cost == float("inf") else str(current_cost)
                            iteration_updates.append(
                                f"Node {u} updated route to {dest}: via {neighbor}, cost {curr_str} -> {possible_cost}."
                            )
                            changed_in_this_round = True
                        elif new_tables[u][dest]["next_hop"] == neighbor and abs(possible_cost - current_cost) > 1e-6:
                            # If existing route was via this neighbor and cost changed (e.g. increase or recovery)
                            new_tables[u][dest] = {
                                "next_hop": neighbor,
                                "cost": possible_cost
                            }
                            curr_str = "∞" if current_cost == float("inf") else str(current_cost)
                            iteration_updates.append(
                                f"Node {u} route to {dest} via {neighbor} adjusted cost to {possible_cost}."
                            )
                            changed_in_this_round = True

        tables = new_tables

        iterations_history.append({
            "iteration": iteration_idx,
            "description": f"Iteration {iteration_idx}: {'Updated routes' if changed_in_this_round else 'No changes (converged)'}.",
            "updates": iteration_updates,
            "routing_tables": _clean_table_for_json(tables)
        })

        if not changed_in_this_round:
            converged = True
            break

    serializable_tables = _clean_table_for_json(tables)

    return {
        "routing_tables": serializable_tables,
        "iterations": iterations_history,
        "converged": converged,
        "iterations_count": len(iterations_history) - 1,
        "summary": f"Distance Vector converged in {len(iterations_history) - 1} iterations." if converged else f"Did not fully converge within {max_iterations} iterations."
    }

