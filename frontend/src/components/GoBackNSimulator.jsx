import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Radio,
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';

const SPEED_PRESETS = [
  { label: '0.6x (Slow)', ms: 2600 },
  { label: '1x (Normal)', ms: 1700 },
  { label: '1.8x (Fast)', ms: 950 },
];

export default function GoBackNSimulator({ simResult, onReRun, isRunningNew }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(1); // Normal (1700ms)
  const [animSubPhase, setAnimSubPhase] = useState('idle'); // 'frame-flight', 'ack-flight', 'lost', 'corrupt', 'timeout'

  const events = simResult?.events || [];
  const totalSteps = events.length;
  const currentEvent = events[currentStepIndex] || null;
  const stepDuration = SPEED_PRESETS[speedIndex].ms;
  const totalFrames = simResult?.config?.total_frames || 10;
  const windowSize = simResult?.config?.window_size || 4;

  // Reset to beginning and auto-play when fresh simulation results arrive
  useEffect(() => {
    if (events.length > 0) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
    }
  }, [simResult]);

  // Synchronized step animation choreography
  useEffect(() => {
    if (!currentEvent) {
      setAnimSubPhase('idle');
      return;
    }

    const { type, outcome } = currentEvent;
    const flightTime = Math.min(750, Math.floor(stepDuration * 0.45));

    if (type === 'TIMEOUT') {
      setAnimSubPhase('timeout');
      return;
    }

    // Start with data frame flying from Sender across the channel
    if (outcome === 'LOST_IN_TRANSIT') {
      setAnimSubPhase('frame-lost');
    } else {
      setAnimSubPhase('frame-flight');
    }

    // Phase 2: Frame arrival & ACK response
    const ackTimer = setTimeout(() => {
      if (outcome === 'RECEIVED_OK_ACK_SENT') {
        setAnimSubPhase('ack-flight');
      } else if (outcome === 'RECEIVED_OK_ACK_LOST') {
        setAnimSubPhase('ack-lost');
      } else if (outcome === 'CORRUPTED_CRC_ERROR') {
        setAnimSubPhase('corrupt');
      } else if (outcome === 'DISCARDED_OUT_OF_ORDER') {
        setAnimSubPhase('discarded');
      }
    }, flightTime);

    return () => clearTimeout(ackTimer);
  }, [currentStepIndex, currentEvent, stepDuration]);

  // Automated playback timer
  useEffect(() => {
    let timerId;
    if (isPlaying && totalSteps > 0) {
      if (currentStepIndex < totalSteps - 1) {
        timerId = setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1);
        }, stepDuration);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timerId);
  }, [isPlaying, currentStepIndex, totalSteps, stepDuration]);

  const handlePlayPause = () => {
    if (currentStepIndex >= totalSteps - 1) {
      // If at the end, restart from beginning
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentStepIndex((p) => Math.max(0, p - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStepIndex((p) => Math.min(totalSteps - 1, p + 1));
  };

  const handleReplay = () => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  if (!simResult || events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E9E5] p-8 text-center shadow-xs">
        <Package className="w-10 h-10 text-[#747D77] mx-auto mb-2 animate-bounce" />
        <p className="text-sm font-semibold text-[#252B28]">Ready to simulate Go-Back-N protocol.</p>
        <p className="text-xs text-[#747D77] mt-1">Configure the window parameters and run the simulation.</p>
      </div>
    );
  }

  // Derive historical state at current step
  const activeBase = currentEvent?.base ?? 0;
  const activeExpected = currentEvent?.expected_seq ?? 0;
  const activeWindow = currentEvent?.sender_window || [0, Math.min(windowSize - 1, totalFrames - 1)];

  // Count retransmissions per frame up to current step
  const frameRetransCounts = {};
  for (let i = 0; i <= currentStepIndex; i++) {
    const ev = events[i];
    if (ev && ev.type === 'RETRANSMISSION') {
      frameRetransCounts[ev.frame_seq] = (frameRetransCounts[ev.frame_seq] || 0) + 1;
    }
  }

  const isComplete = currentStepIndex === totalSteps - 1 && activeExpected >= totalFrames;

  return (
    <div className="space-y-4">
      {/* 1. Playback & Control Bar */}
      <div className="bg-white rounded-xl border border-[#E5E9E5] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Playback Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handlePlayPause}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
                isPlaying ? 'bg-[#183B32] hover:bg-[#064E3B]' : 'bg-[#064E3B] hover:bg-[#183B32]'
              }`}
              title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current text-[#F8E7C9]" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-[#F8E7C9]" />
                  <span>{currentStepIndex >= totalSteps - 1 ? 'Replay' : 'Play'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleStepBack}
              disabled={currentStepIndex <= 0}
              className="p-1.5 rounded-lg border border-[#E5E9E5] bg-white hover:bg-[#F5F7F5] disabled:opacity-30 cursor-pointer text-[#252B28]"
              title="Step Backward"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleStepForward}
              disabled={currentStepIndex >= totalSteps - 1}
              className="p-1.5 rounded-lg border border-[#E5E9E5] bg-white hover:bg-[#F5F7F5] disabled:opacity-30 cursor-pointer text-[#252B28]"
              title="Step Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleReplay}
              className="p-1.5 rounded-lg border border-[#E5E9E5] bg-white hover:bg-[#F5F7F5] cursor-pointer text-[#747D77] hover:text-[#064E3B]"
              title="Reset to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber Progress Slider */}
          <div className="flex-1 min-w-[200px] flex items-center space-x-3 px-2">
            <span className="text-[11px] font-mono font-bold text-[#064E3B] whitespace-nowrap">
              Step {currentStepIndex + 1}/{totalSteps}
            </span>
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentStepIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentStepIndex(parseInt(e.target.value));
              }}
              className="w-full accent-[#064E3B] cursor-pointer"
            />
            <span className="text-[11px] font-mono text-[#747D77] whitespace-nowrap bg-[#F5F7F5] px-2 py-0.5 rounded border border-[#E5E9E5]">
              T = {currentEvent?.time ?? 0}s
            </span>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] uppercase font-bold text-[#747D77] mr-1 hidden sm:inline">Speed:</span>
            {SPEED_PRESETS.map((sp, idx) => (
              <button
                key={sp.label}
                onClick={() => setSpeedIndex(idx)}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  speedIndex === idx
                    ? 'bg-[#064E3B] text-white font-bold'
                    : 'bg-[#F5F7F5] text-[#747D77] hover:bg-[#E5E9E5]'
                }`}
              >
                {sp.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Visual Transmission Arena (Sender ➔ Link ➔ Receiver) */}
      <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 sm:p-5 shadow-xs relative overflow-hidden">
        {/* Arena Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E9E5]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#064E3B] animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#252B28]">
              Air Channel & Pipelined Transmission Stage
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F8E7C9] text-[#064E3B] border border-[#064E3B]/20">
            Window Size N = {windowSize}
          </span>
        </div>

        {/* 3-Column Arena Stage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Left Column: SENDER NODE (Transmitter) */}
          <div className="md:col-span-3 bg-[#F5F7F5] rounded-xl border border-[#E5E9E5] p-3 text-center relative">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#064E3B] text-[#F8E7C9] flex items-center justify-center shadow-xs mb-2">
              <Radio className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[#252B28] uppercase tracking-wide">Sender Station</h4>
            <span className="text-[10px] text-[#747D77] font-semibold block mb-2">Node A (Transmitter)</span>

            <div className="space-y-1.5 text-left bg-white p-2 rounded-lg border border-[#E5E9E5] text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-[#747D77]">Base (Oldest UnACKed):</span>
                <span className="font-bold text-[#064E3B]">F{activeBase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747D77]">Active Window:</span>
                <span className="font-bold text-[#252B28]">[F{activeWindow[0]} ... F{activeWindow[1]}]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747D77]">Next To Send:</span>
                <span className="font-bold text-[#064E3B]">F{currentEvent?.next_seq_num ?? activeBase}</span>
              </div>
            </div>

            {/* Sender State Badge */}
            <div className="mt-2.5">
              {currentEvent?.type === 'TIMEOUT' ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Clock className="w-3 h-3 mr-1 text-amber-700 animate-spin" /> Timeout Expired!
                </span>
              ) : currentEvent?.type === 'RETRANSMISSION' ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
                  <RotateCcw className="w-3 h-3 mr-1 text-orange-700" /> Retransmitting F{currentEvent.frame_seq}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-[#D9E5DC] text-[#064E3B] border border-[#064E3B]/30">
                  <ArrowRight className="w-3 h-3 mr-1" /> Sending F{currentEvent?.frame_seq ?? activeBase}
                </span>
              )}
            </div>
          </div>

          {/* Center Column: WIRELESS AIR CHANNEL */}
          <div className="md:col-span-6 bg-gradient-to-b from-[#F5F7F5] to-white rounded-xl border border-dashed border-[#B8C7BD] p-3 relative h-48 flex flex-col justify-between overflow-hidden">
            {/* Upper Rail: Forward Transmission (Sender ➔ Receiver) */}
            <div className="relative w-full h-18 border-b border-dashed border-[#E5E9E5] flex items-center">
              <span className="absolute left-2 top-1 text-[9px] uppercase tracking-wider font-bold text-[#747D77] flex items-center">
                Data Frames (Sender &rarr; Receiver)
              </span>

              {/* In-Flight Data Frame Packet */}
              {currentEvent && currentEvent.type !== 'TIMEOUT' && (
                <>
                  {animSubPhase === 'frame-flight' && (
                    <div className="absolute top-1/2 -translate-y-1/2 animate-frame-fly flex items-center space-x-1.5 bg-[#064E3B] text-white px-3 py-1.5 rounded-full shadow-md font-mono text-xs font-bold z-20">
                      <Package className="w-3.5 h-3.5 text-[#F8E7C9]" />
                      <span>Frame F{currentEvent.frame_seq}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/20">DATA</span>
                    </div>
                  )}

                  {animSubPhase === 'frame-lost' && (
                    <div className="absolute top-1/2 -translate-y-1/2 animate-frame-lost flex items-center space-x-1 bg-red-600 text-white px-2.5 py-1 rounded-full shadow-md font-mono text-[11px] font-bold z-20">
                      <XCircle className="w-3.5 h-3.5 text-white" />
                      <span>F{currentEvent.frame_seq} Lost in Link!</span>
                    </div>
                  )}

                  {animSubPhase === 'corrupt' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1 bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-md font-mono text-[11px] font-bold z-20 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#F8E7C9]" />
                      <span>F{currentEvent.frame_seq} CRC Error!</span>
                    </div>
                  )}

                  {animSubPhase === 'discarded' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1 bg-amber-600 text-white px-2.5 py-1 rounded-full shadow-md font-mono text-[11px] font-bold z-20">
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      <span>F{currentEvent.frame_seq} Out of Order!</span>
                    </div>
                  )}
                </>
              )}

              {/* Timeout Alert in Channel */}
              {currentEvent?.type === 'TIMEOUT' && (
                <div className="w-full text-center py-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-mono text-xs font-bold animate-pulse">
                  ⏱️ TIMEOUT on Frame F{activeBase}! Sender initiates Go-Back-N rewind to F{activeBase}
                </div>
              )}
            </div>

            {/* Lower Rail: Reverse Feedback (Receiver ➔ Sender ACKs) */}
            <div className="relative w-full h-18 flex items-center">
              <span className="absolute right-2 bottom-1 text-[9px] uppercase tracking-wider font-bold text-[#747D77] flex items-center">
                Acknowledgments (&larr; Receiver to Sender)
              </span>

              {/* In-Flight ACK Packet */}
              {animSubPhase === 'ack-flight' && (
                <div className="absolute top-1/2 -translate-y-1/2 animate-ack-fly flex items-center space-x-1.5 bg-[#183B32] text-[#F8E7C9] border border-[#F8E7C9]/40 px-3 py-1.5 rounded-full shadow-md font-mono text-xs font-bold z-20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ACK F{currentEvent.frame_seq}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 text-white">ACK</span>
                </div>
              )}

              {animSubPhase === 'ack-lost' && (
                <div className="absolute top-1/2 -translate-y-1/2 animate-ack-lost flex items-center space-x-1 bg-red-600 text-white px-2.5 py-1 rounded-full shadow-md font-mono text-[11px] font-bold z-20">
                  <XCircle className="w-3.5 h-3.5 text-white" />
                  <span>ACK F{currentEvent.frame_seq} Lost in Transit!</span>
                </div>
              )}

              {/* Idle channel guide */}
              {animSubPhase === 'idle' || animSubPhase === 'timeout' ? (
                <div className="w-full text-center text-[10px] text-[#747D77] font-medium">
                  Channel link idle &bull; Waiting for transmission
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Column: RECEIVER NODE (Destination) */}
          <div className="md:col-span-3 bg-[#F5F7F5] rounded-xl border border-[#E5E9E5] p-3 text-center relative">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#183B32] text-[#F8E7C9] flex items-center justify-center shadow-xs mb-2">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[#252B28] uppercase tracking-wide">Receiver Station</h4>
            <span className="text-[10px] text-[#747D77] font-semibold block mb-2">Node B (Destination)</span>

            <div className="space-y-1.5 text-left bg-white p-2 rounded-lg border border-[#E5E9E5] text-[11px] font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#747D77]">Expecting Next:</span>
                <span className="px-2 py-0.5 rounded bg-[#064E3B] text-white font-bold text-xs">
                  F{activeExpected}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747D77]">In-Order Buffer:</span>
                <span className="font-bold text-[#064E3B]">{activeExpected} / {totalFrames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#747D77]">ACK Policy:</span>
                <span className="font-bold text-[#252B28]">Cumulative</span>
              </div>
            </div>

            {/* Receiver Action Badge */}
            <div className="mt-2.5">
              {animSubPhase === 'ack-flight' ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-[#D9E5DC] text-[#064E3B] border border-[#064E3B]/30">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-[#064E3B]" /> Accepted F{currentEvent?.frame_seq} & Sent ACK
                </span>
              ) : animSubPhase === 'discarded' ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <XCircle className="w-3 h-3 mr-1" /> Discarded: Want F{activeExpected}
                </span>
              ) : animSubPhase === 'corrupt' ? (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                  <XCircle className="w-3 h-3 mr-1" /> CRC Checksum Failed
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold bg-white text-[#747D77] border border-[#E5E9E5]">
                  Listening for F{activeExpected}...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Step Explanation Alert */}
        {currentEvent && (
          <div className="mt-4 p-3 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] flex items-start space-x-2 text-xs">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#064E3B] text-white shrink-0">
              {currentEvent.type}
            </span>
            <div className="text-[#252B28]">
              <span className="font-bold text-[#064E3B]">Frame {currentEvent.frame_seq}: </span>
              {currentEvent.description}
            </div>
          </div>
        )}
      </div>

      {/* 3. Physical Sliding Window Sequence Tape */}
      <div className="bg-white rounded-xl border border-[#E5E9E5] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E9E5]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#064E3B]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#252B28]">
              Sliding Window Sequence Tape (Frames 0 to {totalFrames - 1})
            </h4>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-semibold text-[#747D77]">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-[#064E3B] mr-1" /> Delivered</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-[#F8E7C9] border border-[#064E3B] mr-1" /> In Window</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-white border border-[#E5E9E5] mr-1" /> Pending</span>
          </div>
        </div>

        {/* Frame Blocks Container */}
        <div className="p-3 bg-[#F5F7F5] rounded-xl border border-[#E5E9E5] overflow-x-auto">
          <div className="flex items-center space-x-2 min-w-max pb-1">
            {Array.from({ length: totalFrames }).map((_, i) => {
              const isDelivered = i < activeExpected;
              const inWindow = i >= activeWindow[0] && i <= activeWindow[1];
              const isCurrentlyTransmitting = currentEvent?.frame_seq === i && currentEvent.type !== 'TIMEOUT';
              const retransCount = frameRetransCounts[i] || 0;

              return (
                <div
                  key={i}
                  className={`w-14 h-18 rounded-lg border-2 flex flex-col items-center justify-between p-1.5 font-mono text-xs transition-all relative ${
                    isCurrentlyTransmitting
                      ? 'ring-3 ring-[#064E3B] ring-offset-2 scale-105 z-10'
                      : ''
                  } ${
                    isDelivered
                      ? 'bg-[#064E3B] border-[#064E3B] text-white shadow-xs'
                      : inWindow
                      ? 'bg-[#F8E7C9] border-[#064E3B] text-[#064E3B] font-bold shadow-xs'
                      : 'bg-white border-[#E5E9E5] text-[#747D77]'
                  }`}
                >
                  <span className="font-bold text-[11px]">F{i}</span>

                  <span className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded ${
                    isDelivered
                      ? 'bg-white/20 text-white'
                      : inWindow
                      ? 'bg-[#064E3B] text-white'
                      : 'bg-[#E5E9E5] text-[#747D77]'
                  }`}>
                    {isDelivered ? 'ACK' : inWindow ? 'WIN' : 'PEND'}
                  </span>

                  <div className="text-[9px] flex items-center">
                    {retransCount > 0 ? (
                      <span className="text-orange-600 font-bold bg-orange-100 px-1 rounded">r={retransCount}</span>
                    ) : (
                      <span className="opacity-40">&mdash;</span>
                    )}
                  </div>

                  {/* Base Pointer Indicator */}
                  {i === activeBase && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-[#064E3B] uppercase">Base</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sliding Window Span Legend */}
        <div className="text-center pt-2">
          <span className="inline-block text-[11px] font-mono font-semibold text-[#064E3B] bg-[#F8E7C9] px-3 py-1 rounded-full border border-[#064E3B]/30">
            Window Scope: [ Frame {activeWindow[0]} ... Frame {activeWindow[1]} ] &bull; Capacity = {windowSize}
          </span>
        </div>
      </div>

      {/* 4. Aggregate Protocol Statistics (4 KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E5] shadow-xs">
          <span className="text-[#747D77] text-[10px] uppercase font-bold tracking-wider">Sent Frames</span>
          <div className="font-bold text-lg font-mono text-[#064E3B] mt-0.5">
            {simResult.stats.original_transmissions}
          </div>
          <span className="text-[10px] text-[#747D77]">Original attempts</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E5] shadow-xs">
          <span className="text-[#747D77] text-[10px] uppercase font-bold tracking-wider">Retransmissions</span>
          <div className="font-bold text-lg font-mono text-orange-600 mt-0.5">
            {simResult.stats.retransmissions}
          </div>
          <span className="text-[10px] text-[#747D77]">Window rollbacks</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E5] shadow-xs">
          <span className="text-[#747D77] text-[10px] uppercase font-bold tracking-wider">Lost / Corrupted</span>
          <div className="font-bold text-lg font-mono text-rose-600 mt-0.5">
            {simResult.stats.lost_frames + simResult.stats.corrupted_frames}
          </div>
          <span className="text-[10px] text-[#747D77]">
            {simResult.stats.lost_frames} lost, {simResult.stats.corrupted_frames} corrupt
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E5E9E5] shadow-xs">
          <span className="text-[#747D77] text-[10px] uppercase font-bold tracking-wider">Delivery Ratio</span>
          <div className="font-bold text-lg font-mono text-[#064E3B] mt-0.5">
            {simResult.stats.packet_delivery_ratio}%
          </div>
          <span className="text-[10px] text-[#747D77]">
            {simResult.stats.successful_deliveries}/{totalFrames} delivered
          </span>
        </div>
      </div>
    </div>
  );
}
