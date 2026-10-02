"""Go-Back-N Automatic Repeat Request (ARQ) Protocol Simulator.

Implements sliding window protocol with:
- Configurable window size (N)
- Frame sequence numbering
- Cumulative acknowledgments
- Timer and timeout handling
- Frame loss, ACK loss, and bit corruption simulation
- Receiver out-of-order rejection
- Explicit tracking of original transmissions vs. retransmissions
"""

import random
from typing import Dict, List, Any, Optional


def simulate_go_back_n(
    total_frames: int = 10,
    window_size: int = 4,
    timeout_duration: float = 3.0,
    frame_loss_prob: float = 0.1,
    ack_loss_prob: float = 0.05,
    corruption_prob: float = 0.05,
    random_seed: Optional[int] = 42
) -> Dict[str, Any]:
    """Execute a discrete-event Go-Back-N ARQ simulation.

    Args:
        total_frames: Number of data frames to transmit (e.g. 10).
        window_size: Sender window size N.
        timeout_duration: Timeout duration for unacknowledged frames.
        frame_loss_prob: Probability [0.0, 1.0] of a data frame being lost in transit.
        ack_loss_prob: Probability [0.0, 1.0] of an ACK being lost in transit.
        corruption_prob: Probability [0.0, 1.0] of a frame suffering corruption (detected by CRC).
        random_seed: Random seed for deterministic reproducibility.

    Returns:
        Dictionary containing simulation timeline, metrics, frame logs, and event steps.
    """
    if random_seed is not None:
        rng = random.Random(random_seed)
    else:
        rng = random.Random()

    if total_frames <= 0:
        raise ValueError("total_frames must be greater than 0.")
    if window_size <= 0:
        raise ValueError("window_size must be greater than 0.")

    # State variables
    base = 0  # oldest unacknowledged frame
    next_seq_num = 0  # smallest unused sequence number
    expected_seq = 0  # receiver's expected sequence number

    # Timers: frame_seq -> timeout_expiry_time
    timers: Dict[int, float] = {}

    current_time: float = 0.0
    time_step: float = 0.5

    # Statistics tracking
    original_transmissions = 0
    retransmissions = 0
    lost_frames = 0
    corrupted_frames = 0
    lost_acks = 0
    successful_deliveries = 0

    events: List[Dict[str, Any]] = []
    frame_status: Dict[int, Dict[str, Any]] = {
        i: {
            "seq": i,
            "status": "pending",
            "transmissions": 0,
            "retransmissions": 0,
            "delivered_at": None
        }
        for i in range(total_frames)
    }

    max_steps = 250
    step_count = 0

    while base < total_frames and step_count < max_steps:
        step_count += 1
        current_time = round(current_time + time_step, 2)
        step_actions: List[str] = []

        # 1. Sender sends frames within window [base, base + window_size)
        while next_seq_num < base + window_size and next_seq_num < total_frames:
            seq = next_seq_num
            is_retrans = frame_status[seq]["transmissions"] > 0
            frame_status[seq]["transmissions"] += 1

            if is_retrans:
                retransmissions += 1
                frame_status[seq]["retransmissions"] += 1
                action_type = "RETRANSMISSION"
                desc = f"Sender retransmitted Frame {seq} (Window: [{base}, {min(base + window_size - 1, total_frames - 1)}])"
            else:
                original_transmissions += 1
                action_type = "TRANSMISSION"
                desc = f"Sender transmitted original Frame {seq} (Window: [{base}, {min(base + window_size - 1, total_frames - 1)}])"

            # Set timer for base if not active
            if base not in timers:
                timers[base] = current_time + timeout_duration

            # Simulate channel effects
            lost = rng.random() < frame_loss_prob
            corrupted = (not lost) and (rng.random() < corruption_prob)

            if lost:
                lost_frames += 1
                outcome = "LOST_IN_TRANSIT"
                frame_status[seq]["status"] = "lost"
                step_actions.append(f"Frame {seq} LOST during channel transmission.")
            elif corrupted:
                corrupted_frames += 1
                outcome = "CORRUPTED_CRC_ERROR"
                frame_status[seq]["status"] = "corrupted"
                step_actions.append(f"Frame {seq} suffered bit corruption (CRC verification failed at receiver). Discarded.")
            else:
                # Receiver receives frame
                if seq == expected_seq:
                    outcome = "RECEIVED_OK"
                    successful_deliveries += 1
                    frame_status[seq]["status"] = "delivered"
                    frame_status[seq]["delivered_at"] = current_time
                    expected_seq += 1

                    # Send ACK for this frame
                    ack_lost = rng.random() < ack_loss_prob
                    if ack_lost:
                        lost_acks += 1
                        outcome += "_ACK_LOST"
                        step_actions.append(f"Receiver accepted Frame {seq}, generated ACK {seq}, but ACK was LOST.")
                    else:
                        outcome += "_ACK_SENT"
                        # Cumulative ACK advances sender base to seq + 1
                        old_base = base
                        base = seq + 1
                        if base in timers:
                            del timers[base - 1]
                        if base < next_seq_num:
                            timers[base] = current_time + timeout_duration
                        else:
                            timers.clear()
                        step_actions.append(f"Receiver accepted Frame {seq}. Sender received ACK {seq}; sliding window advanced base {old_base} -> {base}.")
                else:
                    outcome = "DISCARDED_OUT_OF_ORDER"
                    step_actions.append(f"Receiver received out-of-order Frame {seq} (expected {expected_seq}). Discarded. Resent ACK for last valid {expected_seq - 1}.")

            events.append({
                "time": current_time,
                "step": step_count,
                "type": action_type,
                "frame_seq": seq,
                "outcome": outcome,
                "sender_window": [base, min(base + window_size - 1, total_frames - 1)],
                "base": base,
                "next_seq_num": next_seq_num + 1,
                "expected_seq": expected_seq,
                "description": desc
            })

            next_seq_num += 1

        # 2. Check for timer expiration at base
        if base in timers and current_time >= timers[base]:
            # Timeout occurred! Go back to base
            step_actions.append(f"TIMEOUT for Frame {base}! Go-Back-N triggered: resetting next_seq_num to {base}.")
            events.append({
                "time": current_time,
                "step": step_count,
                "type": "TIMEOUT",
                "frame_seq": base,
                "outcome": "TIMEOUT_EXPIRED",
                "sender_window": [base, min(base + window_size - 1, total_frames - 1)],
                "base": base,
                "next_seq_num": base,
                "expected_seq": expected_seq,
                "description": f"Timer expired for Frame {base}. Retransmitting all unacknowledged frames in window."
            })
            # Restart timer and rewind next_seq_num
            timers[base] = current_time + timeout_duration
            next_seq_num = base

    total_attempts = original_transmissions + retransmissions
    pdr = (successful_deliveries / total_frames * 100) if total_frames > 0 else 0.0

    return {
        "config": {
            "total_frames": total_frames,
            "window_size": window_size,
            "timeout_duration": timeout_duration,
            "frame_loss_prob": frame_loss_prob,
            "ack_loss_prob": ack_loss_prob,
            "corruption_prob": corruption_prob,
            "random_seed": random_seed
        },
        "stats": {
            "total_frames": total_frames,
            "original_transmissions": original_transmissions,
            "retransmissions": retransmissions,
            "total_transmission_attempts": total_attempts,
            "lost_frames": lost_frames,
            "corrupted_frames": corrupted_frames,
            "lost_acks": lost_acks,
            "successful_deliveries": successful_deliveries,
            "packet_delivery_ratio": round(pdr, 2),
            "simulation_steps": step_count,
            "total_time": round(current_time, 2)
        },
        "frame_status": frame_status,
        "events": events
    }
