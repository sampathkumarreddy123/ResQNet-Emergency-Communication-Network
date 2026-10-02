import React, { useState, useEffect } from 'react';
import {
  History,
  Database,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  Activity,
  Sparkles,
  Info
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import EventFeed from '../components/EventFeed';
import api from '../services/api';
import { formatNode } from '../utils/nodes';

export default function SimulationHistory() {
  const [history, setHistory] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState('ALL');
  const [dbStatus, setDbStatus] = useState({ connected: false });

  const loadData = async () => {
    setLoading(true);
    try {
      const [histRes, healthRes] = await Promise.all([
        api.getSimulationHistory(50),
        api.getHealth(),
      ]);
      const runs = histRes.data || [];
      setHistory(runs);
      setDbStatus(healthRes.data?.database || { connected: false });
      if (runs.length > 0 && !selectedRun) {
        setSelectedRun(runs[0]);
      }
    } catch (err) {
      console.error('Failed loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCSV = () => {
    window.open(api.getExportUrl(), '_blank');
  };

  // Filter runs based on search and scenario filter
  const filteredHistory = history.filter((run) => {
    const matchesScenario =
      scenarioFilter === 'ALL' || run.scenario?.toLowerCase() === scenarioFilter.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      run.simulation_id?.toLowerCase().includes(query) ||
      run.scenario?.toLowerCase().includes(query) ||
      run.config?.source?.toLowerCase().includes(query) ||
      run.config?.destination?.toLowerCase().includes(query) ||
      run.config?.emergency_message?.toLowerCase().includes(query);

    return matchesScenario && matchesQuery;
  });

  const perf = selectedRun?.performance || {};
  const packets = selectedRun?.packets || [];
  const events = selectedRun?.events || [];

  const getScenarioBadge = (sc = '') => {
    const s = sc.toLowerCase();
    if (s.includes('normal')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('congestion')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('error')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Simulation History"
        subtitle="Review past simulation runs and inspect packet logs."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-[#E5E9E5] text-xs font-semibold text-[#252B28] bg-white hover:bg-[#F5F7F5] transition-colors flex items-center cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 text-[#747D77] ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#183B32] text-white text-xs font-semibold flex items-center transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-[#F8E7C9]" />
              Export CSV
            </button>
          </div>
        }
      />

      {/* Storage Status & Search Bar */}
      <div className="bg-white rounded-xl border border-[#E5E9E5] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#747D77] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-[#E5E9E5] rounded-lg text-xs bg-[#F5F7F5] text-[#252B28] focus:bg-white outline-hidden focus:border-[#064E3B]"
            />
          </div>

          <div className="flex items-center space-x-1">
            {['ALL', 'NORMAL', 'CONGESTION', 'ERROR_RECOVERY'].map((sc) => (
              <button
                key={sc}
                onClick={() => setScenarioFilter(sc)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  scenarioFilter === sc
                    ? 'bg-[#064E3B] text-white shadow-xs'
                    : 'bg-[#F5F7F5] text-[#747D77] hover:text-[#064E3B] border border-[#E5E9E5]'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-[#747D77] font-mono">
          <span className="flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-[#064E3B]" />
            <span className="font-semibold text-[#252B28]">{dbStatus.connected ? 'MongoDB Atlas' : 'In-Memory'}</span>
          </span>
          <span>&bull;</span>
          <span>{filteredHistory.length} runs</span>
        </div>
      </div>

      {/* Main Split: Left Archive, Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Historical Runs Table */}
        <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
              Runs Archive
            </h3>
            <span className="text-[11px] font-mono text-[#747D77] font-semibold">{filteredHistory.length}</span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredHistory.length > 0 ? (
              filteredHistory.map((run) => {
                const isSelected = selectedRun?.simulation_id === run.simulation_id;
                const p = run.performance || {};
                return (
                  <div
                    key={run.simulation_id}
                    onClick={() => setSelectedRun(run)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'border-[#064E3B] bg-[#F8E7C9]/30 ring-1 ring-[#064E3B]'
                        : 'border-[#E5E9E5] hover:border-[#B8C7BD] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#064E3B]">{run.simulation_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#F5F7F5] border border-[#E5E9E5] text-[#252B28]">
                        {run.scenario || 'CUSTOM'}
                      </span>
                    </div>

                    <div className="text-xs text-[#252B28] flex justify-between font-mono">
                      <span>{formatNode(run.config?.source)} → {formatNode(run.config?.destination)}</span>
                      <span className="font-bold text-[#064E3B]">
                        {p.packet_delivery_ratio_pct !== undefined ? `${p.packet_delivery_ratio_pct}%` : '—'}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#747D77] flex justify-between pt-1 border-t border-[#E5E9E5]">
                      <span>{p.throughput_kbps || 0} kbps</span>
                      <span>{p.avg_end_to_end_delay_ms || 0} ms</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-[#F5F7F5] rounded-lg border border-[#E5E9E5]">
                <Clock className="w-6 h-6 text-[#747D77] mx-auto mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-[#252B28]">No matching runs</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Detailed Inspection Panel */}
        <div className="lg:col-span-2 space-y-5">
          {selectedRun ? (
            <div className="space-y-5">
              {/* Profile Header Card */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E9E5]">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono font-bold text-sm text-[#064E3B]">
                      {selectedRun.simulation_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border border-[#E5E9E5] bg-[#F5F7F5] text-[#252B28] uppercase">
                      {selectedRun.scenario}
                    </span>
                  </div>

                  {selectedRun.routing?.path && (
                    <div className="px-3 py-1 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] text-xs font-mono font-bold text-[#064E3B]">
                      Path: {selectedRun.routing.path.map((n) => formatNode(n)).join(' → ')}
                    </div>
                  )}
                </div>

                {/* KPI Metrics Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5]">
                    <span className="text-[10px] text-[#747D77] font-semibold uppercase tracking-wider block">Delivery</span>
                    <strong className="text-lg text-[#064E3B] font-mono font-bold">{perf.packet_delivery_ratio_pct ?? '—'}%</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5]">
                    <span className="text-[10px] text-[#747D77] font-semibold uppercase tracking-wider block">Throughput</span>
                    <strong className="text-lg text-[#064E3B] font-mono font-bold">{perf.throughput_kbps ?? 0} kbps</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5]">
                    <span className="text-[10px] text-[#747D77] font-semibold uppercase tracking-wider block">Delay</span>
                    <strong className="text-lg text-[#064E3B] font-mono font-bold">{perf.avg_end_to_end_delay_ms ?? 0} ms</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5]">
                    <span className="text-[10px] text-[#747D77] font-semibold uppercase tracking-wider block">Retries</span>
                    <strong className="text-lg text-[#064E3B] font-mono font-bold">{perf.total_retransmissions ?? 0}</strong>
                  </div>
                </div>

                {/* Payload message */}
                {selectedRun.config?.emergency_message && (
                  <div className="p-3 bg-[#F5F7F5] rounded-lg border border-[#E5E9E5] flex items-start space-x-2.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-[#064E3B] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#252B28]">Message: </span>
                      <span className="font-mono text-[#747D77]">{selectedRun.config.emergency_message}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Packets Log Breakdown */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 shadow-xs">
                <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider mb-3">
                  Packet Logs ({packets.length})
                </h3>
                <div className="overflow-x-auto max-h-[240px] border border-[#E5E9E5] rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F5F7F5] border-b border-[#E5E9E5] text-[#747D77] font-sans font-semibold">
                      <tr>
                        <th className="py-2 px-3">Packet ID</th>
                        <th className="py-2 px-3">Route</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Delay</th>
                        <th className="py-2 px-3">Retries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9E5] text-[11px] bg-white text-[#252B28]">
                      {packets.map((pkt, i) => (
                        <tr key={i} className="hover:bg-[#F5F7F5] transition-colors">
                          <td className="py-1.5 px-3 font-semibold text-[#064E3B]">{pkt.packet_id}</td>
                          <td className="py-1.5 px-3 text-[#747D77]">
                            {formatNode(pkt.source)} → {formatNode(pkt.destination)}
                          </td>
                          <td className="py-1.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D9E5DC] text-[#064E3B]">
                              {pkt.status}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-[#252B28]">
                            {pkt.end_to_end_delay || pkt.delay ? `${pkt.end_to_end_delay || pkt.delay}ms` : '—'}
                          </td>
                          <td className="py-1.5 px-3 text-[#252B28]">{pkt.retransmission_count || pkt.retransmissions || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Event Logs Stream */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 shadow-xs">
                <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider mb-3">
                  Event Stream ({events.length})
                </h3>
                <EventFeed events={events} maxItems={6} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E9E5] p-12 text-center shadow-xs">
              <History className="w-8 h-8 text-[#747D77] mx-auto mb-2 opacity-60" />
              <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">No Run Selected</h3>
              <p className="text-xs text-[#747D77] max-w-xs mx-auto mt-1">
                Select a simulation run from the archive to inspect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
