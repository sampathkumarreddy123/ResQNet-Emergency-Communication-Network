import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';
import { formatNode } from '../utils/nodes';

export default function LinkFailure() {
  const [topology, setTopology] = useState({ nodes: [], links: [] });
  const [selectedLink, setSelectedLink] = useState(null);
  const [inspectSource, setInspectSource] = useState('N0');
  const [inspectDest, setInspectDest] = useState('N5');
  const [failureResult, setFailureResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTopology();
  }, []);

  const loadTopology = async () => {
    try {
      const res = await api.getTopology();
      setTopology(res.data);
      if (res.data.links && res.data.links.length > 0 && !selectedLink) {
        setSelectedLink(res.data.links[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFailLink = async (linkToFail) => {
    const target = linkToFail || selectedLink;
    if (!target) return;
    setLoading(true);
    try {
      const res = await api.failLink({
        source: target.source,
        destination: target.destination,
        check_source: inspectSource,
        check_dest: inspectDest,
      });
      setFailureResult(res.data);
      await loadTopology();
    } catch (err) {
      alert('Fail Link error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreLink = async (linkToRestore) => {
    const target = linkToRestore || selectedLink;
    if (!target) return;
    setLoading(true);
    try {
      const res = await api.restoreLink({
        source: target.source,
        destination: target.destination,
        check_source: inspectSource,
        check_dest: inspectDest,
      });
      setFailureResult(res.data);
      await loadTopology();
    } catch (err) {
      alert('Restore Link error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Link Failure & Fault-Tolerant Routing"
        subtitle="Simulate disaster-induced physical link severance, trigger dynamic Bellman-Ford/Dijkstra route recalculation, and compare alternate paths."
        badge="Resilience Testing"
      />

      {/* Control Configuration Bar */}
      <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <span className="text-[#747D77] uppercase">Route Under Test:</span>
            <select
              value={inspectSource}
              onChange={(e) => setInspectSource(e.target.value)}
              className="border border-[#E5E9E5] rounded-lg px-2.5 py-1 bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
            >
              {topology.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}: {n.label}
                </option>
              ))}
            </select>
            <ArrowRight className="w-4 h-4 text-[#747D77]" />
            <select
              value={inspectDest}
              onChange={(e) => setInspectDest(e.target.value)}
              className="border border-[#E5E9E5] rounded-lg px-2.5 py-1 bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
            >
              {topology.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}: {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-[#747D77]">
          Active: <strong className="text-[#064E3B]">{topology.active_links}</strong> &bull; Severed: <strong className="text-[#252B28]">{topology.failed_links}</strong>
        </div>
      </div>

      {/* Main Grid: Links List and Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Network Links Table */}
        <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#747D77] uppercase tracking-wider mb-2.5">
            Physical Links ({topology.links.length})
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {topology.links.map((link, idx) => {
              const isSelected = selectedLink &&
                ((selectedLink.source === link.source && selectedLink.destination === link.destination) ||
                 (selectedLink.source === link.destination && selectedLink.destination === link.source));
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedLink(link)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'border-[#064E3B] bg-[#F8E7C9]/30 ring-1 ring-[#064E3B]'
                      : 'border-[#E5E9E5] hover:border-[#B8C7BD] bg-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#252B28] text-xs">
                      {formatNode(link.source, topology.nodes)} ↔ {formatNode(link.destination, topology.nodes)}
                    </div>
                    <div className="text-[11px] text-[#747D77]">
                      Cost: {link.cost} &bull; {link.bandwidth} Mbps &bull; {link.propagation_delay} ms
                    </div>
                  </div>

                  <div>
                    {link.active ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFailLink(link);
                        }}
                        disabled={loading}
                        className="px-2.5 py-1 rounded bg-[#064E3B] hover:bg-[#183B32] text-white text-[11px] font-bold flex items-center cursor-pointer shadow-xs"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1 text-[#F8E7C9]" />
                        Sever
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreLink(link);
                        }}
                        disabled={loading}
                        className="px-2.5 py-1 rounded bg-white hover:bg-[#F5F7F5] text-[#252B28] border border-[#E5E9E5] text-[11px] font-bold flex items-center cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 mr-1 text-[#747D77]" />
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Cols: Old Route vs New Route Comparison Box */}
        <div className="lg:col-span-2 space-y-6">
          {failureResult ? (
            <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E5]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] text-[#064E3B]">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
                      {failureResult.action === 'LINK_FAILURE' ? '[LINK FAILURE EVENT]' : '[LINK RESTORATION EVENT]'}
                    </h2>
                    <p className="text-[11px] text-[#747D77]">
                      Target: {formatNode(failureResult.failed_link?.source || failureResult.restored_link?.source, topology.nodes)} ↔ {formatNode(failureResult.failed_link?.destination || failureResult.restored_link?.destination, topology.nodes)}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  failureResult.new_route?.reachable
                    ? 'bg-[#D9E5DC] text-[#064E3B] border border-[#064E3B]/20'
                    : 'bg-[#E5E9E5] text-[#252B28]'
                }`}>
                  {failureResult.new_route?.reachable ? '[ALTERNATIVE ROUTE ACTIVE]' : '[UNREACHABLE]'}
                </span>
              </div>

              {/* Status Message */}
              <div className="p-3 bg-[#F5F7F5] rounded-lg border border-[#E5E9E5] text-xs font-medium text-[#252B28]">
                {failureResult.message}
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Old Route Card */}
                <div className="p-3.5 rounded-lg border border-[#E5E9E5] bg-[#F5F7F5] space-y-2.5">
                  <span className="text-[10px] font-bold text-[#747D77] uppercase tracking-wider block">
                    Pre-Failure Route (Original)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                    {failureResult.old_route?.path?.map((hop, i) => (
                      <React.Fragment key={i}>
                        <span className="px-2 py-0.5 bg-white border border-[#E5E9E5] rounded font-semibold text-[#252B28]">
                          {formatNode(hop, topology.nodes)}
                        </span>
                        {i < failureResult.old_route.path.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-[#747D77]" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-[#747D77] pt-2 border-t border-[#E5E9E5] flex justify-between">
                    <span>Total Metric Cost:</span>
                    <span className="font-mono text-[#064E3B] font-bold">{failureResult.old_route?.total_cost}</span>
                  </div>
                </div>

                {/* New Route Card */}
                <div className="p-3.5 rounded-lg border border-[#064E3B] bg-white space-y-2.5 shadow-xs">
                  <span className="text-[10px] font-bold text-[#064E3B] uppercase tracking-wider block">
                    Post-Recalculation Route (Alternative)
                  </span>
                  {failureResult.new_route?.reachable ? (
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      {failureResult.new_route?.path?.map((hop, i) => (
                        <React.Fragment key={i}>
                          <span className="px-2 py-0.5 bg-[#F8E7C9] border border-[#064E3B]/30 rounded font-bold text-[#064E3B]">
                            {formatNode(hop, topology.nodes)}
                          </span>
                          {i < failureResult.new_route.path.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-[#064E3B]" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#747D77]">
                      NO ALTERNATIVE ROUTE AVAILABLE (Network Partitioned)
                    </div>
                  )}
                  <div className="text-xs font-semibold text-[#747D77] pt-2 border-t border-[#E5E9E5] flex justify-between">
                    <span>New Metric Cost:</span>
                    <span className="font-mono font-bold text-[#064E3B]">
                      {failureResult.new_route?.reachable ? failureResult.new_route.total_cost : '∞'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distance Vector Notice */}
              <div className="p-2.5 bg-[#F5F7F5] border border-[#E5E9E5] rounded-lg text-xs text-[#252B28] flex items-center justify-between">
                <span>Distance Vector protocol re-converged after topology update.</span>
                <span className="font-mono font-bold text-[#064E3B]">[STABILIZED]</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E9E5] p-10 text-center shadow-xs">
              <AlertTriangle className="w-8 h-8 text-[#747D77] mx-auto mb-2 opacity-60" />
              <h3 className="text-xs font-bold text-[#252B28] uppercase">No Active Failure Test</h3>
              <p className="text-xs text-[#747D77] max-w-sm mx-auto mt-1">
                Select any communication link on the left and click <strong>"Sever"</strong> to observe dynamic path recalculation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
