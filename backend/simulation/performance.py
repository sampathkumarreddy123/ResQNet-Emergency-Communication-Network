"""Performance Analyzer.

Computes exact network performance metrics:
- Packet Loss and Packet Loss Rate (%)
- Packet Delivery Ratio (PDR %)
- Throughput (bps and kbps)
- Average End-to-End Delay, Queueing Delay, Propagation Delay
- Retransmission Analysis
- Time series data generation for frontend Recharts
"""

from typing import List, Dict, Any, Optional
from backend.simulation.packet import Packet


class PerformanceAnalyzer:
    """Calculates network performance metrics from simulated packet lifecycle data."""

    @staticmethod
    def analyze(
        packets: List[Packet],
        simulation_duration_seconds: float,
        time_series_buckets: int = 10,
        dropped_packets_count: int = 0
    ) -> Dict[str, Any]:
        """Compute performance analytics from packet list.

        Args:
            packets: List of Packet objects recorded during simulation.
            simulation_duration_seconds: Duration of simulation in seconds (> 0).
            time_series_buckets: Number of time intervals for time-series charts.
            dropped_packets_count: Number of packets rejected due to queue overflow.

        Returns:
            Dictionary with aggregate statistics, time-series charts, and evaluation.
        """
        # Separate original packets from retransmissions
        original_packets = [p for p in packets if not p.is_retransmission]
        total_sent_original = len(original_packets)

        received_originals = [p for p in original_packets if p.status == "RECEIVED"]
        received_count = len(received_originals)

        # Original packets lost or corrupted without eventual delivery
        lost_originals = [p for p in original_packets if p.status in ("LOST", "CORRUPTED", "DROPPED")]
        lost_count = total_sent_original - received_count

        # Retransmissions
        total_retransmissions = sum(p.retransmission_count for p in original_packets)
        total_attempts = total_sent_original + total_retransmissions

        # Ratios (avoid division by zero)
        loss_rate_pct = (lost_count / total_sent_original * 100.0) if total_sent_original > 0 else 0.0
        pdr_pct = (received_count / total_sent_original * 100.0) if total_sent_original > 0 else 0.0

        # Throughput: Total delivered bits / duration
        delivered_bits = sum(p.size_bits for p in received_originals)
        effective_duration = max(simulation_duration_seconds, 0.001)
        throughput_bps = delivered_bits / effective_duration
        throughput_kbps = throughput_bps / 1000.0

        # Delay metrics on received packets
        delays = [p.end_to_end_delay for p in received_originals if p.end_to_end_delay is not None]
        avg_delay = (sum(delays) / len(delays)) if delays else 0.0

        queueing_delays = [p.queueing_delay for p in received_originals]
        avg_queueing_delay = (sum(queueing_delays) / len(queueing_delays)) if queueing_delays else 0.0

        propagation_delays = [p.propagation_delay for p in received_originals]
        avg_propagation_delay = (sum(propagation_delays) / len(propagation_delays)) if propagation_delays else 0.0

        # Build time-series data for Recharts
        time_series = PerformanceAnalyzer._build_time_series(
            packets=packets,
            duration=effective_duration,
            num_buckets=time_series_buckets
        )

        return {
            "summary": {
                "sent_original_packets": total_sent_original,
                "received_original_packets": received_count,
                "lost_original_packets": max(0, lost_count),
                "dropped_packets": dropped_packets_count,
                "total_transmission_attempts": total_attempts,
                "total_retransmissions": total_retransmissions,
                "packet_loss_rate_pct": round(loss_rate_pct, 2),
                "packet_delivery_ratio_pct": round(pdr_pct, 2),
                "throughput_bps": round(throughput_bps, 2),
                "throughput_kbps": round(throughput_kbps, 2),
                "avg_end_to_end_delay_ms": round(avg_delay, 2),
                "avg_queueing_delay_ms": round(avg_queueing_delay, 2),
                "avg_propagation_delay_ms": round(avg_propagation_delay, 2),
                "simulation_duration_seconds": round(effective_duration, 3)
            },
            "time_series": time_series
        }

    @staticmethod
    def _build_time_series(
        packets: List[Packet],
        duration: float,
        num_buckets: int = 10
    ) -> List[Dict[str, Any]]:
        """Slice packets into time buckets for dynamic charts."""
        num_buckets = max(num_buckets, 5)
        bucket_duration = duration / num_buckets
        time_series: List[Dict[str, Any]] = []

        for i in range(num_buckets):
            t_start = i * bucket_duration
            t_end = (i + 1) * bucket_duration
            time_label = f"{round(t_end, 2)}s"

            # Filter packets active in this interval
            pkts_in_bucket = [
                p for p in packets
                if (p.sent_at is not None and t_start <= p.sent_at < t_end) or
                   (p.created_at is not None and t_start <= p.created_at < t_end)
            ]

            sent = len([p for p in pkts_in_bucket if not p.is_retransmission])
            retrans = len([p for p in pkts_in_bucket if p.is_retransmission])
            recv = len([p for p in pkts_in_bucket if p.status == "RECEIVED"])
            lost = len([p for p in pkts_in_bucket if p.status in ("LOST", "CORRUPTED", "DROPPED")])

            delivered_bits = sum(p.size_bits for p in pkts_in_bucket if p.status == "RECEIVED")
            throughput_kbps = (delivered_bits / max(bucket_duration, 0.001)) / 1000.0

            bucket_delays = [p.end_to_end_delay for p in pkts_in_bucket if p.end_to_end_delay is not None]
            avg_delay = (sum(bucket_delays) / len(bucket_delays)) if bucket_delays else 0.0

            pdr = (recv / sent * 100.0) if sent > 0 else (100.0 if recv > 0 else 0.0)

            time_series.append({
                "time": time_label,
                "timestamp": round(t_end, 2),
                "throughput_kbps": round(throughput_kbps, 2),
                "packets_sent": sent,
                "packets_received": recv,
                "packets_lost": lost,
                "retransmissions": retrans,
                "avg_delay_ms": round(avg_delay, 2),
                "pdr_pct": round(min(100.0, pdr), 1)
            })

        return time_series
