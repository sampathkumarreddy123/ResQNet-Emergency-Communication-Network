import React, { useState, useEffect } from 'react';
import {
  GitFork,
  ArrowRight,
  RefreshCw,
  Cpu,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';
import { getNodeName, formatNode } from '../utils/nodes';

export default function Routing() {
  const [activeTab, setActiveTab] = useState('dijkstra');
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dijkstra
  const [dijkSrc, setDijkSrc] = useState('N0');
  const [dijkDst, setDijkDst] = useState('N5');
  const [dijkResult, setDijkResult] = useState(null);

  // Distance Vector
  const [selectedDVNode, setSelectedDVNode] = useState('N0');
  const [dvResult, setDvResult] = useState(null);
  const [useSplitHorizon, setUseSplitHorizon] = useState(true);

  // Link Failure
  const [failureResult, setFailureResult] = useState(null);

  useEffect(() => {
    loadTopologyAndRun();
    const handleGlobalReset = () => {
      loadTopologyAndRun();
    };
    window.addEventListener('topology-reset', handleGlobalReset);
    return () => window.removeEventListener('topology-reset', handleGlobalReset);
  }, []);

  // When nodes update, ensure selectedDVNode is valid
  useEffect(() => {
    if (nodes.length > 0 && !nodes.some((n) => n.id === selectedDVNode)) {
      setSelectedDVNode(nodes[0].id);
    }
    if (nodes.length > 0 && !nodes.some((n) => n.id === dijkSrc)) {
      setDijkSrc(nodes[0].id);
    }
    if (nodes.length > 0 && !nodes.some((n) => n.id === dijkDst)) {
      setDijkDst(nodes[nodes.length - 1].id);
    }
  }, [nodes]);

  // When switching to Distance Vector tab, ensure it is calculated
  useEffect(() => {
    if (activeTab === 'distance_vector' && !dvResult) {
      runDistanceVector();
    }
  }, [activeTab]);

  // Re-run Distance Vector if split horizon setting is toggled
  useEffect(() => {
    if (activeTab === 'distance_vector') {
      runDistanceVector();
    }
  }, [useSplitHorizon]);

  const loadTopologyAndRun = async () => {
    try {
      const topoRes = await api.getTopology();
      const loadedNodes = topoRes.data.nodes || [];
      const loadedLinks = topoRes.data.links || [];
      setNodes(loadedNodes);
      setLinks(loadedLinks);

      const src = loadedNodes.some((n) => n.id === dijkSrc) ? dijkSrc : (loadedNodes[0]?.id || 'N0');
      const dst = loadedNodes.some((n) => n.id === dijkDst) ? dijkDst : (loadedNodes[loadedNodes.length - 1]?.id || 'N5');

      await runDijkstraFor(src, dst);
      await runDistanceVector();
    } catch (err) {
      console.error(err);
    }
  };

  const runDijkstraFor = async (src, dst) => {
    setLoading(true);
    try {
      const res = await api.calculateDijkstra({ source: src, destination: dst });
      setDijkResult(res.data);
    } catch (err) {
      console.error('Dijkstra error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runDijkstra = async () => {
    runDijkstraFor(dijkSrc, dijkDst);
  };

  const runDistanceVector = async () => {
    setLoading(true);
    try {
      const res = await api.calculateDistanceVector({
        max_iterations: 20,
        use_split_horizon: useSplitHorizon,
      });
      setDvResult(res.data);
    } catch (err) {
      console.error('Distance Vector error:', err);
      alert('Distance Vector error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const formatUpdateText = (text) => {
    if (!text) return '';
    let formatted = text;
    nodes.forEach((n) => {
      const regex = new RegExp(`\\b${n.id}\\b`, 'g');
      formatted = formatted.replace(regex, `${n.id} (${n.label})`);
    });
    return formatted;
  };

  const handleFailLink = async (targetLink) => {
    setLoading(true);
    try {
      const res = await api.failLink({
        source: targetLink.source,
        destination: targetLink.destination,
        check_source: dijkSrc,
        check_dest: dijkDst,
      });
      setFailureResult(res.data);
      await loadTopologyAndRun();
    } catch (err) {
      alert('Fail Link error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreLink = async (targetLink) => {
    setLoading(true);
    try {
      const res = await api.restoreLink({
        source: targetLink.source,
        destination: targetLink.destination,
        check_source: dijkSrc,
        check_dest: dijkDst,
      });
      setFailureResult(res.data);
      await loadTopologyAndRun();
    } catch (err) {
      alert('Restore Link error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Routing Protocols"
        subtitle="Compare Dijkstra Shortest Path and Bellman-Ford Distance Vector tables with link-failure recalculation."
        actions={
          <div className="flex flex-wrap bg-white p-1 rounded-lg text-xs font-semibold border border-[#E5E9E5] gap-1">
            <button
              onClick={() => setActiveTab('dijkstra')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'dijkstra' ? 'bg-[#064E3B] text-[#F8E7C9] font-bold shadow-xs' : 'text-[#747D77] hover:text-[#064E3B]'
              }`}
            >
              Dijkstra
            </button>
            <button
              onClick={() => setActiveTab('distance_vector')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'distance_vector' ? 'bg-[#064E3B] text-[#F8E7C9] font-bold shadow-xs' : 'text-[#747D77] hover:text-[#064E3B]'
              }`}
            >
              Distance Vector
            </button>
            <button
              onClick={() => setActiveTab('link_failure')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'link_failure' ? 'bg-[#064E3B] text-[#F8E7C9] font-bold shadow-xs' : 'text-[#747D77] hover:text-[#064E3B]'
              }`}
            >
              Link Failure & Reroute
            </button>
          </div>
        }
      />

      {/* DIJKSTRA TAB */}
      {activeTab === 'dijkstra' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-[#747D77]">Source:</span>
                <select
                  value={dijkSrc}
                  onChange={(e) => setDijkSrc(e.target.value)}
                  className="border border-[#E5E9E5] rounded p-1 bg-[#F5F7F5] text-[#252B28] font-mono text-xs"
                >
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{n.id}: {n.label}</option>))}
                </select>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#747D77]" />
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-[#747D77]">Destination:</span>
                <select
                  value={dijkDst}
                  onChange={(e) => setDijkDst(e.target.value)}
                  className="border border-[#E5E9E5] rounded p-1 bg-[#F5F7F5] text-[#252B28] font-mono text-xs"
                >
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{n.id}: {n.label}</option>))}
                </select>
              </div>
            </div>

            <button
              onClick={runDijkstra}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-semibold text-xs flex items-center shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-[#F8E7C9] ${loading ? 'animate-spin' : ''}`} />
              Compute Shortest Path
            </button>
          </div>

          {dijkResult && (
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E5E9E5]">
                <span className="font-bold uppercase tracking-wider text-[#252B28]">
                  {dijkResult.reachable ? 'Optimal Path' : 'Unreachable'}
                </span>
                {dijkResult.reachable && (
                  <span className="font-mono font-bold bg-[#F8E7C9] text-[#064E3B] px-2.5 py-1 rounded border border-[#064E3B]/20">
                    Total Cost: {dijkResult.total_cost}
                  </span>
                )}
              </div>

              {dijkResult.reachable ? (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F5F7F5] rounded border border-[#E5E9E5] text-xs">
                  {dijkResult.path.map((nodeId, idx) => (
                    <React.Fragment key={nodeId}>
                      <span className="px-2.5 py-1 bg-white border border-[#064E3B]/30 text-[#064E3B] rounded font-semibold shadow-2xs">
                        {formatNode(nodeId, nodes)}
                      </span>
                      {idx < dijkResult.path.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[#064E3B]" />}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-[#F5F7F5] rounded border border-[#E5E9E5] text-[#747D77]">
                  No route connects {formatNode(dijkSrc, nodes)} to {formatNode(dijkDst, nodes)}.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DISTANCE VECTOR TAB */}
      {activeTab === 'distance_vector' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-[#747D77]">Router:</span>
                <select
                  value={selectedDVNode}
                  onChange={(e) => setSelectedDVNode(e.target.value)}
                  className="border border-[#E5E9E5] rounded p-1 bg-[#F5F7F5] text-[#252B28] font-mono text-xs"
                >
                  {nodes.map((n) => (<option key={n.id} value={n.id}>{n.id}: {n.label}</option>))}
                </select>
              </div>

              <label className="flex items-center space-x-1.5 text-xs text-[#252B28] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSplitHorizon}
                  onChange={(e) => setUseSplitHorizon(e.target.checked)}
                  className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span>Split Horizon</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#064E3B] font-bold bg-[#F8E7C9] px-2.5 py-1 rounded border border-[#064E3B]/20 text-[11px] sm:text-xs">
                {dvResult ? `Converged in ${dvResult.iterations_count} rounds` : 'Calculating...'}
              </span>
              <button
                onClick={runDistanceVector}
                disabled={loading}
                className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-semibold text-xs flex items-center shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-[#F8E7C9] ${loading ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            </div>
          </div>

          {/* Routing Table for Selected Router */}
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-[#E5E9E5]">
              <span className="font-bold uppercase tracking-wider text-[#252B28]">
                {formatNode(selectedDVNode, nodes)} Routing Table
              </span>
              <span className="text-[11px] text-[#747D77] font-mono">
                {Object.keys(dvResult?.routing_tables?.[selectedDVNode] || {}).length} Destinations
              </span>
            </div>

            {dvResult?.routing_tables?.[selectedDVNode] ? (
              <div className="overflow-x-auto border border-[#E5E9E5] rounded-lg">
                <table className="w-full text-left font-mono">
                  <thead className="bg-[#F5F7F5] border-b border-[#E5E9E5] text-[#747D77]">
                    <tr>
                      <th className="py-2 px-3">Destination</th>
                      <th className="py-2 px-3">Next Hop</th>
                      <th className="py-2 px-3">Cost</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9E5]">
                    {Object.entries(dvResult.routing_tables[selectedDVNode]).map(([dest, info]) => (
                      <tr key={dest} className="hover:bg-[#F5F7F5]">
                        <td className="py-1.5 px-3 font-semibold text-[#064E3B]">{formatNode(dest, nodes)}</td>
                        <td className="py-1.5 px-3 text-[#252B28]">{info?.next_hop ? formatNode(info.next_hop, nodes) : '—'}</td>
                        <td className="py-1.5 px-3 font-bold text-[#252B28]">{info?.cost ?? '∞'}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            info?.reachable ? 'bg-[#D9E5DC] text-[#064E3B]' : 'bg-[#E5E9E5] text-[#747D77]'
                          }`}>
                            {info?.reachable ? 'REACHABLE' : 'UNREACHABLE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-[#747D77]">
                {loading ? 'Computing Distance Vector routing tables...' : 'No routing table available for this node.'}
              </div>
            )}
          </div>

          {/* Step-by-Step Convergence Rounds */}
          {dvResult?.iterations && dvResult.iterations.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E5E9E5]">
                <span className="font-bold uppercase tracking-wider text-[#252B28]">
                  Step-by-Step Distance Vector Convergence
                </span>
                <span className="text-[#747D77] text-[11px] font-mono">
                  {dvResult.iterations.length} Rounds Recorded
                </span>
              </div>

              <div className="space-y-3">
                {dvResult.iterations.map((step) => (
                  <div key={step.iteration} className="p-3 bg-[#F5F7F5] rounded-lg border border-[#E5E9E5] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#252B28] flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#F8E7C9] text-[#064E3B] border border-[#064E3B]/20 font-mono text-[11px] font-bold">
                          Round {step.iteration}
                        </span>
                        <span>{step.description}</span>
                      </span>
                      <span className="text-[11px] text-[#747D77]">
                        {step.updates.length === 0 ? (step.iteration === 0 ? 'Direct Links' : 'Converged') : `${step.updates.length} route updates`}
                      </span>
                    </div>

                    {step.updates.length > 0 ? (
                      <ul className="space-y-1 pl-2">
                        {step.updates.map((update, uIdx) => (
                          <li key={uIdx} className="text-[#252B28] font-mono text-[11px] flex items-start gap-1.5">
                            <span className="text-[#747D77]">•</span>
                            <span>{formatUpdateText(update)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-[#747D77] pl-2">
                        {step.iteration === 0
                          ? 'Each station initialized local distances to directly connected adjacent stations.'
                          : 'No shorter paths discovered across any neighbors. Convergence reached.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LINK FAILURE TAB */}
      {activeTab === 'link_failure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs space-y-2">
            <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
              Mesh Links ({links.length})
            </span>
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-[#F5F7F5] border border-[#E5E9E5] flex justify-between items-center"
                >
                  <div>
                    <span className="font-semibold text-xs text-[#252B28]">{formatNode(link.source, nodes)} ↔ {formatNode(link.destination, nodes)}</span>
                    <span className="text-[10px] text-[#747D77] ml-2 font-mono">(Cost: {link.cost})</span>
                  </div>
                  <div>
                    {link.active ? (
                      <button
                        onClick={() => handleFailLink(link)}
                        disabled={loading}
                        className="px-2 py-0.5 rounded bg-white border border-[#E5E9E5] hover:bg-[#F5F7F5] hover:border-[#B8C7BD] text-[10px] font-semibold text-[#252B28]"
                      >
                        Sever
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestoreLink(link)}
                        disabled={loading}
                        className="px-2 py-0.5 rounded bg-[#064E3B] hover:bg-[#183B32] text-white text-[10px] font-semibold"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {failureResult ? (
              <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 space-y-3 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
                  Reroute Outcome
                </span>
                <p className="text-xs text-[#747D77]">{failureResult.message}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[#F5F7F5] rounded border border-[#E5E9E5] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#747D77] block">Previous Route</span>
                    <div className="font-semibold text-xs text-[#252B28]">
                      {failureResult.old_route?.path?.map((hop) => formatNode(hop, nodes)).join(' → ') || 'Direct'}
                    </div>
                    <div className="text-[11px] text-[#747D77]">Cost: {failureResult.old_route?.total_cost}</div>
                  </div>

                  <div className="p-3 bg-white rounded border border-[#E5E9E5] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#252B28] block">Recalculated Route</span>
                    <div className="font-bold text-xs text-[#064E3B]">
                      {failureResult.new_route?.reachable
                        ? failureResult.new_route.path?.map((hop) => formatNode(hop, nodes)).join(' → ')
                        : 'Unreachable (Partitioned)'}
                    </div>
                    <div className="text-[11px] text-[#747D77]">
                      Cost: {failureResult.new_route?.reachable ? failureResult.new_route.total_cost : '∞'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E5E9E5] p-10 text-center text-xs text-[#747D77]">
                Click "Sever" on any link on the left to test dynamic route recalculation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
