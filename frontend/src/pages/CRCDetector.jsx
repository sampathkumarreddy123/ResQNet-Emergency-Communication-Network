import React, { useState } from 'react';
import {
  Binary,
  CheckCircle2,
  XCircle,
  Play,
  ListTree,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import api from '../services/api';

const CRC_PRESETS = [
  { name: 'Textbook Example (1011)', poly: '1011', defaultData: '110101' },
  { name: 'CRC-4 (x^4 + x + 1)', poly: '10011', defaultData: '1101011011' },
  { name: 'CRC-8 (ATM / x^8 + x^2 + x + 1)', poly: '100000111', defaultData: '1101011011' },
  { name: 'CRC-16 (ANSI / x^16 + x^15 + x^2 + 1)', poly: '11000000000000101', defaultData: '1101011011' },
  { name: 'CRC-CCITT (x^16 + x^12 + x^5 + 1)', poly: '10001000000100001', defaultData: '1101011011' },
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

export default function CRCDetector() {
  const [dataBits, setDataBits] = useState('110101');
  const [generator, setGenerator] = useState('1011');
  const [corruptIndex, setCorruptIndex] = useState(3);
  const [applyCorruption, setApplyCorruption] = useState(false);

  const [encodeResult, setEncodeResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const handleCompute = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const enc = await api.encodeCRC({ data_bits: dataBits, generator: generator });
      setEncodeResult(enc.data);

      const verPayload = {
        codeword: enc.data.codeword,
        generator: generator,
        corrupt_position: applyCorruption ? parseInt(corruptIndex) : null,
      };
      const ver = await api.verifyCRC(verPayload);
      setVerifyResult(ver.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cyclic Redundancy Check (CRC) Error Detection"
        subtitle="Mathematical modulo-2 binary polynomial division using XOR logic to verify frame integrity across noisy emergency communication channels."
        badge="Data Link Layer Error Detection"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Interactive Inputs Form */}
        <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 shadow-xs">
          <h2 className="text-xs font-bold text-[#252B28] uppercase tracking-wider mb-4">
            Frame Parameters
          </h2>

          <form onSubmit={handleCompute} className="space-y-3.5 text-xs">
            {/* Presets */}
            <div>
              <label className="text-[10px] font-bold text-[#747D77] uppercase block mb-1">
                Generator Presets
              </label>
              <select
                onChange={(e) => setGenerator(e.target.value)}
                value={generator}
                className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono text-[11px] bg-[#F5F7F5] text-[#252B28] focus:border-[#064E3B] focus:outline-hidden"
              >
                {CRC_PRESETS.map((p) => (
                  <option key={p.name} value={p.poly}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Bits */}
            <div>
              <label className="text-[10px] font-bold text-[#747D77] uppercase block mb-1">
                Data Bits (Binary)
              </label>
              <input
                type="text"
                value={dataBits}
                onChange={(e) => setDataBits(e.target.value.replace(/[^01]/g, ''))}
                placeholder="e.g. 1101011011"
                className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono text-sm tracking-wider text-[#252B28] bg-[#F5F7F5] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
              <span className="text-[10px] text-[#747D77] mt-1 block">Length: {dataBits.length} bits</span>
            </div>

            {/* Generator Polynomial */}
            <div>
              <label className="text-[10px] font-bold text-[#747D77] uppercase block mb-1">
                Generator Polynomial (G)
              </label>
              <input
                type="text"
                value={generator}
                onChange={(e) => setGenerator(e.target.value.replace(/[^01]/g, ''))}
                placeholder="e.g. 10011"
                className="w-full border border-[#E5E9E5] rounded-lg p-2 font-mono text-sm tracking-wider text-[#252B28] bg-[#F5F7F5] focus:border-[#064E3B] focus:outline-hidden"
                required
              />
              <span className="text-[10px] text-[#747D77] mt-1 block">
                Degree r = {generator.length - 1} (appends {generator.length - 1} zeros)
              </span>
            </div>

            {/* Error Injection Toggle */}
            <div className="pt-3 border-t border-[#E5E9E5] space-y-2 text-[#252B28]">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyCorruption}
                  onChange={(e) => setApplyCorruption(e.target.checked)}
                  className="rounded text-[#064E3B] focus:ring-[#064E3B]"
                />
                <span className="font-semibold text-[#252B28]">Inject Bit Corruption</span>
              </label>

              {applyCorruption && (
                <div className="pl-5 space-y-1">
                  <div className="flex justify-between text-[11px] text-[#747D77]">
                    <span>Bit Position to Flip:</span>
                    <strong className="font-mono text-[#064E3B]">Index {corruptIndex}</strong>
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

            {errorMsg && (
              <div className="p-2.5 rounded bg-[#F5F7F5] border border-[#E5E9E5] text-[#252B28] text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-[#064E3B] hover:bg-[#183B32] text-white font-bold text-xs flex items-center justify-center transition-all mt-2 cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 text-[#F8E7C9]" />
              {loading ? 'Evaluating...' : 'Encode & Verify Codeword'}
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Mathematical Division & Verification Results */}
        <div className="lg:col-span-2 space-y-6">
          {encodeResult && verifyResult ? (
            <div className="space-y-6">
              {/* Verification Outcome Banner */}
              <div className="p-4 rounded-xl border border-[#E5E9E5] bg-white flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2.5">
                  {verifyResult.is_valid ? (
                    <CheckCircle2 className="w-5 h-5 text-[#064E3B] shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#747D77] shrink-0" />
                  )}
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${verifyResult.is_valid ? 'text-[#064E3B]' : 'text-[#252B28]'}`}>
                      {verifyResult.is_valid
                        ? '[VERIFIED: 0 TRANSMISSION ERRORS]'
                        : '[CRC ERROR DETECTED: FRAME CORRUPTED]'}
                    </h3>
                    <p className="text-[11px] text-[#747D77] mt-0.5">
                      {verifyResult.is_valid
                        ? 'Modulo-2 verification remainder is all zeros. Codeword accepted.'
                        : `Syndrome remainder non-zero (${verifyResult.remainder}). Go-Back-N ARQ must retransmit frame.`}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-xs text-[#064E3B]">
                  Remainder: {verifyResult.remainder}
                </div>
              </div>

              {/* Codeword Bitstream Matrix */}
              <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 space-y-3 shadow-xs">
                <h3 className="text-xs font-bold text-[#747D77] uppercase tracking-wider pb-2 border-b border-[#E5E9E5]">
                  Codeword Bitstream Analysis
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Sender Side */}
                  <div className="p-3.5 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] space-y-2">
                    <span className="font-bold text-[#747D77] uppercase block font-sans text-[10px]">
                      Sender Side (Encoding)
                    </span>
                    <div>
                      <span className="text-[#747D77]">Payload Data (D):</span>
                      <div className="font-bold text-[#252B28] tracking-wider mt-0.5">
                        {encodeResult.data_bits}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#747D77]">CRC Checksum (R):</span>
                      <div className="font-bold text-[#064E3B] tracking-wider mt-0.5">
                        {encodeResult.remainder}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#E5E9E5]">
                      <span className="text-[#747D77]">Codeword (D + R):</span>
                      <div className="font-bold text-[#252B28] tracking-wider mt-0.5">
                        <span>{encodeResult.data_bits}</span>
                        <span className="underline decoration-[#064E3B] decoration-2 text-[#064E3B]">{encodeResult.remainder}</span>
                      </div>
                    </div>
                  </div>

                  {/* Receiver Side */}
                  <div className="p-3.5 rounded-lg bg-white border border-[#E5E9E5] space-y-2">
                    <span className="font-bold text-[#747D77] uppercase block font-sans text-[10px]">
                      Receiver Side (Verification)
                    </span>
                    <div>
                      <span className="text-[#747D77]">Received Frame:</span>
                      <div className="font-bold tracking-wider mt-0.5">
                        {verifyResult.evaluated_codeword?.split('').map((bit, idx) => (
                          <span
                            key={idx}
                            className={
                              applyCorruption && idx === corruptIndex
                                ? 'border border-[#064E3B] bg-[#F8E7C9] px-1 rounded font-black text-[#064E3B]'
                                : 'text-[#252B28]'
                            }
                          >
                            {bit}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#747D77]">Verification Syndrome:</span>
                      <div className="font-bold tracking-wider mt-0.5 text-[#064E3B]">
                        {verifyResult.remainder}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#E5E9E5] flex justify-between items-center font-sans">
                      <span className="text-[#747D77] text-[11px]">Verdict:</span>
                      <strong className={`font-mono text-xs ${verifyResult.is_valid ? 'text-[#064E3B]' : 'text-[#747D77]'}`}>
                        {verifyResult.is_valid ? '[PASSED: 0 ERRORS]' : '[FAILED: CORRUPTED]'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Textbook Modulo-2 Long Division Steps - Full List Only */}
              {(() => {
                const textbookSteps = generateTextbookCRCSteps(
                  encodeResult.appended_data,
                  encodeResult.generator
                );

                return (
                  <div className="bg-white rounded-xl border border-[#E5E9E5] p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E5]">
                      <div className="flex items-center space-x-1.5">
                        <ListTree className="w-4 h-4 text-[#064E3B]" />
                        <h3 className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
                          Modulo-2 Long Division Steps
                        </h3>
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

                          <div className="text-xs font-sans text-[#747D77]">
                            {step.step === 1
                              ? `Take the first ${step.divisorLine.length} bits:`
                              : `Now use the next ${step.divisorLine.length} bits starting at the first 1:`}
                          </div>

                          {/* Exact Long Division Alignment */}
                          <div className="p-3.5 bg-white rounded-lg border border-[#E5E9E5] text-xs font-bold leading-relaxed tracking-widest text-[#252B28] space-y-0.5">
                            <div>{step.dividendLine}</div>
                            <div className="text-[#747D77]">{step.divisorLine}</div>
                            <div className="text-[#747D77] border-b border-[#E5E9E5] inline-block w-full">{step.dividerLine}</div>
                            <div>{step.resultLine}</div>
                          </div>

                          {/* Shift / Transition explanation */}
                          <div className="text-xs font-sans space-y-1.5 pt-0.5">
                            <p className="text-[#747D77]">{step.explanation}</p>
                            {!step.isComplete && step.nextDividend && (
                              <div className="font-mono font-bold text-xs bg-white p-2.5 rounded-lg border border-[#E5E9E5] text-[#064E3B]">
                                {step.nextDividend}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="p-4 bg-white rounded-xl border border-[#E5E9E5] text-xs space-y-1.5 font-sans">
                        <div className="font-bold text-[#252B28] uppercase tracking-wider text-[11px] pb-1 border-b border-[#E5E9E5]">
                          Division Summary
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[#747D77]">Final Remainder (CRC Checksum):</span>
                          <strong className="font-mono text-sm text-[#064E3B] bg-[#F5F7F5] px-2 py-0.5 rounded border border-[#E5E9E5]">
                            {encodeResult.remainder}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#747D77]">Transmitted Codeword (Data + CRC):</span>
                          <strong className="font-mono text-[#064E3B]">
                            {encodeResult.codeword}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E9E5] p-12 text-center shadow-xs">
              <Binary className="w-8 h-8 text-[#747D77] mx-auto mb-2 opacity-60" />
              <h3 className="text-xs font-bold text-[#252B28] uppercase">Ready to Compute CRC</h3>
              <p className="text-xs text-[#747D77] max-w-sm mx-auto mt-1">
                Enter your binary frame and generator polynomial, optionally inject bit corruption to test receiver error detection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
