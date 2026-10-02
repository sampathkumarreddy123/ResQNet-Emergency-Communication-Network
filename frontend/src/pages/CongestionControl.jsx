import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Droplet,
  Droplets,
  Repeat,
  ArrowDown,
  Gauge
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import api from '../services/api';

export default function CongestionControl() {
  const [bucketCap, setBucketCap] = useState(15);
  const [leakRate, setLeakRate] = useState(3);
  const [burstPattern, setBurstPattern] = useState('2, 4, 8, 12, 10, 6, 2, 1, 0, 0, 7, 9, 3, 1, 0');
  const [steps, setSteps] = useState(15);

  const [result, setResult] = useState(null);
  const [baseResult, setBaseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Playback & Timing: 1.0 second per leakage default
  const [isPlaying, setIsPlaying] = useState(true);
  const [secondsPerLeak, setSecondsPerLeak] = useState(1.0); // 1.0 second per leakage
  const [continuousMode, setContinuousMode] = useState(true);

  // Synchronized visual choreography states
  const [tankQueueLevel, setTankQueueLevel] = useState(0);
  const [waterTransitionDuration, setWaterTransitionDuration] = useState('400ms');
  const [showIncoming, setShowIncoming] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [isDraining, setIsDraining] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('idle'); // 'ingress' | 'leaking' | 'settled'

  const handleSimulate = async (e, autoPlay = true) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const patternArray = burstPattern
        .split(',')
        .map((x) => parseInt(x.trim()))
        .filter((x) => !isNaN(x));

      const res = await api.runLeakyBucket({
        bucket_capacity: parseInt(bucketCap),
        leak_rate: parseInt(leakRate),
        incoming_pattern: patternArray,
        simulation_steps: parseInt(steps),
      });

      setBaseResult(JSON.parse(JSON.stringify(res.data)));
      setResult(res.data);
      setCurrentStep(0);
      if (autoPlay) {
        setIsPlaying(true);
      }
    } catch (err) {
      alert('Leaky Bucket error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSimulate(null, true);
  }, []);

  const metrics = result?.metrics || {};
  const currentStepData = result?.history ? result.history[currentStep] : null;
  const isPostSimulationContinuous = Boolean(currentStepData?.isContinuous);

  // Precise, synchronized choreography corresponding between incoming packet, water level, and bottom leak
  useEffect(() => {
    if (!result?.history || result.history.length === 0) return;
    const stepData = result.history[currentStep];
    if (!stepData) return;

    const prevQueue = currentStep === 0 ? 0 : (result.history[currentStep - 1]?.queue_size || 0);
    const arrivedQueue = Math.min(bucketCap, prevQueue + (stepData.accepted || 0));
    const leakedQueue = stepData.queue_size;

    // --- PHASE 1: Ingress (0ms to 650ms) ---
    // At 0ms: Trigger incoming packet fall animation (600ms duration)
    if (stepData.incoming > 0) {
      setShowIncoming(true);
      setCurrentPhase('ingress');
    } else {
      setShowIncoming(false);
      setCurrentPhase('idle');
    }

    if (stepData.dropped > 0) {
      setShowOverflow(true);
    } else {
      setShowOverflow(false);
    }

    setIsDraining(false);
    setWaterTransitionDuration('400ms');
    setTankQueueLevel(prevQueue); // start cleanly from previous step's water level

    // At 250ms (as packet hits the liquid surface): Water level smoothly glides up!
    const riseTimer = setTimeout(() => {
      setWaterTransitionDuration('400ms');
      setTankQueueLevel(arrivedQueue);
    }, 250);

    // --- PHASE 2: Leakage (650ms to 650ms + leakDuration) ---
    // At 650ms: Incoming packet has fully merged into the liquid.
    // Bottom nozzle begins dripping, and liquid height drains in EXACT correspondence!
    const leakTimeMs = Math.max(1, stepData.transmitted) * secondsPerLeak * 1000;

    const leakTimer = setTimeout(() => {
      setShowIncoming(false);
      setShowOverflow(false);

      if (stepData.transmitted > 0) {
        setIsDraining(true);
        setCurrentPhase('leaking');
        setWaterTransitionDuration(`${leakTimeMs}ms`);
        // Smoothly drain water down to final level in exact sync with dripping droplet
        setTankQueueLevel(leakedQueue);
      } else {
        setCurrentPhase('settled');
      }
    }, 650);

    // --- PHASE 3: Settle ---
    // When leakage concludes: Droplet enters conduit and state settles cleanly
    const settleTimer = setTimeout(() => {
      setIsDraining(false);
      setCurrentPhase('settled');
      setWaterTransitionDuration('300ms');
    }, 650 + leakTimeMs);

    return () => {
      clearTimeout(riseTimer);
      clearTimeout(leakTimer);
      clearTimeout(settleTimer);
    };
  }, [currentStep, result, bucketCap, secondsPerLeak]);

  // Main automated step advancement timer paced to match the total choreographed sequence
  useEffect(() => {
    let timeoutId;
    if (isPlaying && result?.history && result.history.length > 0) {
      const stepData = result.history[currentStep];
      const ingressTime = stepData?.incoming > 0 ? 650 : 250;
      const leakTime = Math.max(1, stepData?.transmitted || 1) * secondsPerLeak * 1000;
      const settleTime = 450;
      const totalStepTime = ingressTime + leakTime + settleTime;

      timeoutId = setTimeout(() => {
        setCurrentStep((prevStep) => {
          const nextStep = prevStep + 1;

          // If next step exists in current history, advance to it
          if (nextStep < result.history.length) {
            return nextStep;
          }

          // If initial simulation is complete, enter continuous 1-packet drop stream
          if (continuousMode) {
            setResult((prevResult) => {
              if (!prevResult?.history) return prevResult;
              const hist = prevResult.history;
              const lastItem = hist[hist.length - 1];
              const prevQueue = lastItem ? lastItem.queue_size : 0;

              // 1 packet arrives and drops in continuously
              const incoming = 1;
              const availableSpace = bucketCap - prevQueue;
              const accepted = Math.min(incoming, Math.max(0, availableSpace));
              const dropped = incoming - accepted;
              const queueBeforeLeak = prevQueue + accepted;

              // 1 packet leaks out continuously
              const transmitted = Math.min(queueBeforeLeak, Math.max(1, Math.min(leakRate, 1)));
              const newQueue = queueBeforeLeak - transmitted;
              const newStepNumber = hist.length + 1;

              const newStepData = {
                step: newStepNumber,
                incoming: 1,
                accepted,
                transmitted,
                queue_size: newQueue,
                dropped,
                isContinuous: true,
              };

              return {
                ...prevResult,
                metrics: {
                  ...prevResult.metrics,
                  total_incoming: (prevResult.metrics?.total_incoming || 0) + 1,
                  total_accepted: (prevResult.metrics?.total_accepted || 0) + accepted,
                  total_transmitted: (prevResult.metrics?.total_transmitted || 0) + transmitted,
                  total_dropped: (prevResult.metrics?.total_dropped || 0) + dropped,
                },
                history: [...hist, newStepData],
              };
            });

            return nextStep;
          } else {
            return 0;
          }
        });
      }, totalStepTime);
    }
    return () => clearTimeout(timeoutId);
  }, [isPlaying, currentStep, result?.history?.length, continuousMode, bucketCap, leakRate, secondsPerLeak]);

  // Restart back to the initial burst pattern
  const handleReplayBurst = () => {
    if (baseResult) {
      setResult(JSON.parse(JSON.stringify(baseResult)));
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      handleSimulate(null, true);
    }
  };

  // Step Action Commentary
  const getStepCommentary = () => {
    if (!currentStepData) return '';
    const { incoming, transmitted, queue_size, dropped, isContinuous } = currentStepData;

    if (isContinuous) {
      return `💧 Continuous Stream (1s / leakage): 1 packet drops in and 1 packet leaks out every ${secondsPerLeak}s (Bucket in steady state).`;
    }
    if (dropped > 0) {
      return `⚠️ Buffer Overflow! Bucket exceeded capacity of ${bucketCap}. ${dropped} packets dropped due to congestion.`;
    }
    if (incoming > leakRate) {
      return `⚡ Burst Arrival: ${incoming} pkts arrived (exceeds leak rate of ${leakRate}). Buffer absorbing surplus (${queue_size} pkts queued).`;
    }
    if (incoming > 0 && transmitted > 0) {
      return `🔄 Flow Smoothing: ${incoming} pkts arrived while leaking at constant rate of ${transmitted} pkts/step.`;
    }
    if (incoming === 0 && queue_size > 0) {
      return `💧 Buffer Draining: Zero ingress, smoothly transmitting ${transmitted} pkts/step from queue.`;
    }
    if (queue_size === 0 && transmitted === 0) {
      return `✅ Buffer Idle: Queue is clear and ready for the next traffic burst.`;
    }
    return `Regulating message traffic: ${transmitted} pkts dispatched at constant rate.`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Congestion Control (Leaky Bucket)"
        subtitle="Regulates bursty message arrivals into a constant output rate to prevent buffer overflow."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form (1 Col) */}
        <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs space-y-3 shadow-xs">
          <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
            Bucket Parameters
          </span>

          <form onSubmit={(e) => handleSimulate(e, true)} className="space-y-3">
            <div>
              <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Capacity</label>
              <input
                type="number"
                min="5"
                max="50"
                value={bucketCap}
                onChange={(e) => setBucketCap(e.target.value)}
                className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Leak Rate (pkt/step)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={leakRate}
                onChange={(e) => setLeakRate(e.target.value)}
                className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Burst Pattern</label>
              <textarea
                rows={2}
                value={burstPattern}
                onChange={(e) => setBurstPattern(e.target.value)}
                className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono text-[11px] bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-semibold text-xs flex items-center justify-center mt-2 shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" />
              {loading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-[#E5E9E5] space-y-1.5">
            <span className="text-[10px] font-bold text-[#747D77] uppercase block">Traffic Presets</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBurstPattern('2, 4, 8, 12, 10, 6, 2, 1, 0, 0, 7, 9, 3, 1, 0');
                  setBucketCap(15);
                  setLeakRate(3);
                }}
                className="px-2 py-1 bg-[#F5F7F5] hover:bg-[#D9E5DC] text-[#252B28] rounded text-[10px] font-medium border border-[#E5E9E5] transition-colors cursor-pointer"
              >
                Sudden Burst
              </button>
              <button
                type="button"
                onClick={() => {
                  setBurstPattern('10, 14, 16, 12, 8, 15, 12, 6, 3, 2');
                  setBucketCap(12);
                  setLeakRate(4);
                }}
                className="px-2 py-1 bg-[#F5F7F5] hover:bg-[#D9E5DC] text-[#252B28] rounded text-[10px] font-medium border border-[#E5E9E5] transition-colors cursor-pointer"
              >
                Heavy Overflow
              </button>
            </div>
          </div>
        </div>

        {/* Results & Visualizer (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <div className="space-y-4 text-xs">
              {/* Top Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-[#E5E9E5] shadow-xs">
                <div>
                  <span className="text-[#747D77] text-[10px] font-semibold uppercase">Incoming</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{metrics.total_incoming}</div>
                </div>
                <div>
                  <span className="text-[#747D77] text-[10px] font-semibold uppercase">Accepted</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{metrics.total_accepted}</div>
                </div>
                <div>
                  <span className="text-[#747D77] text-[10px] font-semibold uppercase">Transmitted</span>
                  <div className="font-bold text-base font-mono text-[#064E3B]">{metrics.total_transmitted}</div>
                </div>
                <div>
                  <span className="text-[#747D77] text-[10px] font-semibold uppercase">Dropped</span>
                  <div className="font-bold text-base font-mono text-[#747D77]">{metrics.total_dropped}</div>
                </div>
              </div>

              {/* Bucket Display & Automated Animation Console */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 sm:p-4 rounded-lg border border-[#E5E9E5] items-start shadow-xs">
                {/* Bucket Tank with Smooth Synchronized Choreography */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#F5F7F5] rounded-lg border border-[#E5E9E5]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#064E3B] mb-2 flex items-center">
                    <Gauge className="w-3.5 h-3.5 mr-1" />
                    Bucket Tank
                  </span>

                  {/* Intake Pipe: Inflow drops down smoothly into water ONCE */}
                  <div className="h-10 w-full flex flex-col items-center justify-end relative mb-1">
                    {showIncoming && currentStepData?.incoming > 0 && (
                      <div
                        key={`ingress-${currentStep}`}
                        className="flex flex-col items-center animate-packet-drop-once"
                      >
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#064E3B] text-white shadow-xs">
                          +{currentStepData.incoming} {currentStepData.incoming === 1 ? 'pkt' : 'pkts'}
                        </span>
                        <ArrowDown className="w-3.5 h-3.5 text-[#064E3B] mt-0.5" />
                      </div>
                    )}

                    {/* Overflow Splash Indicator */}
                    {showOverflow && currentStepData?.dropped > 0 && (
                      <div
                        key={`overflow-${currentStep}`}
                        className="absolute -right-2 top-0 animate-packet-overflow"
                      >
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-red-600 text-white shadow-xs">
                          ⚠️ -{currentStepData.dropped} dropped!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cylinder Tank */}
                  <div className="w-28 h-40 border-2 border-[#064E3B] border-t-0 rounded-b-xl relative bg-white overflow-hidden flex flex-col justify-end shadow-inner">
                    {/* Calibration Ticks */}
                    <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between pointer-events-none text-[8px] font-mono text-[#747D77]/70 z-10">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                    </div>

                    {/* Liquid Fluid: Fluidly glides up on arrival, then smoothly drains during leakage */}
                    <div
                      className={`w-full transition-all ease-in-out border-t-2 ${
                        tankQueueLevel >= bucketCap
                          ? 'bg-gradient-to-t from-[#183B32] to-[#064E3B] border-amber-300'
                          : 'bg-gradient-to-t from-[#183B32] to-[#064E3B] border-[#F8E7C9]'
                      }`}
                      style={{
                        height: `${Math.min(100, (tankQueueLevel / bucketCap) * 100)}%`,
                        opacity: tankQueueLevel > 0 ? 0.95 : 0,
                        transitionDuration: waterTransitionDuration,
                      }}
                    />

                    {/* Tank Level Badge: Dynamically reflects fluid status */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-bold text-xs pointer-events-none z-20">
                      <span className="bg-[#F8E7C9] text-[#064E3B] border border-[#064E3B]/20 px-2 py-0.5 rounded-md shadow-xs">
                        {tankQueueLevel} / {bucketCap}
                      </span>
                      <span className="text-[9px] text-[#252B28] font-normal mt-0.5 bg-white/80 px-1 rounded">
                        {Math.round((tankQueueLevel / bucketCap) * 100)}% capacity
                      </span>
                    </div>
                  </div>

                  {/* Spout / Leaking Drain Nozzle */}
                  <div className="w-4 h-2 bg-[#064E3B] rounded-b-xs" />

                  {/* Outflow Droplet: Exactly 1.0 second per leakage, in direct sync with water drain */}
                  <div className="h-9 w-full flex flex-col items-center justify-start mt-1 relative">
                    {isDraining && currentStepData?.transmitted > 0 ? (
                      <div
                        key={`leak-${currentStep}`}
                        className="flex flex-col items-center animate-packet-drip"
                        style={{ animationDuration: `${secondsPerLeak}s` }}
                      >
                        <Droplets className="w-3.5 h-3.5 text-[#064E3B]" />
                        <span className="text-[9px] font-bold font-mono text-[#064E3B] mt-0.5">
                          {currentStepData.transmitted} {currentStepData.transmitted === 1 ? 'pkt' : 'pkts'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-mono text-[#747D77] italic">
                        {currentStepData?.transmitted ? `Leaked (${currentStepData.transmitted})` : '0 pkts'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-[10px] text-[#747D77] font-semibold border-t border-[#E5E9E5] pt-1.5 w-full justify-center">
                    <Droplet className="w-3 h-3 text-[#064E3B]" />
                    <span>Cadence: 1 pkt / {secondsPerLeak}s</span>
                  </div>
                </div>

                {/* Scrubber & Automated Playback Controls */}
                <div className="sm:col-span-2 space-y-3">
                  {/* Timeline Header */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#252B28]">Timeline Step</span>
                      <span
                        className={`inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          isPostSimulationContinuous
                            ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]/30'
                            : isPlaying
                            ? 'bg-[#064E3B] text-white border-[#064E3B]'
                            : 'bg-white text-[#747D77] border-[#E5E9E5]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            isPlaying ? 'bg-[#064E3B] animate-pulse' : 'bg-[#747D77]'
                          }`}
                        />
                        {isPostSimulationContinuous
                          ? 'Continuous 1-Pkt Stream (1s)'
                          : isPlaying
                          ? currentPhase === 'ingress'
                            ? '📥 Inflow Arrival'
                            : currentPhase === 'leaking'
                            ? '💧 Draining at 1s/leak'
                            : 'Synchronized Play'
                          : 'Paused'}
                      </span>
                    </div>

                    <span className="font-mono bg-[#F8E7C9] text-[#064E3B] border border-[#064E3B]/20 font-bold px-2 py-0.5 rounded">
                      Step {currentStep + 1} of {result.history.length}
                    </span>
                  </div>

                  {/* Step Metric Cards */}
                  {currentStepData && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-[#F5F7F5] rounded border border-[#E5E9E5]">
                        <span className="text-[#747D77] text-[10px] block">Incoming</span>
                        <strong className="font-mono text-[#252B28]">{currentStepData.incoming} pkts</strong>
                      </div>
                      <div className="p-2 bg-[#F5F7F5] rounded border border-[#E5E9E5]">
                        <span className="text-[#747D77] text-[10px] block">Transmitted (Leaked)</span>
                        <strong className="font-mono text-[#064E3B]">{currentStepData.transmitted} pkts</strong>
                      </div>
                      <div className="p-2 bg-[#F5F7F5] rounded border border-[#E5E9E5]">
                        <span className="text-[#747D77] text-[10px] block">In Queue</span>
                        <strong className="font-mono text-[#183B32]">{tankQueueLevel} pkts</strong>
                      </div>
                      <div
                        className={`p-2 rounded border ${
                          currentStepData.dropped > 0
                            ? 'bg-red-50 border-red-200'
                            : 'bg-[#F5F7F5] border-[#E5E9E5]'
                        }`}
                      >
                        <span className="text-[#747D77] text-[10px] block">Dropped</span>
                        <strong
                          className={`font-mono ${
                            currentStepData.dropped > 0 ? 'text-red-700 font-bold' : 'text-[#747D77]'
                          }`}
                        >
                          {currentStepData.dropped} pkts
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Scrubber Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max={Math.max(1, result.history.length - 1)}
                      value={currentStep}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentStep(parseInt(e.target.value));
                      }}
                      className="w-full accent-[#064E3B] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#747D77]">
                      <span>Start (S1)</span>
                      <span>Current: Step {currentStep + 1}</span>
                      <span>Latest (S{result.history.length})</span>
                    </div>
                  </div>

                  {/* Playback Controls & Speed Options */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E5E9E5]">
                    {/* Play/Pause & Steppers */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#183B32] text-white rounded-md font-semibold text-xs flex items-center shadow-xs transition-colors cursor-pointer"
                        title={isPlaying ? 'Pause Animation' : 'Play Animation'}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" />
                            Play
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStep((prev) => Math.max(0, prev - 1));
                        }}
                        disabled={currentStep === 0}
                        className="p-1.5 bg-white hover:bg-[#F5F7F5] disabled:opacity-40 text-[#252B28] rounded border border-[#E5E9E5] transition-colors cursor-pointer"
                        title="Step Back"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStep((prev) => Math.min(result.history.length - 1, prev + 1));
                        }}
                        disabled={currentStep === result.history.length - 1}
                        className="p-1.5 bg-white hover:bg-[#F5F7F5] disabled:opacity-40 text-[#252B28] rounded border border-[#E5E9E5] transition-colors cursor-pointer"
                        title="Step Forward"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleReplayBurst}
                        className="px-2 py-1.5 bg-white hover:bg-[#F5F7F5] text-[#252B28] rounded border border-[#E5E9E5] text-[11px] font-semibold flex items-center transition-colors cursor-pointer"
                        title="Replay Initial Burst Scenario"
                      >
                        <RotateCcw className="w-3 h-3 text-[#747D77] mr-1" />
                        Replay
                      </button>
                    </div>

                    {/* Cadence: 1s per leak Options */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Seconds Per Leak Pills */}
                      <div className="flex items-center bg-[#F5F7F5] p-0.5 rounded border border-[#E5E9E5]">
                        <button
                          type="button"
                          onClick={() => setSecondsPerLeak(1.5)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                            secondsPerLeak === 1.5
                              ? 'bg-[#064E3B] text-white'
                              : 'text-[#747D77] hover:text-[#252B28]'
                          }`}
                          title="Extra Slow (1.5s per leakage)"
                        >
                          1.5s / Leak
                        </button>
                        <button
                          type="button"
                          onClick={() => setSecondsPerLeak(1.0)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                            secondsPerLeak === 1.0
                              ? 'bg-[#064E3B] text-white'
                              : 'text-[#747D77] hover:text-[#252B28]'
                          }`}
                          title="Slow / Steady (1.0s per leakage - Recommended)"
                        >
                          1.0s / Leak
                        </button>
                        <button
                          type="button"
                          onClick={() => setSecondsPerLeak(0.7)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                            secondsPerLeak === 0.7
                              ? 'bg-[#064E3B] text-white'
                              : 'text-[#747D77] hover:text-[#252B28]'
                          }`}
                          title="Brisk (0.7s per leakage)"
                        >
                          0.7s / Leak
                        </button>
                      </div>

                      {/* Continuous Mode Toggle */}
                      <button
                        type="button"
                        onClick={() => setContinuousMode(!continuousMode)}
                        className={`px-2 py-1 rounded text-[10px] font-medium border flex items-center transition-colors cursor-pointer ${
                          continuousMode
                            ? 'bg-[#F8E7C9] text-[#064E3B] border-[#064E3B]/30'
                            : 'bg-white text-[#747D77] border-[#E5E9E5]'
                        }`}
                        title="When simulation completes, keep dropping 1 packet continuously every 1s"
                      >
                        <Repeat className={`w-3 h-3 mr-1 ${continuousMode ? 'text-[#064E3B]' : 'text-[#747D77]'}`} />
                        Continuous Stream: {continuousMode ? 'On' : 'Off'}
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Action Commentary with Phase Indicator */}
                  <div className="p-2.5 rounded-lg bg-[#F8E7C9]/40 border border-[#064E3B]/20 text-[11px] text-[#252B28] flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-semibold text-[#064E3B] mr-1.5">Action:</span>
                      <span>{getStepCommentary()}</span>
                    </div>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/70 border border-[#064E3B]/20 text-[#064E3B] font-bold shrink-0 ml-2">
                      {currentPhase === 'ingress'
                        ? 'Phase 1: Inflow'
                        : currentPhase === 'leaking'
                        ? 'Phase 2: Leakage'
                        : 'Phase 3: Settled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Chart with Synchronized Current Step Line */}
              <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold uppercase tracking-wider text-[#252B28]">
                    Queue Dynamics Chart
                  </span>
                  <span className="text-[11px] text-[#747D77] font-mono">
                    Sweeping Cursor: <strong className="text-[#064E3B]">Step {currentStep + 1}</strong>
                  </span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.history}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9E5" />
                      <XAxis dataKey="step" tickFormatter={(v) => `S${v}`} tick={{ fontSize: 10, fill: '#747D77' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#747D77' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#E5E9E5',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#252B28'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <ReferenceLine
                        x={currentStep + 1}
                        stroke="#064E3B"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        label={{ value: '● Live', position: 'top', fill: '#064E3B', fontSize: 10 }}
                      />
                      <Bar dataKey="incoming" name="Incoming" fill="#D9E5DC" />
                      <Bar dataKey="queue_size" name="Queue Level" fill="#183B32" />
                      <Bar dataKey="transmitted" name="Transmitted" fill="#064E3B" />
                      <Bar dataKey="dropped" name="Dropped" fill="#B8C7BD" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
