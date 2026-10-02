import React, { useState, useEffect } from 'react';
import { Download, Activity, TrendingUp, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import api from '../services/api';

export default function Analytics() {
  const [history, setHistory] = useState([]);
  const [selectedSim, setSelectedSim] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadSimulationDetails = async (sim) => {
    if (!sim) return;
    if (sim.time_series && sim.time_series.length > 0) {
      setSelectedSim(sim);
      return;
    }
    setLoadingSim(true);
    try {
      const res = await api.getSimulation(sim.simulation_id);
      if (res.data) {
        setSelectedSim({ ...sim, ...res.data });
      } else {
        setSelectedSim(sim);
      }
    } catch (err) {
      setSelectedSim(sim);
    } finally {
      setLoadingSim(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const [histRes, sumRes] = await Promise.all([
        api.getSimulationHistory(20),
        api.getAnalyticsSummary(),
      ]);
      const runs = histRes.data || [];
      setHistory(runs);
      setSummary(sumRes.data || null);
      if (runs.length > 0) {
        loadSimulationDetails(runs[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    window.open(api.getExportUrl(), '_blank');
  };

  const perf = selectedSim?.performance || {};
  const timeSeries = selectedSim?.time_series || [];

  const pieData = [
    { name: 'Delivered', value: perf.received_original_packets || 0, color: '#064E3B' },
    { name: 'Lost in Transit', value: perf.lost_original_packets || 0, color: '#183B32' },
    { name: 'Buffer Dropped', value: perf.dropped_packets || 0, color: '#B8C7BD' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Performance Analytics"
        subtitle="Empirical performance metrics and charts derived from discrete-event simulations."
        actions={
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F7F5] border border-[#E5E9E5] hover:border-[#B8C7BD] text-[#252B28] text-xs font-semibold flex items-center transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#064E3B]" /> Export CSV
          </button>
        }
      />

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Runs" value={summary?.total_simulations || history.length} icon={Activity} />
        <MetricCard title="Avg Delivery Ratio" value={`${summary?.average_pdr || 0}%`} icon={TrendingUp} />
        <MetricCard title="Avg Throughput" value={summary?.average_throughput_kbps || 0} unit="kbps" icon={TrendingUp} />
        <MetricCard title="Avg Latency" value={summary?.average_delay_ms || 0} unit="ms" icon={Clock} />
      </div>

      {selectedSim ? (
        <div className="space-y-4">
          {/* Selector Bar */}
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-semibold text-[#747D77] shrink-0">Run:</span>
              <select
                value={selectedSim.simulation_id}
                onChange={(e) => {
                  const s = history.find((x) => x.simulation_id === e.target.value);
                  if (s) loadSimulationDetails(s);
                }}
                className="border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] font-mono text-xs w-full sm:max-w-xs focus:border-[#064E3B] focus:outline-hidden truncate"
              >
                {history.map((sim) => (
                  <option key={sim.simulation_id} value={sim.simulation_id}>
                    {sim.simulation_id} ({sim.scenario})
                  </option>
                ))}
              </select>
            </div>

            <div className="font-mono text-[11px] sm:text-xs text-[#747D77] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Packets: <strong className="text-[#064E3B]">{perf.sent_original_packets || 0}</strong></span>
              <span>&bull; Retries: <strong className="text-[#064E3B]">{perf.total_retransmissions || 0}</strong></span>
              <span>&bull; PDR: <strong className="text-[#064E3B]">{perf.packet_delivery_ratio_pct}%</strong></span>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Throughput */}
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#252B28] block mb-3">
                Throughput Over Time (kbps)
              </span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9E5" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#747D77' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#747D77' }} unit="k" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9E5', borderRadius: '6px', color: '#252B28' }} />
                    <Area type="monotone" dataKey="throughput_kbps" stroke="#064E3B" fill="#D9E5DC" name="Throughput" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Packet Loss */}
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#252B28] block mb-3">
                Packet Loss & Drops Over Time
              </span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9E5" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#747D77' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#747D77' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9E5', borderRadius: '6px', color: '#252B28' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#252B28' }} />
                    <Bar dataKey="packets_sent" name="Sent" fill="#064E3B" />
                    <Bar dataKey="packets_lost" name="Lost / Dropped" fill="#183B32" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Latency */}
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#252B28] block mb-3">
                End-to-End Latency (ms)
              </span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9E5" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#747D77' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#747D77' }} unit="ms" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9E5', borderRadius: '6px', color: '#252B28' }} />
                    <Line type="monotone" dataKey="avg_delay_ms" stroke="#183B32" strokeWidth={2} name="Avg Delay (ms)" dot={{ r: 3, fill: '#064E3B' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Delivery Ratio */}
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#252B28] block mb-3">
                Delivery Ratio (%)
              </span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9E5" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#747D77' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#747D77' }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9E5', borderRadius: '6px', color: '#252B28' }} />
                    <Line type="monotone" dataKey="pdr_pct" stroke="#064E3B" strokeWidth={2.5} name="PDR %" dot={{ r: 3, fill: '#183B32' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Delivery Outcome Breakdown */}
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#252B28] block mb-3">
                Delivery Outcome Breakdown
              </span>
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9E5', borderRadius: '6px', color: '#252B28' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: ARQ Retransmissions */}
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#252B28] block mb-3">
                ARQ Retransmissions
              </span>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9E5" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#747D77' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#747D77' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E9E5', borderRadius: '6px', color: '#252B28' }} />
                    <Bar dataKey="retransmissions" fill="#183B32" name="Retransmissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E9E5] p-12 text-center text-xs text-[#747D77]">
          No simulation runs available to chart.
        </div>
      )}
    </div>
  );
}
