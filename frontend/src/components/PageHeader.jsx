import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 sm:pb-4 sm:mb-4 border-b border-[#E5E9E5] gap-3">
      <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-[#252B28] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-[#747D77] mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
