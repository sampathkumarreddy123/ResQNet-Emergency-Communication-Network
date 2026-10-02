import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-[#E5E9E5] gap-3">
      <div>
        <h1 className="text-lg font-bold text-[#252B28] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[#747D77] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}
