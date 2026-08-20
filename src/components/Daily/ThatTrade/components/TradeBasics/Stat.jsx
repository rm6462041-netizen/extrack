import React from "react";

export const Stat = ({ label, value, highlight, className = "" }) => (
  <div
    className={`flex items-center justify-between min-w-0 py-1.5 border-b border-[var(--border-light)] last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] hover:px-2 hover:rounded-md max-sm:flex-col max-sm:items-start max-sm:gap-1 ${className}`}
  >
    <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
    <span
      className={`text-xs font-semibold text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap max-sm:self-end ${
        highlight ? "px-3 py-1 rounded-full font-semibold" : ""
      }`}
    >
      {value}
    </span>
  </div>
);

export default Stat;
