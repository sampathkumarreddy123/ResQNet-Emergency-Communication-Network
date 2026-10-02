"""MongoDB Database Handler with schema collections and memory fallback."""

import os
import time
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
import pymongo
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

# Load environment configuration from .env or backend/.env
load_dotenv()
_backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(_backend_env):
    load_dotenv(_backend_env)


class DatabaseManager:
    """Manages persistence across MongoDB collections with graceful in-memory fallback."""

    def __init__(self):
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        self.db_name = os.getenv("MONGO_DB_NAME", "emergency_comm_network")
        self.client: Optional[pymongo.MongoClient] = None
        self.db = None
        self.is_connected = False
        self.connection_error: Optional[str] = None

        # In-memory storage fallback
        self.mem_simulations: List[Dict[str, Any]] = []
        self.mem_networks: Dict[str, Any] = {}
        self.mem_events: List[Dict[str, Any]] = []

        self._connect()

    def _connect(self) -> None:
        """Attempt connection to MongoDB."""
        try:
            self.client = pymongo.MongoClient(
                self.mongo_uri,
                serverSelectionTimeoutMS=2000
            )
            # Trigger quick server ping
            self.client.admin.command("ping")
            self.db = self.client[self.db_name]
            self.is_connected = True
            self.connection_error = None
        except (ServerSelectionTimeoutError, PyMongoError, Exception) as exc:
            self.is_connected = False
            self.connection_error = str(exc)
            self.db = None

    def get_status(self) -> Dict[str, Any]:
        """Return database connectivity diagnostic."""
        if not self.is_connected:
            self._connect()  # Retry ping

        return {
            "connected": self.is_connected,
            "database_name": self.db_name if self.is_connected else None,
            "mongo_uri": self.mongo_uri if self.is_connected else None,
            "error": self.connection_error,
            "using_memory_fallback": not self.is_connected
        }

    def save_simulation(self, sim_data: Dict[str, Any]) -> str:
        """Persist simulation outcome into simulations, packet_logs, routing_results, and performance_results."""
        sim_id = sim_data.get("simulation_id", f"SIM-{int(time.time() * 1000)}")

        # Store in memory cache
        self.mem_simulations.insert(0, sim_data)
        if len(self.mem_simulations) > 100:
            self.mem_simulations.pop()

        if self.is_connected and self.db is not None:
            try:
                # 1. Main simulation doc
                self.db.simulations.update_one(
                    {"simulation_id": sim_id},
                    {"$set": {
                        "simulation_id": sim_id,
                        "scenario": sim_data.get("scenario", "custom"),
                        "config": sim_data.get("config", {}),
                        "routing": sim_data.get("routing", {}),
                        "performance": sim_data.get("performance", {}),
                        "time_series": sim_data.get("time_series", []),
                        "created_at": time.time(),
                        "status": "COMPLETED"
                    }},
                    upsert=True
                )

                # 2. Performance results
                self.db.performance_results.update_one(
                    {"simulation_id": sim_id},
                    {"$set": {
                        "simulation_id": sim_id,
                        "metrics": sim_data.get("performance", {}),
                        "time_series": sim_data.get("time_series", [])
                    }},
                    upsert=True
                )

                # 3. Routing results
                self.db.routing_results.update_one(
                    {"simulation_id": sim_id},
                    {"$set": {
                        "simulation_id": sim_id,
                        "routing": sim_data.get("routing", {})
                    }},
                    upsert=True
                )

                # 4. Packet logs
                packets = sim_data.get("packets", [])
                if packets:
                    docs = []
                    for pkt in packets:
                        docs.append({
                            "simulation_id": sim_id,
                            "packet_id": pkt.get("packet_id"),
                            "source": pkt.get("source"),
                            "destination": pkt.get("destination"),
                            "status": pkt.get("status"),
                            "delay": pkt.get("end_to_end_delay"),
                            "retransmissions": pkt.get("retransmission_count"),
                            "is_retransmission": pkt.get("is_retransmission")
                        })
                    self.db.packet_logs.delete_many({"simulation_id": sim_id})
                    self.db.packet_logs.insert_many(docs)

                # 5. Events
                events = sim_data.get("events", [])
                if events:
                    event_docs = [{**evt, "simulation_id": sim_id} for evt in events]
                    self.db.network_events.insert_many(event_docs)

            except Exception as e:
                # Log error and keep memory fallback
                self.connection_error = str(e)

        return sim_id

    def get_simulation_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve recent simulation runs with time_series data."""
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.simulations.find(
                    {},
                    {"_id": 0}
                ).sort("created_at", -1).limit(limit)
                results = list(cursor)
                if results:
                    missing_ids = [r["simulation_id"] for r in results if not r.get("time_series")]
                    if missing_ids:
                        perf_docs = list(self.db.performance_results.find(
                            {"simulation_id": {"$in": missing_ids}},
                            {"_id": 0, "simulation_id": 1, "time_series": 1}
                        ))
                        perf_map = {p["simulation_id"]: p.get("time_series", []) for p in perf_docs}
                        for r in results:
                            if not r.get("time_series"):
                                r["time_series"] = perf_map.get(r["simulation_id"], [])
                    return results
            except Exception as e:
                self.connection_error = str(e)

        return self.mem_simulations[:limit]

    def get_simulation_by_id(self, sim_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve specific simulation run."""
        if self.is_connected and self.db is not None:
            try:
                doc = self.db.simulations.find_one({"simulation_id": sim_id}, {"_id": 0})
                if doc:
                    perf = self.db.performance_results.find_one({"simulation_id": sim_id}, {"_id": 0})
                    packets = list(self.db.packet_logs.find({"simulation_id": sim_id}, {"_id": 0}))
                    events = list(self.db.network_events.find({"simulation_id": sim_id}, {"_id": 0}))
                    return {
                        **doc,
                        "time_series": perf.get("time_series", []) if perf else [],
                        "packets": packets,
                        "events": events
                    }
            except Exception:
                pass

        for s in self.mem_simulations:
            if s.get("simulation_id") == sim_id:
                return s
        return None

    def save_topology(self, topology_data: Dict[str, Any], network_id: str = "default_emergency_net") -> None:
        """Persist current network topology."""
        self.mem_networks[network_id] = topology_data
        if self.is_connected and self.db is not None:
            try:
                self.db.networks.update_one(
                    {"network_id": network_id},
                    {"$set": {
                        "network_id": network_id,
                        "topology": topology_data,
                        "updated_at": time.time()
                    }},
                    upsert=True
                )
            except Exception as e:
                self.connection_error = str(e)


# Global DB instance
db_manager = DatabaseManager()
