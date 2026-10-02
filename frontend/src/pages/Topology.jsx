import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Radio,
  Shield,
  Flame,
  Truck,
  Users,
  Home,
  Navigation,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Save,
  Link2,
  PlusCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';
import { formatNode, getNodeName } from '../utils/nodes';

const NODE_CONFIG = {
  control_center: { icon: Radio, label: 'Control Center', placeholder: 'e.g. Regional Command HQ' },
  police: { icon: Shield, label: 'Police Station', placeholder: 'e.g. District Patrol Post' },
  fire_service: { icon: Flame, label: 'Fire Service', placeholder: 'e.g. Fire Station 4' },
  ambulance: { icon: Truck, label: 'Ambulance Unit', placeholder: 'e.g. Trauma Response Unit' },
  field_team: { icon: Users, label: 'Field Response', placeholder: 'e.g. Search & Rescue Alpha' },
  shelter: { icon: Home, label: 'Emergency Shelter', placeholder: 'e.g. Community Evacuation Center' },
  custom: { icon: Radio, label: 'Custom Node', placeholder: 'e.g. Relay Station' },
};

function CustomNetworkNode({ data }) {
  const cfg = NODE_CONFIG[data.type] || NODE_CONFIG.custom;
  const Icon = cfg.icon;
  const isSrc = data.isSource;
  const isDst = data.isDestination;
  const inPath = data.isInPath;
  const isSelected = data.isSelected;

  return (
    <div
      className={`px-3 py-2 rounded-lg text-center min-w-[124px] border-2 transition-all shadow-xs ${
        isSelected
          ? 'bg-[#F8E7C9] border-[#064E3B] ring-2 ring-[#064E3B]/20'
          : inPath
          ? 'bg-[#F8E7C9]/40 border-[#064E3B]'
          : isSrc || isDst
          ? 'bg-white border-[#064E3B] ring-2 ring-[#064E3B]/20'
          : 'bg-white border-[#064E3B] hover:bg-[#F5F7F5]'
      }`}
    >
      <div className="flex items-center justify-center space-x-1.5 mb-1">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-[#F5F7F5] border border-[#E5E9E5] text-[#064E3B]">
          <Icon className="w-3 h-3" />
        </div>
        <span className="font-bold text-xs font-mono text-[#064E3B]">{data.id}</span>
      </div>
      <div className="text-[11px] font-semibold text-[#252B28]">{data.label}</div>

      {(isSrc || isDst || inPath || isSelected) && (
        <span
          className={`mt-1 inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
            isSrc
              ? 'bg-[#064E3B] text-white border-[#064E3B]'
              : isDst
              ? 'bg-[#183B32] text-white border-[#183B32]'
              : isSelected
              ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]'
              : 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]/30'
          }`}
        >
          {isSrc ? 'SRC' : isDst ? 'DST' : isSelected ? 'SELECTED' : 'HOP'}
        </span>
      )}

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
    </div>
  );
}

export default function Topology() {
  const nodeTypes = useMemo(() => ({ customNode: CustomNetworkNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawTopology, setRawTopology] = useState({ nodes: [], links: [] });

  const [sourceNode, setSourceNode] = useState('N0');
  const [destNode, setDestNode] = useState('N5');
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [routeCost, setRouteCost] = useState(null);

  const [selectedElement, setSelectedElement] = useState(null);
  const [editCost, setEditCost] = useState('3.0');
  const [isSavingLink, setIsSavingLink] = useState(false);

  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState('ambulance');
  const [newLinkSrc, setNewLinkSrc] = useState('N0');
  const [newLinkDst, setNewLinkDst] = useState('N3');
  const [newLinkCost, setNewLinkCost] = useState('3.0');
  const [isRemovingNode, setIsRemovingNode] = useState(false);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState(null);
  const [nodeFeedback, setNodeFeedback] = useState(null);

  // Compute the next suggested station ID (e.g. N7) based on existing nodes
  const suggestedNextId = useMemo(() => {
    if (!rawTopology.nodes || rawTopology.nodes.length === 0) return 'N0';
    const numbers = rawTopology.nodes
      .map((n) => {
        const match = String(n.id).match(/^N(\d+)$/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((num) => num !== null);
    if (numbers.length === 0) return `N${rawTopology.nodes.length}`;
    const maxNum = Math.max(...numbers);
    return `N${maxNum + 1}`;
  }, [rawTopology.nodes]);

  // Keep link source and destination synchronized with existing nodes
  useEffect(() => {
    if (rawTopology.nodes && rawTopology.nodes.length > 0) {
      const nodeIds = rawTopology.nodes.map((n) => n.id);
      if (!nodeIds.includes(newLinkSrc)) {
        setNewLinkSrc(nodeIds[0]);
      }
      if (!nodeIds.includes(newLinkDst)) {
        const alternate = nodeIds.find((id) => id !== nodeIds[0]) || nodeIds[0];
        setNewLinkDst(alternate);
      }
    }
  }, [rawTopology.nodes, newLinkSrc, newLinkDst]);

  // Check if link already exists or if it is a self-loop
  const existingLink = useMemo(() => {
    if (!rawTopology.links || !newLinkSrc || !newLinkDst) return null;
    return rawTopology.links.find(
      (l) =>
        (l.source === newLinkSrc && l.destination === newLinkDst) ||
        (l.source === newLinkDst && l.destination === newLinkSrc)
    );
  }, [rawTopology.links, newLinkSrc, newLinkDst]);

  const isSelfLoop = Boolean(newLinkSrc && newLinkDst && newLinkSrc === newLinkDst);

  const loadTopology = useCallback(async (currentPath = [], curSelected = selectedElement) => {
    try {
      const res = await api.getTopology();
      const topo = res.data;
      setRawTopology(topo);

      const flowNodes = topo.nodes.map((node) => ({
        id: node.id,
        type: 'customNode',
        position: { x: node.x, y: node.y },
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          isSource: node.id === sourceNode,
          isDestination: node.id === destNode,
          isInPath: currentPath.includes(node.id),
          isSelected: curSelected?.type === 'node' && curSelected.data?.id === node.id,
        },
      }));

      const flowEdges = topo.links.map((link) => {
        const edgeId = `${link.source}-${link.destination}`;
        const isFailed = !link.active;
        const inPath =
          currentPath.length > 1 &&
          currentPath.some((node, i) => {
            if (i === currentPath.length - 1) return false;
            const next = currentPath[i + 1];
            return (
              (node === link.source && next === link.destination) ||
              (node === link.destination && next === link.source)
            );
          });

        let strokeColor = '#064E3B'; // Active communication links: #064E3B
        let strokeWidth = 2;
        let animated = false;

        if (isFailed) {
          // Failed links: gray dashed lines with visible FAILED label
          strokeColor = '#747D77';
          strokeWidth = 2;
        } else if (inPath) {
          // Selected route: thicker forest-green line
          strokeColor = '#064E3B';
          strokeWidth = 4;
          animated = true;
        } else if (!link.active) {
          // Inactive links: #B8C7BD
          strokeColor = '#B8C7BD';
          strokeWidth = 1.5;
        }

        return {
          id: edgeId,
          source: link.source,
          target: link.destination,
          animated: animated,
          style: {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            strokeDasharray: isFailed ? '5,5' : undefined,
          },
          label: isFailed ? `FAILED (${link.cost})` : `${link.cost}`,
          labelStyle: {
            fill: isFailed ? '#747D77' : inPath ? '#064E3B' : '#252B28',
            fontWeight: 700,
            fontSize: 10,
            fontFamily: 'monospace',
          },
          labelBgStyle: {
            fill: inPath ? '#F8E7C9' : isFailed ? '#F5F7F5' : '#FFFFFF',
            stroke: inPath ? '#064E3B' : isFailed ? '#B8C7BD' : '#E5E9E5',
            strokeWidth: 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
          data: link,
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error(err);
    }
  }, [sourceNode, destNode, selectedElement, setNodes, setEdges]);

  useEffect(() => {
    loadTopology(highlightedPath);
  }, [loadTopology, highlightedPath]);

  useEffect(() => {
    const handleGlobalReset = () => {
      setSelectedElement(null);
      setConfirmDeleteNodeId(null);
      setHighlightedPath([]);
      setRouteCost(null);
      setSourceNode('N0');
      setDestNode('N5');
      loadTopology([]);
    };
    window.addEventListener('topology-reset', handleGlobalReset);
    return () => window.removeEventListener('topology-reset', handleGlobalReset);
  }, [loadTopology]);

  const handleCalculateRoute = async () => {
    try {
      const res = await api.calculateDijkstra({ source: sourceNode, destination: destNode });
      if (res.data.reachable) {
        setHighlightedPath(res.data.path);
        setRouteCost(res.data.total_cost);
      } else {
        setHighlightedPath([]);
        setRouteCost(null);
        alert(`No path between ${sourceNode} and ${destNode}.`);
      }
    } catch (err) {
      alert('Error calculating route: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleLinkStatus = async (link) => {
    try {
      if (link.active) {
        await api.failLink({ source: link.source, destination: link.destination });
      } else {
        await api.restoreLink({ source: link.source, destination: link.destination });
      }
      await loadTopology(highlightedPath);
      if (highlightedPath.length > 0) {
        handleCalculateRoute();
      }
    } catch (err) {
      alert('Error updating link: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateLinkParams = async (e) => {
    e.preventDefault();
    if (!selectedElement || selectedElement.type !== 'edge') return;
    const link = selectedElement.data;
    try {
      setIsSavingLink(true);
      await api.updateLink({
        source: link.source,
        destination: link.destination,
        cost: parseFloat(editCost),
      });
      await loadTopology(highlightedPath);
    } catch (err) {
      alert('Error saving link: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    const cleanId = (newNodeId.trim() || suggestedNextId).toUpperCase();
    if (!cleanId) return;
    setNodeFeedback(null);
    try {
      const defaultRoleName = NODE_CONFIG[newNodeType]?.label || 'Station';
      await api.addNode({
        id: cleanId,
        label: newNodeLabel.trim() || `${defaultRoleName} (${cleanId})`,
        type: newNodeType,
        x: Math.floor(Math.random() * 350) + 150,
        y: Math.floor(Math.random() * 200) + 100,
      });
      setNewNodeId('');
      setNewNodeLabel('');
      setNodeFeedback({ type: 'success', message: `Station '${cleanId}' deployed successfully.` });
      await loadTopology(highlightedPath);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to deploy station.';
      setNodeFeedback({ type: 'error', message: errorMsg });
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    setLinkFeedback(null);

    if (isSelfLoop) {
      setLinkFeedback({
        type: 'error',
        message: 'Self-loops are not allowed. Source and destination must be different nodes.',
      });
      return;
    }

    const costNum = parseFloat(newLinkCost);
    if (isNaN(costNum) || costNum <= 0) {
      setLinkFeedback({
        type: 'error',
        message: 'Please enter a valid link cost greater than 0.',
      });
      return;
    }

    try {
      setIsCreatingLink(true);
      if (existingLink) {
        // Link exists: update configuration seamlessly
        await api.updateLink({
          source: newLinkSrc,
          destination: newLinkDst,
          cost: costNum,
          bandwidth: 100.0,
          propagation_delay: 10.0,
          loss_prob: 0.02,
        });
        setLinkFeedback({
          type: 'success',
          message: `Link (${newLinkSrc} ↔ ${newLinkDst}) cost updated to ${costNum}.`,
        });
      } else {
        // Create new link
        await api.addLink({
          source: newLinkSrc,
          destination: newLinkDst,
          cost: costNum,
          bandwidth: 100.0,
          propagation_delay: 10.0,
          loss_prob: 0.02,
          upsert: true,
        });
        setLinkFeedback({
          type: 'success',
          message: `Link (${newLinkSrc} ↔ ${newLinkDst}) created successfully.`,
        });
      }
      await loadTopology(highlightedPath);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create link.';
      setLinkFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleRemoveNode = async (nodeId) => {
    const targetId = nodeId || selectedElement?.data?.id || selectedElement?.id;
    if (!targetId) return;
    setIsRemovingNode(true);
    try {
      const res = await api.removeNode(targetId);
      setSelectedElement(null);
      setConfirmDeleteNodeId(null);
      const newTopology = res.data?.topology;
      if (newTopology) {
        setRawTopology(newTopology);
        const remaining = newTopology.nodes || [];
        if (sourceNode === targetId && remaining.length > 0) {
          setSourceNode(remaining[0].id);
        }
        if (destNode === targetId && remaining.length > 1) {
          setDestNode(remaining[1].id);
        } else if (destNode === targetId && remaining.length > 0) {
          setDestNode(remaining[0].id);
        }
      }
      setHighlightedPath([]);
      setRouteCost(null);
      await loadTopology([]);
    } catch (err) {
      alert('Error removing node: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsRemovingNode(false);
    }
  };

  const handleResetTopology = async () => {
    try {
      setIsResetting(true);
      await api.resetTopology();
      setSelectedElement(null);
      setConfirmDeleteNodeId(null);
      setHighlightedPath([]);
      setRouteCost(null);
      setSourceNode('N0');
      setDestNode('N5');
      await loadTopology([]);
      window.dispatchEvent(new CustomEvent('topology-reset'));
    } catch (err) {
      alert('Error resetting topology: ' + (err.response?.data?.error || err.message));
    } finally {
      setTimeout(() => {
        setIsResetting(false);
      }, 400);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Network Topology"
        subtitle="Ad-hoc mesh graph visualizer with Dijkstra path tracing and link failure injection."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetTopology}
              disabled={isResetting}
              className="px-3 py-1.5 rounded-lg border border-[#E5E9E5] text-xs font-semibold bg-white hover:bg-[#F5F7F5] hover:border-[#B8C7BD] text-[#252B28] flex items-center transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1 text-[#064E3B] ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting...' : 'Reset Topology'}
            </button>
            <button
              onClick={() => {
                setHighlightedPath([]);
                setRouteCost(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E5E9E5] text-xs font-semibold bg-white hover:bg-[#F5F7F5] hover:border-[#B8C7BD] text-[#747D77] transition-colors"
            >
              Clear Route
            </button>
            <button
              onClick={handleCalculateRoute}
              className="px-3 py-1.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] border border-[#064E3B] text-white text-xs font-semibold flex items-center shadow-xs transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5 text-[#F8E7C9]" />
              Calculate Route
            </button>
          </div>
        }
      />

      {/* Top Selector Bar */}
      <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-[#747D77]">Source:</span>
            <select
              value={sourceNode}
              onChange={(e) => setSourceNode(e.target.value)}
              className="border border-[#E5E9E5] rounded p-1 bg-[#F5F7F5] text-[#252B28] font-mono font-semibold text-xs"
            >
              {rawTopology.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}: {n.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-[#747D77]">Destination:</span>
            <select
              value={destNode}
              onChange={(e) => setDestNode(e.target.value)}
              className="border border-[#E5E9E5] rounded p-1 bg-[#F5F7F5] text-[#252B28] font-mono font-semibold text-xs"
            >
              {rawTopology.nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id}: {n.label}</option>
              ))}
            </select>
          </div>
        </div>

        {highlightedPath.length > 0 && (
          <div className="text-[11px] sm:text-xs font-semibold text-[#252B28] bg-[#F8E7C9] px-2.5 py-1 rounded border border-[#064E3B]/20 break-words">
            Path: {highlightedPath.map((n) => formatNode(n, rawTopology.nodes)).join(' → ')} <strong className="text-[#064E3B]">(Cost: {routeCost})</strong>
          </div>
        )}
      </div>

      {/* Main Graph & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-[#E5E9E5] overflow-hidden h-[380px] sm:h-[460px] lg:h-[560px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onEdgeClick={(_, edge) => {
              setSelectedElement({ type: 'edge', data: edge.data });
              setEditCost(String(edge.data.cost ?? '3.0'));
            }}
            onNodeClick={(_, node) => setSelectedElement({ type: 'node', data: node.data })}
            fitView
          >
            <Controls className="bg-white border border-[#E5E9E5] shadow-none" />
            <MiniMap className="bg-white border border-[#E5E9E5]" />
            <Background color="#E5E9E5" gap={20} size={1} />
          </ReactFlow>
        </div>

        {/* Sidebar Controls (1 Col) */}
        <div className="space-y-3 text-xs">
          {/* Inspector */}
          {selectedElement ? (
            <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#E5E9E5]">
                <span className="font-bold uppercase tracking-wider text-[#252B28]">
                  {selectedElement.type === 'node' ? 'Node Inspector' : 'Link Inspector'}
                </span>
                <button onClick={() => setSelectedElement(null)} className="text-[#747D77] hover:text-[#252B28]">
                  Close
                </button>
              </div>

              {selectedElement.type === 'node' ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#F5F7F5] rounded border border-[#E5E9E5] space-y-1">
                    <div>
                      <span className="text-[10px] text-[#747D77] uppercase block font-semibold">Node ID</span>
                      <strong className="font-mono text-sm text-[#064E3B]">{selectedElement.data.id}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#747D77] uppercase block font-semibold">Facility Name</span>
                      <strong className="text-xs text-[#252B28]">{selectedElement.data.label}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => setSourceNode(selectedElement.data.id)}
                      className="px-2 py-1.5 bg-white hover:bg-[#F5F7F5] border border-[#E5E9E5] hover:border-[#B8C7BD] rounded text-[11px] font-semibold text-[#252B28]"
                    >
                      Set Source
                    </button>
                    <button
                      onClick={() => setDestNode(selectedElement.data.id)}
                      className="px-2 py-1.5 bg-white hover:bg-[#F5F7F5] border border-[#E5E9E5] hover:border-[#B8C7BD] rounded text-[11px] font-semibold text-[#252B28]"
                    >
                      Set Dest
                    </button>
                  </div>

                  {confirmDeleteNodeId === selectedElement.data.id ? (
                    <div className="flex space-x-1.5 mt-2">
                      <button
                        onClick={() => handleRemoveNode(selectedElement.data.id)}
                        disabled={isRemovingNode}
                        className="flex-1 py-1.5 bg-[#183B32] hover:bg-[#064E3B] text-white rounded text-[11px] font-bold flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        {isRemovingNode ? 'Removing...' : 'Confirm Remove'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteNodeId(null)}
                        disabled={isRemovingNode}
                        className="px-2.5 py-1.5 bg-white hover:bg-[#F5F7F5] text-[#747D77] border border-[#E5E9E5] rounded text-[11px] font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteNodeId(selectedElement.data.id)}
                      className="w-full py-1.5 bg-white hover:bg-[#F5F7F5] text-[#747D77] hover:text-[#252B28] border border-[#E5E9E5] rounded text-[11px] font-semibold flex items-center justify-center transition-colors mt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-[#747D77]" />
                      Remove Node
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="font-mono font-bold text-[#252B28]">
                    {selectedElement.data.source} ↔ {selectedElement.data.destination}
                  </div>
                  <div>
                    <label className="text-[10px] text-[#747D77] uppercase block mb-0.5">Cost</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value)}
                      className="w-full border border-[#E5E9E5] rounded p-1 font-mono text-xs bg-[#F5F7F5] text-[#252B28]"
                    />
                  </div>
                  <button
                    onClick={handleUpdateLinkParams}
                    disabled={isSavingLink}
                    className="w-full py-1.5 rounded-lg bg-[#064E3B] text-white text-xs font-semibold hover:bg-[#183B32] transition-colors shadow-xs"
                  >
                    Save Cost
                  </button>
                  <button
                    onClick={() => handleToggleLinkStatus(selectedElement.data)}
                    className="w-full py-1.5 rounded-lg border border-[#E5E9E5] text-xs font-semibold hover:bg-[#F5F7F5] text-[#252B28] transition-colors"
                  >
                    {selectedElement.data.active ? 'Sever Link' : 'Restore Link'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F5F7F5] rounded-lg border border-[#E5E9E5] p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-[#064E3B] font-bold text-xs">
                <Navigation className="w-3.5 h-3.5" />
                <span>Interactive Inspector</span>
              </div>
              <ul className="text-[11px] text-[#747D77] space-y-1 list-disc pl-3.5 leading-relaxed">
                <li><strong className="text-[#252B28]">Click any Station:</strong> Inspect connections, set route source/destination, or decommission.</li>
                <li><strong className="text-[#252B28]">Click any Link:</strong> Simulate real-time severance/recovery or modify latency cost.</li>
              </ul>
            </div>
          )}

          {/* Add / Update Connection */}
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E9E5]">
              <div className="flex items-center space-x-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#064E3B]" />
                <span className="font-bold uppercase tracking-wider text-[11px] text-[#252B28]">
                  {existingLink ? 'Update Link' : 'Connect Stations'}
                </span>
              </div>
              {existingLink && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F8E7C9] text-[#064E3B] border border-[#064E3B]/20">
                  Exists ({existingLink.cost})
                </span>
              )}
            </div>

            <form onSubmit={handleAddLink} className="space-y-2.5">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#747D77] block mb-0.5">
                    Source Station
                  </label>
                  <select
                    value={newLinkSrc}
                    onChange={(e) => {
                      setNewLinkSrc(e.target.value);
                      setLinkFeedback(null);
                    }}
                    className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] text-xs font-medium focus:outline-none focus:border-[#064E3B]"
                  >
                    {rawTopology.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} — {getNodeName(n.id, rawTopology.nodes)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#747D77] block mb-0.5">
                    Destination Station
                  </label>
                  <select
                    value={newLinkDst}
                    onChange={(e) => {
                      setNewLinkDst(e.target.value);
                      setLinkFeedback(null);
                    }}
                    className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] text-xs font-medium focus:outline-none focus:border-[#064E3B]"
                  >
                    {rawTopology.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} — {getNodeName(n.id, rawTopology.nodes)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Connection Visualizer */}
              <div className="p-2 rounded border border-[#E5E9E5] bg-[#F5F7F5]">
                <div className="flex items-center justify-between text-[#252B28] font-mono font-bold text-xs">
                  <span className="px-1.5 py-0.5 bg-white border border-[#E5E9E5] rounded text-[#064E3B]">
                    {newLinkSrc}
                  </span>
                  <div className="flex-1 flex items-center justify-center px-2 text-[#747D77]">
                    <div className="h-[1px] flex-1 bg-[#B8C7BD]"></div>
                    <span className="text-[10px] px-1 font-semibold text-[#064E3B]">
                      {newLinkCost || '—'} cost
                    </span>
                    <div className="h-[1px] flex-1 bg-[#B8C7BD]"></div>
                  </div>
                  <span className="px-1.5 py-0.5 bg-white border border-[#E5E9E5] rounded text-[#064E3B]">
                    {newLinkDst}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-center font-medium">
                  {isSelfLoop ? (
                    <span className="text-amber-700">⚠️ Source & Destination must be different</span>
                  ) : existingLink ? (
                    <span className="text-[#064E3B]">
                      🔗 Link exists (Cost: <strong>{existingLink.cost}</strong>) • Will update cost
                    </span>
                  ) : (
                    <span className="text-emerald-700">
                      ✨ New connection • Will deploy bidirectional link
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[10px] font-bold uppercase text-[#747D77]">Cost / Metric</label>
                  <span className="text-[9px] text-[#747D77]">Lower = preferred path</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={newLinkCost}
                  onChange={(e) => {
                    setNewLinkCost(e.target.value);
                    setLinkFeedback(null);
                  }}
                  placeholder="Cost (e.g. 3.0)"
                  className="w-full border border-[#E5E9E5] rounded p-1.5 text-xs bg-[#F5F7F5] text-[#252B28] font-mono focus:outline-none focus:border-[#064E3B]"
                  required
                />
                {/* Quick Presets */}
                <div className="flex gap-1 mt-1.5">
                  {[
                    { label: '1.0 Fast', val: '1.0' },
                    { label: '2.0 Normal', val: '2.0' },
                    { label: '3.0 Avg', val: '3.0' },
                    { label: '5.0 High', val: '5.0' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setNewLinkCost(preset.val)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        newLinkCost === preset.val
                          ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]/40 font-bold'
                          : 'bg-white text-[#747D77] border-[#E5E9E5] hover:bg-[#F5F7F5]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingLink || isSelfLoop}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center justify-center space-x-1 ${
                  isSelfLoop
                    ? 'bg-[#B8C7BD] text-white cursor-not-allowed'
                    : 'bg-[#064E3B] text-white hover:bg-[#183B32]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>
                  {isCreatingLink
                    ? 'Processing...'
                    : existingLink
                    ? 'Update Link Cost'
                    : 'Create Direct Link'}
                </span>
              </button>

              {linkFeedback && (
                <div
                  className={`text-[11px] p-2 rounded border leading-tight ${
                    linkFeedback.type === 'error'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#F8E7C9]/60 text-[#064E3B] border-[#064E3B]/30'
                  }`}
                >
                  {linkFeedback.message}
                </div>
              )}
            </form>
          </div>

          {/* Add / Deploy Node */}
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E9E5]">
              <div className="flex items-center space-x-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-[#064E3B]" />
                <span className="font-bold uppercase tracking-wider text-[11px] text-[#252B28]">
                  Deploy Station
                </span>
              </div>
              {suggestedNextId && (
                <span className="text-[10px] font-mono bg-[#F5F7F5] text-[#064E3B] border border-[#E5E9E5] px-1.5 py-0.5 rounded font-semibold">
                  Auto: {suggestedNextId}
                </span>
              )}
            </div>

            <form onSubmit={handleAddNode} className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#747D77] block mb-0.5">
                  Station Role / Category
                </label>
                <select
                  value={newNodeType}
                  onChange={(e) => {
                    setNewNodeType(e.target.value);
                    setNodeFeedback(null);
                  }}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] text-xs font-medium focus:outline-none focus:border-[#064E3B]"
                >
                  <option value="ambulance">🚑 Ambulance Unit</option>
                  <option value="police">🚓 Police Station</option>
                  <option value="fire_service">🚒 Fire Services</option>
                  <option value="shelter">🏠 Emergency Shelter</option>
                  <option value="field_team">👥 Field Response Team</option>
                  <option value="control_center">📡 Control Center</option>
                  <option value="custom">📍 Custom Node</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#747D77] block mb-0.5">
                    Node ID
                  </label>
                  <input
                    type="text"
                    placeholder={suggestedNextId}
                    value={newNodeId}
                    onChange={(e) => {
                      setNewNodeId(e.target.value);
                      setNodeFeedback(null);
                    }}
                    className="w-full border border-[#E5E9E5] rounded p-1.5 uppercase bg-[#F5F7F5] text-[#252B28] text-xs font-mono focus:outline-none focus:border-[#064E3B]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-[#747D77] block mb-0.5">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    placeholder={NODE_CONFIG[newNodeType]?.placeholder || 'e.g. City Hospital'}
                    value={newNodeLabel}
                    onChange={(e) => {
                      setNewNodeLabel(e.target.value);
                      setNodeFeedback(null);
                    }}
                    className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] text-xs focus:outline-none focus:border-[#064E3B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-[#064E3B] text-white rounded-lg text-xs font-semibold hover:bg-[#183B32] transition-colors shadow-xs flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deploy Station</span>
              </button>

              {nodeFeedback && (
                <div
                  className={`text-[11px] p-2 rounded border leading-tight ${
                    nodeFeedback.type === 'error'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-[#F8E7C9]/60 text-[#064E3B] border-[#064E3B]/30'
                  }`}
                >
                  {nodeFeedback.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
