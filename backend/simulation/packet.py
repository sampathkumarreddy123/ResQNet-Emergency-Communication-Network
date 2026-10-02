"""Packet representation and lifecycle state model."""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class Packet:
    """Represents an emergency communication network packet."""

    packet_id: str
    source: str
    destination: str
    message: str
    size_bits: int = 1024  # default 1024 bits (128 bytes)
    seq_num: int = 0
    is_retransmission: bool = False
    retransmission_count: int = 0
    status: str = "CREATED"  # CREATED, QUEUED, TRANSMITTING, RECEIVED, CORRUPTED, LOST, RETRANSMITTED, DROPPED
    created_at: float = 0.0
    queued_at: Optional[float] = None
    sent_at: Optional[float] = None
    received_at: Optional[float] = None
    end_to_end_delay: Optional[float] = None
    queueing_delay: float = 0.0
    propagation_delay: float = 0.0
    transmission_delay: float = 0.0
    path_traversed: List[str] = field(default_factory=list)
    crc_codeword: Optional[str] = None
    error_injected: bool = False
    event_logs: List[str] = field(default_factory=list)

    def log(self, event: str) -> None:
        """Append an event message to the packet's lifecycle trace."""
        self.event_logs.append(event)

    def to_dict(self) -> Dict[str, Any]:
        """Convert packet to JSON serializable dictionary."""
        return {
            "packet_id": self.packet_id,
            "source": self.source,
            "destination": self.destination,
            "message": self.message,
            "size_bits": self.size_bits,
            "seq_num": self.seq_num,
            "is_retransmission": self.is_retransmission,
            "retransmission_count": self.retransmission_count,
            "status": self.status,
            "created_at": self.created_at,
            "queued_at": self.queued_at,
            "sent_at": self.sent_at,
            "received_at": self.received_at,
            "end_to_end_delay": round(self.end_to_end_delay, 2) if self.end_to_end_delay is not None else None,
            "queueing_delay": round(self.queueing_delay, 2),
            "propagation_delay": round(self.propagation_delay, 2),
            "transmission_delay": round(self.transmission_delay, 2),
            "path_traversed": self.path_traversed,
            "crc_codeword": self.crc_codeword,
            "error_injected": self.error_injected,
            "event_logs": self.event_logs
        }
