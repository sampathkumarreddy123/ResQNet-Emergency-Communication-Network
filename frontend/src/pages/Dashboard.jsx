import React, { useState, useEffect } from 'react';
import {
  Activity,
  Send,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  RefreshCw,
  Play,
  Network
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PageHeader from '../components/PageHeader';
import EventFeed from '../components/EventFeed';
import api from '../services/api';
import { formatNode } from '../utils/nodes';

export default function Dashboard() {
  const [topology, setTopology] = useState({ total_nodes: 7, active_links: 10, failed_links: 0 });
  const [latestSim, setLatestSim] = useState(null);
  const [events, setEvents] = useState([]);
  const [runningScenario, setRunningScenario] = useState(null);

  const loadData = async (keepCurrentSim = false) => {
    try {
      const [topoRes, historyRes] = await Promise.all([
        api.getTopology(),
        api.getSimulationHistory(5),
      ]);
      setTopology(topoRes.data);
      if (!keepCurrentSim && historyRes.data && historyRes.data.length > 0) {
        setLatestSim(historyRes.data[0]);
        setEvents(historyRes.data[0].events || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runScenario = async (type) => {
    setRunningScenario(type);
    try {
      let config = {
        source: 'N0',
        destination: 'N5',
        scenario: type,
        num_packets: 10,
        random_seed: Math.floor(Math.random() * 1000),
      };

      if (type === 'normal') {
        config = {
          ...config,
          emergency_message: 'NORMAL: Routine health status check.',
          loss_prob: 0.02,
          corruption_prob: 0.02,
          packet_rate: 4.0,
          bucket_capacity: 20,
          leak_rate: 5,
        };
      } else if (type === 'congestion') {
        config = {
          ...config,
          emergency_message: 'CONGESTION: Emergency evacuation broadcast.',
          num_packets: 20,
          packet_rate: 15.0,
          bucket_capacity: 8,
          leak_rate: 3,
        };
      } else if (type === 'error_recovery') {
        config = {
          ...config,
          emergency_message: 'ERROR_RECOVERY: Hostile radio storm interference.',
          num_packets: 12,
          loss_prob: 0.25,
          corruption_prob: 0.20,
          enable_arq: true,
          window_size: 4,
        };
      }

      const res = await api.startSimulation(config);
      setLatestSim(res.data);
      setEvents(res.data.events || []);
      await loadData(true);
    } catch (err) {
      alert('Scenario failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRunningScenario(null);
    }
  };

  const perf = latestSim?.performance || {};

  return (
    <div className="space-y-4">
      {/* Clean Page Header with 3 Quick Scenarios */}
      <PageHeader
        title="ResQNet Operations Dashboard"
        subtitle="Reliable Routing. Resilient Communication. Real-Time Simulation."
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => runScenario('normal')}
              disabled={runningScenario !== null}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                runningScenario === 'normal'
                  ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]'
                  : 'bg-white hover:bg-[#F5F7F5] border-[#E5E9E5] hover:border-[#B8C7BD] text-[#252B28]'
              }`}
            >
              {runningScenario === 'normal' ? 'Running...' : 'Run Normal'}
            </button>
            <button
              onClick={() => runScenario('congestion')}
              disabled={runningScenario !== null}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                runningScenario === 'congestion'
                  ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]'
                  : 'bg-white hover:bg-[#F5F7F5] border-[#E5E9E5] hover:border-[#B8C7BD] text-[#252B28]'
              }`}
            >
              {runningScenario === 'congestion' ? 'Running...' : 'Run Congestion'}
            </button>
            <button
              onClick={() => runScenario('error_recovery')}
              disabled={runningScenario !== null}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                runningScenario === 'error_recovery'
                  ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]'
                  : 'bg-white hover:bg-[#F5F7F5] border-[#E5E9E5] hover:border-[#B8C7BD] text-[#252B28]'
              }`}
            >
              {runningScenario === 'error_recovery' ? 'Running...' : 'Run Error Recovery'}
            </button>
          </div>
        }
      />

      {/* ResQNet Welcome & Identity Section */}
      <div className="bg-white border border-[#E5E9E5] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-base tracking-wide text-[#064E3B]">ResQNet</span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#F8E7C9] text-[#064E3B] border border-[#064E3B]/20">
              Emergency Communication Network Simulation
            </span>
          </div>
          <p className="text-xs text-[#747D77] font-medium leading-relaxed">
            Reliable Routing. Resilient Communication. Real-Time Simulation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono text-[#252B28] bg-[#F5F7F5] px-3 py-2 rounded-lg border border-[#E5E9E5] w-full md:w-auto">
          <div>
            <span className="text-[#747D77]">Topology:</span> <strong className="text-[#064E3B]">{topology.total_nodes || 7} Nodes</strong>
          </div>
          <span className="hidden sm:inline text-[#B8C7BD]">|</span>
          <div>
            <span className="text-[#747D77]">Channel Status:</span> <strong className="text-[#064E3B]">{topology.active_links || 10} Active Links</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <MetricCard title="Nodes" value={topology.total_nodes || 7} icon={Network} />
        <MetricCard title="Active Links" value={topology.active_links || 10} icon={Activity} />
        <MetricCard title="Failed Links" value={topology.failed_links || 0} icon={XCircle} />
        <MetricCard title="Packets Sent" value={perf.sent_original_packets || 0} icon={Send} />
        <MetricCard title="Received" value={perf.received_original_packets || 0} icon={CheckCircle2} />
        <MetricCard title="Delivery Rate" value={`${perf.packet_delivery_ratio_pct ?? 100}%`} icon={TrendingUp} />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard title="Throughput" value={perf.throughput_kbps ?? 0} unit="kbps" icon={TrendingUp} />
        <MetricCard title="Average Delay" value={perf.avg_end_to_end_delay_ms ?? 0} unit="ms" icon={Clock} />
        <MetricCard title="Retransmissions" value={perf.total_retransmissions || 0} icon={RefreshCw} />
        <MetricCard title="Dropped Packets" value={perf.dropped_packets || 0} icon={XCircle} />
      </div>

      {/* Main Grid: Active Simulation & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Simulation Summary (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5E9E5] p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-[#E5E9E5] gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#252B28]">
              Current Run Status
            </h2>
            {latestSim?.routing?.path && (
              <span className="font-mono text-[11px] sm:text-xs font-bold text-[#064E3B] bg-[#F8E7C9] px-2 py-0.5 rounded border border-[#064E3B]/20 break-words">
                Path: {latestSim.routing.path.map((n) => formatNode(n)).join(' → ')}
              </span>
            )}
          </div>

          {latestSim ? (
            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] flex flex-col sm:flex-row justify-between gap-1.5">
                <span>Scenario: <strong className="uppercase text-[#064E3B]">{latestSim.scenario}</strong></span>
                <span className="truncate">Message: <span className="font-mono text-[#747D77]">{latestSim.config?.emergency_message}</span></span>
              </div>

              {/* Packets Table */}
              <div className="overflow-x-auto border border-[#E5E9E5] rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F5F7F5] border-b border-[#E5E9E5] text-[#747D77]">
                    <tr>
                      <th className="py-2 px-3">Packet</th>
                      <th className="py-2 px-3">Path</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Delay</th>
                      <th className="py-2 px-3">Retries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9E5]">
                    {(latestSim.packets || []).slice(0, 5).map((pkt, i) => (
                      <tr key={i} className="hover:bg-[#F5F7F5]">
                        <td className="py-1.5 px-3 font-semibold text-[#252B28]">{pkt.packet_id}</td>
                        <td className="py-1.5 px-3 text-[#747D77]">{pkt.path_traversed?.map((n) => formatNode(n)).join(' → ') || 'Direct'}</td>
                        <td className="py-1.5 px-3 font-semibold">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pkt.status === 'DELIVERED'
                              ? 'bg-[#D9E5DC] text-[#064E3B]'
                              : pkt.status === 'DROPPED'
                              ? 'bg-[#E5E9E5] text-[#747D77]'
                              : 'bg-[#F8E7C9] text-[#064E3B]'
                          }`}>
                            {pkt.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-[#252B28]">{pkt.end_to_end_delay ? `${pkt.end_to_end_delay}ms` : '—'}</td>
                        <td className="py-1.5 px-3 text-[#252B28]">{pkt.retransmission_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-[#F5F7F5] rounded-lg border border-dashed border-[#E5E9E5] text-xs text-[#747D77]">
              No simulation run yet. Click a scenario button above to start.
            </div>
          )}
        </div>

        {/* Live Events Stream (1 Col) */}
        <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E9E5]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#252B28]">
              Event Stream
            </h2>
            <span className="text-[10px] font-mono text-[#747D77]">{events.length} Events</span>
          </div>
          <EventFeed events={events} maxItems={8} />
        </div>
      </div>
    </div>
  );
}
