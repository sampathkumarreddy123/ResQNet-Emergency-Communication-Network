"""Link Failure and Alternative Route Manager."""

from typing import Dict, Any, Optional
from backend.simulation.network import NetworkTopology
from backend.algorithms.dijkstra import dijkstra_shortest_path
from backend.algorithms.distance_vector import run_distance_vector


class LinkFailureManager:
    """Manages failure events, alternative path selection, and topological recovery."""

    def __init__(self, topology: NetworkTopology):
        self.topology = topology

    def fail_link(self, source: str, destination: str, check_source: Optional[str] = None, check_dest: Optional[str] = None) -> Dict[str, Any]:
        """Disable a link and compute path changes.

        Args:
            source: Source node of link to fail.
            destination: Destination node of link to fail.
            check_source: Optional source node to check route for (defaults to link source).
            check_dest: Optional destination node to check route for (defaults to link destination).

        Returns:
            Dictionary with old route, new route, alternative route status, and DV update.
        """
        route_src = check_source or source
        route_dst = check_dest or destination

        # 1. Compute route BEFORE link failure
        adj_before = self.topology.get_adjacency_list(only_active=True)
        old_route = dijkstra_shortest_path(adj_before, route_src, route_dst)

        # 2. Deactivate the link
        updated_link = self.topology.set_link_status(source, destination, active=False)

        # 3. Compute route AFTER link failure
        adj_after = self.topology.get_adjacency_list(only_active=True)
        new_route = dijkstra_shortest_path(adj_after, route_src, route_dst)

        # 4. Run Distance Vector after failure
        dv_result = run_distance_vector(adj_after)

        has_alternative = new_route["reachable"] and (new_route["path"] != old_route["path"])
        route_changed = old_route["path"] != new_route["path"]

        return {
            "action": "LINK_FAILURE",
            "failed_link": {
                "source": source,
                "destination": destination,
                "active": False
            },
            "route_inspected": {
                "source": route_src,
                "destination": route_dst
            },
            "old_route": old_route,
            "new_route": new_route,
            "route_changed": route_changed,
            "alternative_route_found": has_alternative,
            "is_reachable_now": new_route["reachable"],
            "distance_vector_convergence": dv_result["converged"],
            "distance_vector_iterations": dv_result["iterations_count"],
            "message": (
                f"Alternative route found: {' -> '.join(new_route['path'])} (Cost: {new_route['total_cost']})"
                if new_route["reachable"]
                else f"No alternative route available. Destination '{route_dst}' is UNREACHABLE."
            )
        }

    def restore_link(self, source: str, destination: str, check_source: Optional[str] = None, check_dest: Optional[str] = None) -> Dict[str, Any]:
        """Restore a failed link and re-evaluate routes."""
        route_src = check_source or source
        route_dst = check_dest or destination

        # 1. Compute route before restoration
        adj_before = self.topology.get_adjacency_list(only_active=True)
        old_route = dijkstra_shortest_path(adj_before, route_src, route_dst)

        # 2. Restore link
        updated_link = self.topology.set_link_status(source, destination, active=True)

        # 3. Compute route after restoration
        adj_after = self.topology.get_adjacency_list(only_active=True)
        new_route = dijkstra_shortest_path(adj_after, route_src, route_dst)

        # 4. Re-run Distance Vector
        dv_result = run_distance_vector(adj_after)

        return {
            "action": "LINK_RESTORE",
            "restored_link": {
                "source": source,
                "destination": destination,
                "active": True
            },
            "route_inspected": {
                "source": route_src,
                "destination": route_dst
            },
            "old_route": old_route,
            "new_route": new_route,
            "is_reachable": new_route["reachable"],
            "distance_vector_convergence": dv_result["converged"],
            "message": f"Link ({source} <-> {destination}) restored. Optimal path: {' -> '.join(new_route['path'])} (Cost: {new_route['total_cost']})."
        }
