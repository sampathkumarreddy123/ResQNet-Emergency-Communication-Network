"""Leaky Bucket Traffic Shaping and Congestion Control Algorithm.

Simulates a leaky bucket with finite queue capacity, constant leak rate,
burst arrivals, packet drops on buffer overflow, and step-by-step queue tracking.
"""

from typing import Dict, List, Any, Optional


def simulate_leaky_bucket(
    bucket_capacity: int = 15,
    leak_rate: int = 3,
    incoming_rate_pattern: Optional[List[int]] = None,
    simulation_steps: int = 15
) -> Dict[str, Any]:
    """Run a time-stepped Leaky Bucket congestion control simulation.

    Args:
        bucket_capacity: Maximum capacity (in packets) the bucket/queue can hold.
        leak_rate: Fixed rate (packets per time step) at which packets are transmitted out.
        incoming_rate_pattern: Optional list of incoming packet counts per step.
                               If None, a default bursty disaster traffic profile is used.
        simulation_steps: Number of discrete time steps to simulate.

    Returns:
        Dictionary containing configuration, aggregate metrics, step history, and event logs.
    """
    if bucket_capacity <= 0:
        raise ValueError("bucket_capacity must be greater than 0.")
    if leak_rate <= 0:
        raise ValueError("leak_rate must be greater than 0.")

    # Default bursty emergency traffic scenario if not provided
    if incoming_rate_pattern is None:
        incoming_rate_pattern = [2, 4, 8, 12, 10, 6, 2, 1, 0, 0, 7, 9, 3, 1, 0]

    actual_steps = max(simulation_steps, len(incoming_rate_pattern))
    # Pad pattern if fewer elements than actual_steps
    while len(incoming_rate_pattern) < actual_steps:
        incoming_rate_pattern.append(0)

    current_queue_size = 0
    total_incoming = 0
    total_accepted = 0
    total_transmitted = 0
    total_dropped = 0
    congestion_events_count = 0

    history: List[Dict[str, Any]] = []
    events: List[str] = []

    for step in range(1, actual_steps + 1):
        incoming = incoming_rate_pattern[step - 1]
        total_incoming += incoming

        # Check available space before leak
        available_space = bucket_capacity - current_queue_size

        if incoming <= available_space:
            accepted = incoming
            dropped = 0
        else:
            accepted = available_space
            dropped = incoming - available_space
            total_dropped += dropped
            congestion_events_count += 1
            events.append(
                f"Step {step}: CONGESTION! Queue overflow - {dropped} incoming packet(s) dropped (Bucket full: {bucket_capacity}/{bucket_capacity})."
            )

        total_accepted += accepted
        current_queue_size += accepted

        # Leaky bucket discharges at constant leak_rate
        transmitted = min(current_queue_size, leak_rate)
        current_queue_size -= transmitted
        total_transmitted += transmitted

        queue_utilization_pct = round((current_queue_size / bucket_capacity) * 100, 1)

        history.append({
            "step": step,
            "incoming": incoming,
            "accepted": accepted,
            "dropped": dropped,
            "transmitted": transmitted,
            "queue_size": current_queue_size,
            "capacity": bucket_capacity,
            "leak_rate": leak_rate,
            "utilization_pct": queue_utilization_pct,
            "congestion": dropped > 0
        })

    # Drain any remaining packets in the bucket after incoming pattern ends
    drain_step = actual_steps
    while current_queue_size > 0 and drain_step < actual_steps + 10:
        drain_step += 1
        transmitted = min(current_queue_size, leak_rate)
        current_queue_size -= transmitted
        total_transmitted += transmitted
        history.append({
            "step": drain_step,
            "incoming": 0,
            "accepted": 0,
            "dropped": 0,
            "transmitted": transmitted,
            "queue_size": current_queue_size,
            "capacity": bucket_capacity,
            "leak_rate": leak_rate,
            "utilization_pct": round((current_queue_size / bucket_capacity) * 100, 1),
            "congestion": False
        })

    drop_rate = round((total_dropped / total_incoming * 100), 2) if total_incoming > 0 else 0.0

    return {
        "config": {
            "bucket_capacity": bucket_capacity,
            "leak_rate": leak_rate,
            "simulation_steps": len(history),
            "incoming_pattern": incoming_rate_pattern
        },
        "metrics": {
            "total_incoming": total_incoming,
            "total_accepted": total_accepted,
            "total_transmitted": total_transmitted,
            "total_dropped": total_dropped,
            "drop_rate_pct": drop_rate,
            "final_queue_size": current_queue_size,
            "congestion_events": congestion_events_count
        },
        "history": history,
        "events": events
    }
