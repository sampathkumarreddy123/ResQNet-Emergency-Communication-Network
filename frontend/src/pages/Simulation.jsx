import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  RotateCcw,
  Play,
  Pause
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EventFeed from '../components/EventFeed';
import api from '../services/api';
import { formatNode } from '../utils/nodes';

export default function Simulation() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const [source, setSource] = useState('N0');
  const [destination, setDestination] = useState('N5');
  const [message, setMessage] = useState('URGENT: Flash flood alert in Sector 4. Evacuate to Emergency Shelter.');
  const [numPackets, setNumPackets] = useState(10);
  const [packetRate, setPacketRate] = useState(5.0);
  const [lossProb, setLossProb] = useState(0.05);
  const [corruptionProb, setCorruptionProb] = useState(0.05);
  const [routingAlgo, setRoutingAlgo] = useState('dijkstra');
  const [enableLeaky, setEnableLeaky] = useState(true);
  const [bucketCap, setBucketCap] = useState(15);
  const [leakRate, setLeakRate] = useState(4);
  const [enableArq, setEnableArq] = useState(true);
  const [windowSize, setWindowSize] = useState(4);

  const [playbackState, setPlaybackState] = useState('IDLE');
  const [visiblePacketCount, setVisiblePacketCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getTopology()
      .then((res) => setNodes(res.data.nodes || []))
      .catch(console.error);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (playbackState === 'RUNNING' && simResult) {
      timerRef.current = setInterval(() => {
        setVisiblePacketCount((prev) => {
          const total = simResult.packets?.length || 0;
          if (prev >= total) {
            clearInterval(timerRef.current);
            setPlaybackState('COMPLETED');
            return total;
          }
          return prev + 1;
        });
      }, 350);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playbackState, simResult]);

  const handleStartSimulation = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setPlaybackState('RUNNING');
    setVisiblePacketCount(0);

    try {
      const payload = {
        source,
        destination,
        emergency_message: message,
        num_packets: parseInt(numPackets),
        packet_size_bits: 1024,
        packet_rate: parseFloat(packetRate),
        loss_prob: parseFloat(lossProb),
        corruption_prob: parseFloat(corruptionProb),
        routing_algorithm: routingAlgo,
        enable_leaky_bucket: enableLeaky,
        bucket_capacity: parseInt(bucketCap),
        leak_rate: parseInt(leakRate),
        enable_arq: enableArq,
        window_size: parseInt(windowSize),
        random_seed: Math.floor(Math.random() * 10000),
      };

      const res = await api.startSimulation(payload);
      setSimResult(res.data);
      setVisiblePacketCount(1);
    } catch (err) {
      alert('Simulation error: ' + (err.response?.data?.error || err.message));
      setPlaybackState('IDLE');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaybackState('IDLE');
    setSimResult(null);
    setVisiblePacketCount(0);
  };

  const displayedPackets = (simResult?.packets || []).slice(0, visiblePacketCount);
  const displayedEvents = (simResult?.events || []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Packet Simulation"
        subtitle="End-to-end discrete-event transmission with Leaky Bucket and Go-Back-N ARQ."
        actions={
          <div className="flex items-center space-x-2">
            {playbackState === 'IDLE' && (
              <button
                onClick={handleStartSimulation}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white text-xs font-semibold flex items-center transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" />
                {loading ? 'Starting...' : 'Start'}
              </button>
            )}

            {playbackState === 'RUNNING' && (
              <button
                onClick={() => setPlaybackState('PAUSED')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F7F5] border border-[#E5E9E5] hover:border-[#B8C7BD] text-[#252B28] text-xs font-semibold flex items-center transition-colors"
              >
                <Pause className="w-3.5 h-3.5 mr-1 text-[#747D77]" /> Pause
              </button>
            )}

            {playbackState === 'PAUSED' && (
              <button
                onClick={() => setPlaybackState('RUNNING')}
                className="px-3 py-1.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white text-xs font-semibold flex items-center transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" /> Resume
              </button>
            )}

            <button
              onClick={handleResetSimulation}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F7F5] border border-[#E5E9E5] hover:border-[#B8C7BD] text-[#252B28] text-xs font-semibold flex items-center transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#747D77]" /> Reset
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form (1 Col) */}
        <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs space-y-3">
          <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
            Configuration
          </span>

          <form onSubmit={handleStartSimulation} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] font-mono focus:border-[#064E3B] focus:outline-hidden"
                >
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{formatNode(n.id, nodes)}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Destination</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] font-mono focus:border-[#064E3B] focus:outline-hidden"
                >
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{formatNode(n.id, nodes)}</option>))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Message Payload</label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono text-[11px] bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Packets</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={numPackets}
                  onChange={(e) => setNumPackets(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Rate (pkt/s)</label>
                <input
                  type="number"
                  step="0.5"
                  value={packetRate}
                  onChange={(e) => setPacketRate(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Loss ({Math.round(lossProb * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={lossProb}
                  onChange={(e) => setLossProb(parseFloat(e.target.value))}
                  className="w-full accent-[#064E3B]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#747D77] uppercase font-semibold block mb-1">Corruption ({Math.round(corruptionProb * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={corruptionProb}
                  onChange={(e) => setCorruptionProb(parseFloat(e.target.value))}
                  className="w-full accent-[#064E3B]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E9E5] space-y-2 text-[#252B28]">
              <label className="flex items-center space-x-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={enableLeaky}
                  onChange={(e) => setEnableLeaky(e.target.checked)}
                  className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span>Leaky Bucket Shaper</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={enableArq}
                  onChange={(e) => setEnableArq(e.target.checked)}
                  className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span>Go-Back-N ARQ</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-semibold text-xs flex items-center justify-center mt-2 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 mr-1.5 text-[#F8E7C9]" />
              {loading ? 'Running...' : 'Run Simulation'}
            </button>
          </form>
        </div>

        {/* Results & Event Stream (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {simResult ? (
            <div className="space-y-4 text-xs">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-[#E5E9E5]">
                <div>
                  <span className="text-[#747D77] text-[10px] uppercase font-semibold">Delivery</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{simResult.performance.packet_delivery_ratio_pct}%</div>
                </div>
                <div>
                  <span className="text-[#747D77] text-[10px] uppercase font-semibold">Throughput</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{simResult.performance.throughput_kbps} kbps</div>
                </div>
                <div>
                  <span className="text-[#747D77] text-[10px] uppercase font-semibold">Delay</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{simResult.performance.avg_end_to_end_delay_ms} ms</div>
                </div>
                <div>
                  <span className="text-[#747D77] text-[10px] uppercase font-semibold">Retries</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{simResult.performance.total_retransmissions}</div>
                </div>
              </div>

              {/* Packets Log */}
              <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-[#E5E9E5]">
                  <span className="font-bold uppercase tracking-wider text-[#252B28]">
                    Packets ({visiblePacketCount} / {simResult.packets.length})
                  </span>
                  <span className="font-mono text-[11px] text-[#747D77]">
                    Status: <span className="font-semibold text-[#064E3B]">{playbackState}</span>
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-[#F5F7F5] border-b border-[#E5E9E5] text-[#747D77]">
                      <tr>
                        <th className="py-1.5 px-2">ID</th>
                        <th className="py-1.5 px-2">Status</th>
                        <th className="py-1.5 px-2">Delay</th>
                        <th className="py-1.5 px-2">Retries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9E5] text-[#252B28]">
                      {displayedPackets.map((pkt) => (
                        <tr key={pkt.packet_id} className="hover:bg-[#F5F7F5] transition-colors">
                          <td className="py-1 px-2 font-semibold">{pkt.packet_id}</td>
                          <td className="py-1 px-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              pkt.status === 'DELIVERED' 
                                ? 'bg-[#D9E5DC] text-[#064E3B]' 
                                : 'bg-[#E5E9E5] text-[#252B28]'
                            }`}>
                              {pkt.status}
                            </span>
                          </td>
                          <td className="py-1 px-2">{pkt.end_to_end_delay ? `${pkt.end_to_end_delay}ms` : '—'}</td>
                          <td className="py-1 px-2">{pkt.retransmission_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Event Logs */}
              <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
                  Event Stream
                </span>
                <EventFeed events={displayedEvents} maxItems={6} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-12 text-center text-xs text-[#747D77]">
              Configure parameters on the left and click "Run Simulation".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
