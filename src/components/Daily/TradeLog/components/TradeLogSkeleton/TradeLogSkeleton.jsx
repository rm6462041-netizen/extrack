import React from "react";

export const SkeletonHeader = () => (
  <div className="relative z-10 mb-1">
    <div className="flex justify-between items-center gap-3.5 flex-wrap w-full min-h-[68px]">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="w-32 h-8 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse ml-3" />
        </div>
        <div className="w-64 h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-2" />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="w-24 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="w-36 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="w-24 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    </div>
  </div>
);

export const SkeletonTableRow = () => (
  <tr className="border-b border-[var(--border-light)]">
    <td className="p-3 px-4"><div className="w-20 h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" /></td>
    <td className="p-3 px-4"><div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" /></td>
    <td className="p-3 px-4"><div className="w-14 h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" /></td>
    <td className="p-3 px-4"><div className="w-16 h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" /></td>
    <td className="p-3 px-4"><div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" /></td>
  </tr>
);

export const SkeletonTable = () => (
  <div className="w-full flex-1 min-h-0 border border-[var(--border-medium)] dark:border-white/10 rounded-xl flex flex-col bg-[var(--bg-card)] shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden mt-1">
    <div className="min-h-0 flex-1 overflow-auto flex flex-col custom-scrollbar">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-medium)]">
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Symbol</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Date</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Type</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">P&amp;L</th>
            <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px]">Strategy</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, index) => (
            <SkeletonTableRow key={index} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const TradeLogSkeleton = () => (
  <>
    <SkeletonHeader />
    <SkeletonTable />
  </>
);

export default TradeLogSkeleton;
