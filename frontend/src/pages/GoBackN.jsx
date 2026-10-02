import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import GoBackNSimulator from '../components/GoBackNSimulator';
import { simulateGoBackN } from '../utils/goBackNSimulator';
import api from '../services/api';

export default function GoBackN() {
  const [totalFrames, setTotalFrames] = useState(10);
  const [windowSize, setWindowSize] = useState(4);
  const [timeout, setTimeoutDuration] = useState(3.0);
  const [frameLoss, setFrameLoss] = useState(0.1);
  const [ackLoss, setAckLoss] = useState(0.05);
  const [corruption, setCorruption] = useState(0.05);

  const [simResult, setSimResult] = useState(() =>
    simulateGoBackN({
      total_frames: 10,
      window_size: 4,
      timeout_duration: 3.0,
      frame_loss_prob: 0.1,
      ack_loss_prob: 0.05,
      corruption_prob: 0.05,
    })
  );
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      console.warn('Backend unavailable, using client-side Go-Back-N simulation engine:', err);
      const localResult = simulateGoBackN({
        total_frames: parseInt(totalFrames),
        window_size: parseInt(windowSize),
        timeout_duration: parseFloat(timeout),
        frame_loss_prob: parseFloat(frameLoss),
        ack_loss_prob: parseFloat(ackLoss),
        corruption_prob: parseFloat(corruption),
      });
      setSimResult(localResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunSimulation();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Go-Back-N Automatic Repeat Request (ARQ)"
        subtitle="Sliding window flow and error recovery protocol. Demonstrates sender pipelining, cumulative acknowledgments, timer expiration, and bulk retransmissions."
        badge="ARQ Protocol"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Protocol Configuration Form */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E9E5] p-5 shadow-xs">
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
                  <span className="text-[#064E3B] font-mono font-bold">{Math.round(frameLoss * 100)}%</span>
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
                  <span className="text-[#064E3B] font-mono font-bold">{Math.round(ackLoss * 100)}%</span>
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
                  <span className="text-[#064E3B] font-mono font-bold">{Math.round(corruption * 100)}%</span>
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
              className="w-full py-2.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-bold text-xs flex items-center justify-center transition-all mt-2 cursor-pointer shadow-xs"
            >
              <Play className={`w-3.5 h-3.5 mr-1.5 text-[#F8E7C9] ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Simulating Go-Back-N...' : 'Simulate Go-Back-N'}
            </button>
          </form>
        </div>

        {/* Right Column: Sliding Window Visualizer & Event Timeline */}
        <div className="lg:col-span-8">
          <GoBackNSimulator
            simResult={simResult}
            onReRun={handleRunSimulation}
            isRunningNew={loading}
          />
        </div>
      </div>
    </div>
  );
}
