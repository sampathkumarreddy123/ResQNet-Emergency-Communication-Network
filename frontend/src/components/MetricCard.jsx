import React from 'react';

export default function MetricCard({ title, value, unit = '', icon: Icon }) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E9E5] hover:border-[#B8C7BD] p-3.5 flex flex-col justify-between shadow-xs transition-all">
      <div className="flex items-center justify-between text-[#747D77]">
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-6 h-6 rounded flex items-center justify-center bg-[#F8E7C9] text-[#064E3B]">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline">
        <span className="text-xl font-bold text-[#064E3B]">{value}</span>
        {unit && <span className="ml-1 text-xs text-[#747D77] font-mono">{unit}</span>}
      </div>
    </div>
  );
}
