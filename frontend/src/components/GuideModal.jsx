import React from 'react';
import {
  X,
  Radio,
  GitFork,
  ShieldCheck,
  Filter,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  Flame,
  Truck,
  ShieldAlert
} from 'lucide-react';

export default function GuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full border border-[#E5E9E5] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#064E3B] text-white p-4 sm:p-6 relative border-b border-[#183B32]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start sm:items-center space-x-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#183B32] border border-[#F8E7C9]/30 flex items-center justify-center shadow-inner shrink-0 mt-0.5 sm:mt-0">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-[#F8E7C9]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#F8E7C9] text-[#064E3B]">
                    System Guide & Concept Explainer
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                  How ResQNet Operates
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-[#F5F7F5]/90 mt-2 max-w-2xl leading-relaxed">
            In natural disasters (earthquakes, cyclones, floods), conventional cellular towers and fiber optics fail. 
            ResQNet demonstrates how an ad-hoc emergency mesh network safely delivers critical SOS distress alerts.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
          {/* Quick Real-World Scenario Banner */}
          <div className="bg-[#F5F7F5] border border-[#E5E9E5] rounded-xl p-4 flex items-start space-x-3.5">
            <ShieldAlert className="w-6 h-6 text-[#064E3B] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-[#252B28]">The Real-World Disaster Scenario</h3>
              <p className="text-xs text-[#747D77] mt-1 leading-relaxed">
                A command center needs to send evacuation alerts and receive victim telemetry from field units (Police, Fire Squads, Ambulances, Relief Shelters). However, links get severed by debris, bad weather creates radio noise, and mass alerts cause network bottlenecks.
              </p>
            </div>
          </div>

          {/* 4 Core Pillars Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#747D77] mb-3 flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#064E3B]" />
              <span>The 4 Essential Pillars Demonstrated Here</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pillar 1 */}
              <div className="bg-[#F5F7F5] border border-[#E5E9E5] rounded-xl p-4.5 hover:border-[#064E3B] transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D9E5DC] border border-[#B8C7BD] text-[#064E3B] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#252B28] flex items-center">
                      <GitFork className="w-4 h-4 text-[#064E3B] mr-1.5" />
                      Dynamic Routing & Self-Healing
                    </h4>
                    <span className="text-[11px] font-semibold text-[#064E3B]">Dijkstra & Distance Vector</span>
                  </div>
                </div>
                <p className="text-xs text-[#747D77] leading-relaxed">
                  When a road collapses or a relay tower loses power, Dijkstra calculates the shortest delay path, while Distance Vector converges across distributed routers to instantly reroute packets via surviving nodes.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="bg-[#F5F7F5] border border-[#E5E9E5] rounded-xl p-4.5 hover:border-[#064E3B] transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D9E5DC] border border-[#B8C7BD] text-[#064E3B] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#252B28] flex items-center">
                      <ShieldCheck className="w-4 h-4 text-[#064E3B] mr-1.5" />
                      Error Detection
                    </h4>
                    <span className="text-[11px] font-semibold text-[#064E3B]">Cyclic Redundancy Check (CRC-8)</span>
                  </div>
                </div>
                <p className="text-xs text-[#747D77] leading-relaxed">
                  Harsh storms introduce electromagnetic noise that corrupts digital bits. CRC attaches a polynomial checksum remainder. At the destination, any bit flip produces a non-zero remainder, catching corruption immediately.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="bg-[#F5F7F5] border border-[#E5E9E5] rounded-xl p-4.5 hover:border-[#064E3B] transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D9E5DC] border border-[#B8C7BD] text-[#064E3B] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#252B28] flex items-center">
                      <Activity className="w-4 h-4 text-[#064E3B] mr-1.5" />
                      Automatic Retransmission
                    </h4>
                    <span className="text-[11px] font-semibold text-[#064E3B]">Go-Back-N ARQ Sliding Window</span>
                  </div>
                </div>
                <p className="text-xs text-[#747D77] leading-relaxed">
                  When a packet is lost in transit or rejected due to CRC corruption, Go-Back-N uses a sliding window (size N=4) and timeouts to automatically retransmit unacknowledged packets until 100% reception is confirmed.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="bg-[#F5F7F5] border border-[#E5E9E5] rounded-xl p-4.5 hover:border-[#064E3B] transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#D9E5DC] border border-[#B8C7BD] text-[#064E3B] flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#252B28] flex items-center">
                      <Filter className="w-4 h-4 text-[#064E3B] mr-1.5" />
                      Congestion Traffic Shaping
                    </h4>
                    <span className="text-[11px] font-semibold text-[#064E3B]">Leaky Bucket Algorithm</span>
                  </div>
                </div>
                <p className="text-xs text-[#747D77] leading-relaxed">
                  During an earthquake, thousands of field radios broadcast simultaneously. The Leaky Bucket buffers sudden bursts and leaks packets out at a constant, safe transmission rate, preventing bottleneck buffers from crashing.
                </p>
              </div>
            </div>
          </div>

          {/* Step-by-Step Exploration Guide */}
          <div className="bg-[#183B32] text-white rounded-xl p-5 border border-[#064E3B]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F8E7C9] mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-1.5 text-[#F8E7C9]" />
              How to Test and Demonstrate This Website in 3 Clicks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#064E3B]/70 rounded-lg p-3 border border-[#064E3B]">
                <div className="text-[10px] font-bold text-[#F8E7C9] uppercase tracking-wider mb-1">Step 1</div>
                <div className="text-xs font-bold text-white">Click a Quick Scenario</div>
                <p className="text-[11px] text-[#D9E5DC] mt-1">
                  On the Dashboard, click <strong>"Normal Run"</strong>, <strong>"Congestion"</strong>, or <strong>"Error Recovery"</strong> to run an instant full-stack test.
                </p>
              </div>

              <div className="bg-[#064E3B]/70 rounded-lg p-3 border border-[#064E3B]">
                <div className="text-[10px] font-bold text-[#F8E7C9] uppercase tracking-wider mb-1">Step 2</div>
                <div className="text-xs font-bold text-white">Break a Link & Reroute</div>
                <p className="text-[11px] text-[#D9E5DC] mt-1">
                  Go to <strong>Routing</strong> or <strong>Topology</strong>, disable a link between nodes, and observe how the backup detour is calculated.
                </p>
              </div>

              <div className="bg-[#064E3B]/70 rounded-lg p-3 border border-[#064E3B]">
                <div className="text-[10px] font-bold text-[#F8E7C9] uppercase tracking-wider mb-1">Step 3</div>
                <div className="text-xs font-bold text-white">Review QoS Analytics</div>
                <p className="text-[11px] text-[#D9E5DC] mt-1">
                  Visit <strong>Analytics</strong> to see Delivery Ratio (%), Throughput, and End-to-End Latency charted with dynamic mathematical calculations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#F5F7F5] border-t border-[#E5E9E5] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-[#747D77] font-medium text-center sm:text-left">
            ResQNet — Emergency Communication Network Simulation
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold bg-[#064E3B] hover:bg-[#183B32] text-white transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Got It, Let's Explore!</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 text-[#F8E7C9]" />
          </button>
        </div>
      </div>
    </div>
  );
}
