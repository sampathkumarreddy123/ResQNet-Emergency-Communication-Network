import React, { useState, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  Play
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EventFeed from '../components/EventFeed';
import api from '../services/api';
import { formatNode } from '../utils/nodes';

export default function PacketTransmission() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Form parameters
  const [source, setSource] = useState('N0');
  const [destination, setDestination] = useState('N5');
  const [message, setMessage] = useState('URGENT: Flash flood alert in Sector 4. Evacuate to Emergency Shelter.');
  const [packetSize, setPacketSize] = useState(1024);
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
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    api.getTopology().then((res) => setNodes(res.data.nodes || [])).catch(console.error);
  }, []);

  const handleStartSimulation = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        source,
        destination,
        emergency_message: message,
        num_packets: parseInt(numPackets),
        packet_size_bits: parseInt(packetSize),
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
    } catch (err) {
      alert('Simulation error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSimResult(null);
    setMessage('URGENT: Flash flood alert in Sector 4. Evacuate to Emergency Shelter.');
    setNumPackets(10);
    setLossProb(0.05);
    setCorruptionProb(0.05);
  };

  const filteredPackets = (simResult?.packets || []).filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packet Transmission Simulator"
        subtitle="Simulate end-to-end packet transmission with dynamic routing, Leaky Bucket queueing, CRC integrity checking, and Go-Back-N ARQ error recovery."
        badge="Discrete-Event Simulator"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Transmission Parameter Form */}
        <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E5] mb-3">
            <h2 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
              Simulation Parameters
            </h2>
            <button
              onClick={handleResetForm}
              className="text-xs text-[#747D77] hover:text-[#064E3B] flex items-center cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </button>
          </div>

          <div className="bg-[#F5F7F5] border border-[#E5E9E5] rounded-lg p-2.5 mb-3 text-[11px] text-[#747D77]">
            <span className="font-mono text-[10px] font-bold text-[#064E3B] uppercase block mb-0.5">
              Simulated Baseline Parameters
            </span>
            Predefined default values are simulated configuration settings, not field measurements. All routing, retransmissions, drops, throughput, and delay are dynamically recalculated.
          </div>

          <form onSubmit={handleStartSimulation} className="space-y-3.5 text-xs">
            {/* Endpoints */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Source Node</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 font-semibold bg-[#F5F7F5] text-[#252B28] mt-1 focus:border-[#064E3B] focus:outline-hidden"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} ({n.label})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Destination Node</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 font-semibold bg-[#F5F7F5] text-[#252B28] mt-1 focus:border-[#064E3B] focus:outline-hidden"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} ({n.label})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Emergency Message */}
            <div>
              <label className="text-[10px] font-bold text-[#747D77] uppercase">Emergency Payload</label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-[#E5E9E5] rounded-lg p-2 mt-1 font-mono text-[11px] text-[#252B28] bg-[#F5F7F5] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
            </div>

            {/* Packets & Rate */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Packets (Count)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={numPackets}
                  onChange={(e) => setNumPackets(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 mt-1 text-[#252B28] bg-[#F5F7F5] font-mono focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Size (Bits)</label>
                <input
                  type="number"
                  step="128"
                  value={packetSize}
                  onChange={(e) => setPacketSize(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 mt-1 text-[#252B28] bg-[#F5F7F5] font-mono focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Packet Rate & Routing Algorithm */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Rate (Packets/s)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={packetRate}
                  onChange={(e) => setPacketRate(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 mt-1 text-[#252B28] bg-[#F5F7F5] font-mono focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Routing Algorithm</label>
                <select
                  value={routingAlgo}
                  onChange={(e) => setRoutingAlgo(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 font-semibold bg-[#F5F7F5] text-[#252B28] mt-1 uppercase focus:border-[#064E3B] focus:outline-hidden"
                >
                  <option value="dijkstra">Dijkstra</option>
                  <option value="distance_vector">Distance Vector</option>
                </select>
              </div>
            </div>

            {/* Probabilities */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#747D77] uppercase">
                  <span>Loss Prob:</span>
                  <span className="font-mono text-[#064E3B]">{Math.round(lossProb * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.01"
                  value={lossProb}
                  onChange={(e) => setLossProb(parseFloat(e.target.value))}
                  className="w-full mt-1.5 accent-[#064E3B]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#747D77] uppercase">
                  <span>Corruption:</span>
                  <span className="font-mono text-[#064E3B]">{Math.round(corruptionProb * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.01"
                  value={corruptionProb}
                  onChange={(e) => setCorruptionProb(parseFloat(e.target.value))}
                  className="w-full mt-1.5 accent-[#064E3B]"
                />
              </div>
            </div>

            {/* Leaky Bucket & ARQ Toggles */}
            <div className="pt-2 border-t border-[#E5E9E5] space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLeaky}
                  onChange={(e) => setEnableLeaky(e.target.checked)}
                  className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span className="font-semibold text-[#252B28]">Leaky Bucket Regulator</span>
              </label>

              {enableLeaky && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <div>
                    <label className="text-[10px] text-[#747D77] uppercase">Queue Cap</label>
                    <input
                      type="number"
                      value={bucketCap}
                      onChange={(e) => setBucketCap(e.target.value)}
                      className="w-full border border-[#E5E9E5] rounded p-1 text-xs font-mono bg-[#F5F7F5] text-[#252B28]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#747D77] uppercase">Leak Rate</label>
                    <input
                      type="number"
                      value={leakRate}
                      onChange={(e) => setLeakRate(e.target.value)}
                      className="w-full border border-[#E5E9E5] rounded p-1 text-xs font-mono bg-[#F5F7F5] text-[#252B28]"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={enableArq}
                  onChange={(e) => setEnableArq(e.target.checked)}
                  className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span className="font-semibold text-[#252B28]">Go-Back-N Retransmissions</span>
              </label>

              {enableArq && (
                <div className="pl-5">
                  <label className="text-[10px] text-[#747D77] uppercase">Sender Window Size (N)</label>
                  <input
                    type="number"
                    value={windowSize}
                    onChange={(e) => setWindowSize(e.target.value)}
                    className="w-full border border-[#E5E9E5] rounded p-1 text-xs font-mono bg-[#F5F7F5] text-[#252B28]"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-bold text-xs flex items-center justify-center transition-all mt-3 cursor-pointer shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 mr-1.5 text-[#F8E7C9] ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Simulating...' : 'Transmit Packets'}
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Packet Status Dashboard & Event Stream */}
        <div className="lg:col-span-2 space-y-6">
          {simResult ? (
            <div className="space-y-6">
              {/* Summary KPIs Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-4 rounded-xl border border-[#E5E9E5] shadow-xs">
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Delivery Ratio</span>
                  <div className="text-xl font-bold text-[#064E3B]">
                    {simResult.performance.packet_delivery_ratio_pct}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Throughput</span>
                  <div className="text-xl font-bold text-[#064E3B]">
                    {simResult.performance.throughput_kbps} <span className="text-xs text-[#747D77]">kbps</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Avg Latency</span>
                  <div className="text-xl font-bold text-[#064E3B]">
                    {simResult.performance.avg_end_to_end_delay_ms} <span className="text-xs text-[#747D77]">ms</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Retransmissions</span>
                  <div className="text-xl font-bold text-[#064E3B]">
                    {simResult.performance.total_retransmissions}
                  </div>
                </div>
              </div>

              {/* Packets Grid and Filter Tabs */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E9E5]">
                  <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
                    Packets State Breakdown ({simResult.packets.length})
                  </h3>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {['ALL', 'RECEIVED', 'CORRUPTED', 'LOST', 'DROPPED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded font-mono font-bold transition-all cursor-pointer ${
                          statusFilter === st
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'bg-[#F5F7F5] text-[#747D77] hover:text-[#064E3B] border border-[#E5E9E5]'
                        }`}
                      >
                        [{st}]
                      </button>
                    ))}
                  </div>
                </div>

                {/* Packet Cards Container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredPackets.map((pkt) => (
                    <div
                      key={pkt.packet_id}
                      className="p-3 rounded-lg border border-[#E5E9E5] bg-[#F5F7F5] hover:bg-white text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#252B28] font-mono">{pkt.packet_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          pkt.status === 'RECEIVED'
                            ? 'bg-[#D9E5DC] text-[#064E3B]'
                            : 'bg-white border border-[#E5E9E5] text-[#747D77]'
                        }`}>
                          [{pkt.status}]
                        </span>
                      </div>
                      <div className="text-[11px] text-[#747D77] truncate">
                        {formatNode(pkt.source, nodes)} → {formatNode(pkt.destination, nodes)} via {pkt.path_traversed?.map((n) => formatNode(n, nodes)).join(' → ') || 'Direct'}
                      </div>
                      <div className="text-[11px] text-[#747D77] flex justify-between pt-1 border-t border-[#E5E9E5] font-mono">
                        <span>Delay: {pkt.end_to_end_delay ? `${pkt.end_to_end_delay}ms` : '—'}</span>
                        <span>Retries: {pkt.retransmission_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Logs Box */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 shadow-xs">
                <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider mb-3">
                  Simulation Event Stream
                </h3>
                <EventFeed events={simResult.events} maxItems={8} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E9E5] p-12 text-center shadow-xs">
              <Send className="w-8 h-8 text-[#747D77] mx-auto mb-2 opacity-60" />
              <h3 className="text-xs font-bold text-[#252B28] uppercase">Ready to Transmit Packets</h3>
              <p className="text-xs text-[#747D77] max-w-sm mx-auto mt-1">
                Configure transmission parameters and click <strong>"Transmit Packets"</strong> to evaluate throughput, delay, and packet delivery ratio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
