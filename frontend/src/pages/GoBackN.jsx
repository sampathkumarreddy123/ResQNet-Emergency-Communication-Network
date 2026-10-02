import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Clock,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import api from '../services/api';

export default function GoBackN() {
  const [totalFrames, setTotalFrames] = useState(10);
  const [windowSize, setWindowSize] = useState(4);
  const [timeout, setTimeoutDuration] = useState(3.0);
  const [frameLoss, setFrameLoss] = useState(0.1);
  const [ackLoss, setAckLoss] = useState(0.05);
  const [corruption, setCorruption] = useState(0.05);

  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleRunSimulation = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await api.runGoBackN({
        total_frames: parseInt(totalFrames),
        window_size: parseInt(windowSize),
        timeout_duration: parseFloat(timeout),
        frame_loss_prob: parseFloat(frameLoss),
        ack_loss_prob: parseFloat(ackLoss),
        corruption_prob: parseFloat(corruption),
        random_seed: Math.floor(Math.random() * 10000),
      });
      setSimResult(res.data);
      setCurrentStepIndex(res.data.events.length - 1);
    } catch (err) {
      alert('Go-Back-N error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunSimulation();
  }, []);

  const stats = simResult?.stats || {};
  const currentEvent = simResult?.events ? simResult.events[currentStepIndex] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Go-Back-N Automatic Repeat Request (ARQ)"
        subtitle="Sliding window flow and error recovery protocol. Demonstrates sender pipelining, cumulative acknowledgments, timer expiration, and bulk retransmissions."
        badge="ARQ Protocol"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Protocol Configuration Form */}
        <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 shadow-xs">
          <h2 className="text-xs font-bold text-[#252B28] uppercase tracking-wider mb-4">
            Sliding Window Parameters
          </h2>

          <form onSubmit={handleRunSimulation} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Total Frames (M)</label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={totalFrames}
                  onChange={(e) => setTotalFrames(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono text-[#252B28] bg-[#F5F7F5] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#747D77] uppercase">Window Size (N)</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={windowSize}
                  onChange={(e) => setWindowSize(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono text-[#252B28] bg-[#F5F7F5] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#747D77] uppercase">Timeout (Seconds)</label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="10.0"
                value={timeout}
                onChange={(e) => setTimeoutDuration(e.target.value)}
                className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono text-[#252B28] bg-[#F5F7F5] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
            </div>

            {/* Error Probabilities Sliders */}
            <div className="space-y-2.5 pt-2 border-t border-[#E5E9E5]">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#747D77] uppercase">
                  <span>Frame Loss:</span>
                  <span className="text-[#064E3B] font-mono">{Math.round(frameLoss * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  value={frameLoss}
                  onChange={(e) => setFrameLoss(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-[#064E3B]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#747D77] uppercase">
                  <span>ACK Loss:</span>
                  <span className="text-[#064E3B] font-mono">{Math.round(ackLoss * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.4"
                  step="0.05"
                  value={ackLoss}
                  onChange={(e) => setAckLoss(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-[#064E3B]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#747D77] uppercase">
                  <span>CRC Corruption:</span>
                  <span className="text-[#064E3B] font-mono">{Math.round(corruption * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.4"
                  step="0.05"
                  value={corruption}
                  onChange={(e) => setCorruption(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-[#064E3B]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-bold text-xs flex items-center justify-center transition-all mt-2 cursor-pointer shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 mr-1.5 text-[#F8E7C9] ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Simulating...' : 'Simulate Go-Back-N'}
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Sliding Window Visualizer & Event Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {simResult && (
            <div className="space-y-6">
              {/* Aggregate Protocol KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-4 rounded-xl border border-[#E5E9E5] shadow-xs">
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Original Frames</span>
                  <div className="text-xl font-bold text-[#064E3B]">{stats.original_transmissions}</div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Retransmissions</span>
                  <div className="text-xl font-bold text-[#064E3B]">{stats.retransmissions}</div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Lost Frames / ACKs</span>
                  <div className="text-xl font-bold text-[#064E3B]">
                    {stats.lost_frames} <span className="text-xs text-[#747D77]">/ {stats.lost_acks}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#747D77] uppercase">Delivery Ratio</span>
                  <div className="text-xl font-bold text-[#064E3B]">{stats.packet_delivery_ratio}%</div>
                </div>
              </div>

              {/* Sliding Window Sequence State */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E5]">
                  <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
                    Sliding Window Sequence State (N = {windowSize})
                  </h3>
                  {currentEvent && (
                    <span className="text-xs font-mono font-bold text-[#064E3B] bg-[#F5F7F5] px-2.5 py-0.5 rounded border border-[#E5E9E5]">
                      Step {currentStepIndex + 1} / {simResult.events.length} &bull; {currentEvent.time}s
                    </span>
                  )}
                </div>

                {/* Frame Blocks Representation */}
                <div className="flex flex-wrap items-center gap-2 p-3.5 bg-[#F5F7F5] rounded-xl border border-[#E5E9E5] overflow-x-auto">
                  {Array.from({ length: totalFrames }).map((_, i) => {
                    const statusObj = simResult.frame_status[i] || {};
                    const isDelivered = statusObj.status === 'delivered';
                    const inCurrentWindow =
                      currentEvent &&
                      i >= currentEvent.sender_window[0] &&
                      i <= currentEvent.sender_window[1];
                    const isBase = currentEvent && i === currentEvent.base;

                    return (
                      <div
                        key={i}
                        className={`w-14 h-16 rounded-lg border-2 flex flex-col items-center justify-between p-1.5 transition-all relative ${
                          isDelivered
                            ? 'bg-[#D9E5DC] border-[#064E3B] text-[#064E3B]'
                            : inCurrentWindow
                            ? 'bg-[#F8E7C9] border-[#064E3B] border-dashed text-[#064E3B]'
                            : 'bg-white border-[#E5E9E5] text-[#747D77]'
                        }`}
                      >
                        <span className="text-[10px] font-bold font-mono text-[#252B28]">F{i}</span>
                        <span className="text-[9px] font-mono font-bold uppercase truncate">
                          {isDelivered ? '[ACK]' : inCurrentWindow ? '[WINDOW]' : '[PENDING]'}
                        </span>
                        {isBase && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#064E3B] text-[#F8E7C9] text-[8px] font-mono font-bold px-1.5 py-0.2 rounded shadow-xs">
                            BASE
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-[#747D77]">
                          {statusObj.retransmissions > 0 ? `r=${statusObj.retransmissions}` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Step Player Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentStepIndex <= 0}
                      className="p-1 rounded border border-[#E5E9E5] bg-white hover:bg-[#F5F7F5] text-[#252B28] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentStepIndex((prev) => Math.min(simResult.events.length - 1, prev + 1))
                      }
                      disabled={currentStepIndex >= simResult.events.length - 1}
                      className="p-1 rounded border border-[#E5E9E5] bg-white hover:bg-[#F5F7F5] text-[#252B28] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-[#747D77]">Scrubber</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={simResult.events.length - 1}
                    value={currentStepIndex}
                    onChange={(e) => setCurrentStepIndex(parseInt(e.target.value))}
                    className="w-48 sm:w-60 accent-[#064E3B]"
                  />
                </div>

                {/* Selected Step Explanation Banner */}
                {currentEvent && (
                  <div className="p-3 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[#064E3B] font-mono">
                        {currentEvent.type} &bull; Frame {currentEvent.frame_seq}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#D9E5DC] text-[#064E3B] border border-[#064E3B]/20">
                        [{currentEvent.outcome}]
                      </span>
                    </div>
                    <p className="text-[#747D77] text-[11px]">{currentEvent.description}</p>
                    <div className="text-[10px] text-[#747D77] font-mono pt-1 flex justify-between border-t border-[#E5E9E5]">
                      <span>Window: [{currentEvent.sender_window[0]}, {currentEvent.sender_window[1]}]</span>
                      <span>Receiver Expected: {currentEvent.expected_seq}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Event Step Logs */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 shadow-xs">
                <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider mb-2.5">
                  Protocol Event Trace ({simResult.events.length} Entries)
                </h3>
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {simResult.events.map((evt, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        currentStepIndex === idx
                          ? 'border-[#064E3B] bg-[#F8E7C9]/30 font-semibold ring-1 ring-[#064E3B]'
                          : 'border-[#E5E9E5] hover:border-[#B8C7BD] bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[#747D77] text-[10px]">{evt.time}s</span>
                        <span className="font-bold text-[#064E3B]">[{evt.type}]</span>
                        <span className="text-[#747D77] truncate max-w-md text-[11px]">{evt.description}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#252B28]">F{evt.frame_seq}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
