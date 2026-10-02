import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Binary,
  RefreshCw,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import GoBackNSimulator from '../components/GoBackNSimulator';
import { simulateGoBackN } from '../utils/goBackNSimulator';
import api from '../services/api';

const CRC_PRESETS = [
  { name: 'Textbook Example (1011)', poly: '1011', defaultData: '110101' },
  { name: 'CRC-4 (x^4 + x + 1)', poly: '10011', defaultData: '1101011011' },
  { name: 'CRC-8 (ATM)', poly: '100000111', defaultData: '1101011011' },
  { name: 'CRC-16 (ANSI)', poly: '11000000000000101', defaultData: '1101011011' },
];

function generateTextbookCRCSteps(dividend, generator) {
  if (!dividend || !generator || generator.length < 2) return [];
  const k = generator.length;
  const steps = [];
  let current = dividend;
  let stepNum = 1;

  while (current.length >= k) {
    const firstOne = current.indexOf('1');
    if (firstOne === -1) break;
    if (current.length - firstOne < k) break;

    const active = current.slice(firstOne, firstOne + k);
    const tail = current.slice(firstOne + k);

    let xorRes = '';
    for (let i = 0; i < k; i++) {
      xorRes += active[i] === generator[i] ? '0' : '1';
    }

    const dividendLine = active + (tail ? ' ' + tail : '');
    const divisorLine = generator;
    const dividerLine = '-'.repeat(k);
    const resultLine = xorRes + (tail ? ' ' + tail : '');

    const afterXor = xorRes.slice(1) + tail;
    const nextOneIdx = afterXor.indexOf('1');

    let nextDividend = '';
    let explanation = '';
    let isComplete = false;

    if (nextOneIdx === -1) {
      isComplete = true;
      nextDividend = afterXor.slice(-(k - 1));
      explanation = 'All remaining bits are 0. Division is complete.';
    } else {
      const remainingFromNext = afterXor.slice(nextOneIdx);
      if (remainingFromNext.length >= k) {
        const nextActive = remainingFromNext.slice(0, k);
        const nextTail = remainingFromNext.slice(k);
        nextDividend = nextActive + (nextTail ? ' ' + nextTail : '');
        const shiftCount = 1 + nextOneIdx;
        explanation =
          shiftCount === 1
            ? 'Since the first bit is 0, shift right and bring down the next bit:'
            : `Shift right by ${shiftCount} bits to reach the next 1 and bring down next bits:`;
      } else {
        isComplete = true;
        nextDividend = remainingFromNext.padStart(k - 1, '0');
        explanation = `Remaining bits are fewer than divisor length (${k}). Division is complete.`;
      }
    }

    steps.push({
      step: stepNum,
      active,
      tail,
      dividendLine,
      divisorLine,
      dividerLine,
      resultLine,
      explanation,
      nextDividend,
      isComplete,
    });

    if (isComplete) break;
    current = afterXor.slice(nextOneIdx);
    stepNum++;
  }

  return steps;
}

export default function ErrorControl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'arq' ? 'arq' : 'crc';
  const [activeTab, setActiveTab] = useState(initialTab);

  // CRC
  const [dataBits, setDataBits] = useState('110101');
  const [generator, setGenerator] = useState('1011');
  const [corruptIndex, setCorruptIndex] = useState(3);
  const [applyCorruption, setApplyCorruption] = useState(false);
  const [crcEncodeResult, setCrcEncodeResult] = useState(null);
  const [crcVerifyResult, setCrcVerifyResult] = useState(null);
  const [crcLoading, setCrcLoading] = useState(false);
  const [crcStepIndex, setCrcStepIndex] = useState(0);
  const [showAllCrcSteps, setShowAllCrcSteps] = useState(false);

  // ARQ
  const [totalFrames, setTotalFrames] = useState(10);
  const [windowSize, setWindowSize] = useState(4);
  const [timeout, setTimeoutDuration] = useState(3.0);
  const [frameLoss, setFrameLoss] = useState(0.1);
  const [ackLoss, setAckLoss] = useState(0.05);
  const [arqResult, setArqResult] = useState(() =>
    simulateGoBackN({
      total_frames: 10,
      window_size: 4,
      timeout_duration: 3.0,
      frame_loss_prob: 0.1,
      ack_loss_prob: 0.05,
    })
  );
  const [arqLoading, setArqLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleComputeCRC = async (e) => {
    e?.preventDefault();
    setCrcLoading(true);
    try {
      const enc = await api.encodeCRC({ data_bits: dataBits, generator: generator });
      setCrcEncodeResult(enc.data);
      setCrcStepIndex(0);
      const ver = await api.verifyCRC({
        codeword: enc.data.codeword,
        generator: generator,
        corrupt_position: applyCorruption ? parseInt(corruptIndex) : null,
      });
      setCrcVerifyResult(ver.data);
    } catch (err) {
      console.warn('CRC API unavailable:', err);
    } finally {
      setCrcLoading(false);
    }
  };

  const handleRunARQ = async (e) => {
    e?.preventDefault();
    setArqLoading(true);
    try {
      const res = await api.runGoBackN({
        total_frames: parseInt(totalFrames),
        window_size: parseInt(windowSize),
        timeout_duration: parseFloat(timeout),
        frame_loss_prob: parseFloat(frameLoss),
        ack_loss_prob: parseFloat(ackLoss),
        corruption_prob: 0.05,
        random_seed: Math.floor(Math.random() * 10000),
      });
      setArqResult(res.data);
    } catch (err) {
      console.warn('Backend unavailable, using client-side Go-Back-N simulation engine:', err);
      const localResult = simulateGoBackN({
        total_frames: parseInt(totalFrames),
        window_size: parseInt(windowSize),
        timeout_duration: parseFloat(timeout),
        frame_loss_prob: parseFloat(frameLoss),
        ack_loss_prob: parseFloat(ackLoss),
        corruption_prob: 0.05,
      });
      setArqResult(localResult);
    } finally {
      setArqLoading(false);
    }
  };

  useEffect(() => {
    handleComputeCRC();
    handleRunARQ();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Error Control"
        subtitle="Cyclic Redundancy Check (CRC) verification and Go-Back-N ARQ sliding window pipelining."
        actions={
          <div className="flex bg-[#F5F7F5] p-1 rounded-lg text-xs font-semibold border border-[#E5E9E5]">
            <button
              onClick={() => handleTabChange('crc')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'crc' ? 'bg-[#064E3B] text-[#F8E7C9] font-bold shadow-xs' : 'text-[#747D77] hover:text-[#064E3B]'
              }`}
            >
              CRC-8 Detection
            </button>
            <button
              onClick={() => handleTabChange('arq')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'arq' ? 'bg-[#064E3B] text-[#F8E7C9] font-bold shadow-xs' : 'text-[#747D77] hover:text-[#064E3B]'
              }`}
            >
              Go-Back-N ARQ
            </button>
          </div>
        }
      />

      {/* CRC TAB */}
      {activeTab === 'crc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 text-xs space-y-3 shadow-xs">
            <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
              CRC Generator
            </span>

            <form onSubmit={handleComputeCRC} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Preset</label>
                <select
                  value={generator}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGenerator(val);
                    const found = CRC_PRESETS.find((p) => p.poly === val);
                    if (found?.defaultData) {
                      setDataBits(found.defaultData);
                    }
                  }}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 bg-[#F5F7F5] text-[#252B28] font-mono focus:border-[#064E3B] focus:outline-hidden"
                >
                  {CRC_PRESETS.map((p) => (<option key={p.name} value={p.poly}>{p.name}</option>))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Data Bits</label>
                <input
                  type="text"
                  value={dataBits}
                  onChange={(e) => setDataBits(e.target.value.replace(/[^01]/g, ''))}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Generator (G)</label>
                <input
                  type="text"
                  value={generator}
                  onChange={(e) => setGenerator(e.target.value.replace(/[^01]/g, ''))}
                  className="w-full border border-[#E5E9E5] rounded p-1.5 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>

              <div className="pt-2 border-t border-[#E5E9E5] space-y-2 text-[#252B28]">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={applyCorruption}
                    onChange={(e) => setApplyCorruption(e.target.checked)}
                    className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                  />
                  <span>Inject Bit Flip</span>
                </label>

                {applyCorruption && (
                  <div>
                    <div className="flex justify-between text-[11px] text-[#747D77]">
                      <span>Bit Index:</span>
                      <span className="font-mono font-bold text-[#064E3B]">{corruptIndex}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, dataBits.length + generator.length - 2)}
                      value={corruptIndex}
                      onChange={(e) => setCorruptIndex(parseInt(e.target.value))}
                      className="w-full accent-[#064E3B]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={crcLoading}
                className="w-full py-2 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-semibold text-xs flex items-center justify-center mt-2 shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 mr-1 text-[#F8E7C9]" />
                {crcLoading ? 'Evaluating...' : 'Encode & Verify'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {crcEncodeResult && crcVerifyResult && (
              <div className="space-y-4 text-xs">
                {/* Verdict Card */}
                <div className="p-3 bg-white rounded-lg border border-[#E5E9E5] flex justify-between items-center shadow-xs">
                  <div>
                    <div className={`font-bold text-sm ${crcVerifyResult.is_valid ? 'text-[#064E3B]' : 'text-[#252B28]'}`}>
                      {crcVerifyResult.is_valid ? 'Status: VALID (0 Errors Detected)' : 'Status: CORRUPTED (Errors Detected)'}
                    </div>
                    <div className="text-[#747D77] text-[11px]">
                      {crcVerifyResult.is_valid
                        ? 'Remainder is zero. Integrity verified.'
                        : `Non-zero remainder: ${crcVerifyResult.remainder}. Frame rejected.`}
                    </div>
                  </div>
                  <span className="font-mono font-bold bg-[#F5F7F5] px-2.5 py-1 rounded border border-[#E5E9E5] text-[#064E3B]">
                    Remainder: {crcVerifyResult.remainder}
                  </span>
                </div>

                {/* Bitstreams */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                  <div className="p-3 bg-white rounded-lg border border-[#E5E9E5] space-y-1.5 shadow-xs">
                    <span className="font-bold uppercase tracking-wider text-[#747D77] block font-sans text-[10px]">
                      Transmitter
                    </span>
                    <div className="text-[#252B28]">Data: <strong>{crcEncodeResult.data_bits}</strong></div>
                    <div className="text-[#252B28]">CRC Remainder: <strong className="text-[#064E3B]">{crcEncodeResult.remainder}</strong></div>
                    <div className="pt-1 border-t border-[#E5E9E5] text-[#252B28]">
                      Codeword: <strong>{crcEncodeResult.codeword}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[#E5E9E5] space-y-1.5 shadow-xs">
                    <span className="font-bold uppercase tracking-wider text-[#747D77] block font-sans text-[10px]">
                      Receiver
                    </span>
                    <div className="text-[#252B28]">Received: <strong>{crcVerifyResult.evaluated_codeword}</strong></div>
                    <div className="text-[#252B28]">Syndrome: <strong className="text-[#064E3B]">{crcVerifyResult.remainder}</strong></div>
                    <div className="pt-1 border-t border-[#E5E9E5] text-[#252B28]">
                      Verdict: <strong className={crcVerifyResult.is_valid ? 'text-[#064E3B]' : 'text-[#747D77]'}>
                        {crcVerifyResult.is_valid ? 'ACCEPTED' : 'REJECTED'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Textbook Modulo-2 Long Division Steps - Full List Only */}
                {(() => {
                  const textbookSteps = generateTextbookCRCSteps(
                    crcEncodeResult.appended_data,
                    crcEncodeResult.generator
                  );

                  return (
                    <div className="bg-white rounded-lg border border-[#E5E9E5] p-4 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E9E5]">
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[#252B28] text-xs block">
                            Modulo-2 Long Division Steps
                          </span>
                          <span className="text-[11px] text-[#747D77]">
                            Textbook binary long division with XOR shifts
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#F5F7F5] border border-[#E5E9E5] text-[#064E3B]">
                          {textbookSteps.length} Steps
                        </span>
                      </div>

                      {/* Complete Sequential List of All Steps */}
                      <div className="space-y-3.5">
                        {textbookSteps.map((step) => (
                          <div
                            key={step.step}
                            className="p-4 rounded-xl border border-[#E5E9E5] bg-[#F5F7F5] space-y-2.5 font-mono"
                          >
                            <div className="flex items-center justify-between font-sans border-b border-[#E5E9E5] pb-1.5">
                              <span className="font-bold text-xs bg-[#F8E7C9] text-[#064E3B] px-2 py-0.5 rounded border border-[#064E3B]/20 font-mono">
                                Step {step.step}
                              </span>
                              <span className="text-xs text-[#747D77]">
                                {step.isComplete ? 'Division Complete' : `Take ${step.divisorLine.length} bits`}
                              </span>
                            </div>

                            {/* Exact Long Division Alignment */}
                            <div className="p-3.5 bg-white rounded-lg border border-[#E5E9E5] text-[11px] sm:text-xs font-bold leading-relaxed tracking-widest text-[#252B28] space-y-0.5 overflow-x-auto whitespace-pre font-mono">
                              <div>{step.dividendLine}</div>
                              <div className="text-[#747D77]">{step.divisorLine}</div>
                              <div className="text-[#747D77] border-b border-[#E5E9E5] inline-block min-w-full">{step.dividerLine}</div>
                              <div>{step.resultLine}</div>
                            </div>

                            {!step.isComplete && step.nextDividend && (
                              <div className="font-mono font-bold text-xs bg-white p-2.5 rounded-lg border border-[#E5E9E5] text-[#064E3B] flex items-center justify-between">
                                <span className="text-[11px] font-sans text-[#747D77]">Next Dividend:</span>
                                <span>{step.nextDividend}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="p-4 bg-white rounded-xl border border-[#E5E9E5] text-xs space-y-1.5 font-sans">
                          <div className="font-bold text-[#252B28] uppercase tracking-wider text-[11px] pb-1 border-b border-[#E5E9E5]">
                            Division Summary
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[#747D77]">Final Remainder (CRC Checksum):</span>
                            <strong className="font-mono text-sm text-[#064E3B] bg-[#F5F7F5] px-2 py-0.5 rounded border border-[#E5E9E5]">
                              {crcEncodeResult.remainder}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#747D77]">Transmitted Codeword (Data + CRC):</span>
                            <strong className="font-mono text-[#064E3B]">
                              {crcEncodeResult.codeword}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARQ TAB */}
      {activeTab === 'arq' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Sliding Window Config Parameters */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E9E5] p-4 text-xs space-y-3.5 shadow-xs">
            <span className="font-bold uppercase tracking-wider text-[#252B28] block pb-2 border-b border-[#E5E9E5]">
              ARQ Protocol Parameters
            </span>

            <form onSubmit={handleRunARQ} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Total Frames (M)</label>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={totalFrames}
                    onChange={(e) => setTotalFrames(e.target.value)}
                    className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Window Size (N)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={windowSize}
                    onChange={(e) => setWindowSize(e.target.value)}
                    className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#747D77] font-semibold uppercase block mb-1">Timeout (Seconds)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="10.0"
                  value={timeout}
                  onChange={(e) => setTimeoutDuration(e.target.value)}
                  className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
                  required
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[#E5E9E5]">
                <div>
                  <div className="flex justify-between text-[10px] text-[#747D77] font-semibold uppercase">
                    <span>Frame Loss:</span>
                    <span className="font-mono text-[#064E3B] font-bold">{Math.round(frameLoss * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={frameLoss}
                    onChange={(e) => setFrameLoss(parseFloat(e.target.value))}
                    className="w-full mt-1 accent-[#064E3B]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-[#747D77] font-semibold uppercase">
                    <span>ACK Loss:</span>
                    <span className="font-mono text-[#064E3B] font-bold">{Math.round(ackLoss * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.4"
                    step="0.05"
                    value={ackLoss}
                    onChange={(e) => setAckLoss(parseFloat(e.target.value))}
                    className="w-full mt-1 accent-[#064E3B]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={arqLoading}
                className="w-full py-2.5 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-bold text-xs flex items-center justify-center mt-2 shadow-xs transition-colors cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 mr-1.5 text-[#F8E7C9] ${arqLoading ? 'animate-spin' : ''}`} />
                {arqLoading ? 'Simulating Go-Back-N...' : 'Run Simulation'}
              </button>
            </form>
          </div>

          {/* Right Column: Go-Back-N Visualizer Stage */}
          <div className="lg:col-span-8">
            <GoBackNSimulator
              simResult={arqResult}
              onReRun={handleRunARQ}
              isRunningNew={arqLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
