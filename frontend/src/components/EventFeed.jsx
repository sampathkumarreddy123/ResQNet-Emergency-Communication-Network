import React from 'react';
import { Radio } from 'lucide-react';

export default function EventFeed({ events = [], maxItems = 12 }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6 bg-[#F5F7F5] rounded-lg border border-dashed border-[#E5E9E5] text-xs text-[#747D77]">
        No events recorded. Run a simulation to generate events.
      </div>
    );
  }

  const displayedEvents = events.slice(0, maxItems);

  return (
    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
      {displayedEvents.map((evt, idx) => (
        <div
          key={idx}
          className="p-2.5 rounded-lg bg-[#F5F7F5] border border-[#E5E9E5] text-xs text-[#252B28]"
        >
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-bold uppercase tracking-wider font-mono text-[#064E3B]">
              {evt.event_type}
            </span>
            <span className="font-mono text-[#747D77] text-[10px]">
              {typeof evt.timestamp === 'number' ? `${evt.timestamp.toFixed(2)}s` : evt.timestamp || 'Live'}
            </span>
          </div>
          <p className="text-[11px] text-[#747D77] leading-snug">
            {evt.description}
          </p>
        </div>
      ))}
    </div>
  );
}
