import React from "react";
import LegacyIcon from "@/components/Common/LegacyIcon/LegacyIcon";
import { Tag } from "@/components/Common/base";
import { TagGroup, TagList } from "@/components/Common/base/tags/tags";

export default function TradeStrategyModal({
  isOpen,
  onClose,
  strategy,
  setStrategy,
  onSave,
  isSaving,
  quickStrategies = [],
  onAddQuickStrategy,
}) {
  if (!isOpen) return null;

  const handleAddQuickStrategy = (item) => {
    if (onAddQuickStrategy) {
      onAddQuickStrategy(item);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--overlay-backdrop)] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-[var(--border-medium)] bg-[var(--bg-card)] sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] m-0 flex items-center gap-2.5">
            <LegacyIcon className="fas fa-chess-board text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)]" /> Trading Strategy
          </h3>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-2xl leading-none text-[var(--text-secondary)] hover:text-[var(--loss-color)] hover:bg-[var(--accent-danger-soft)] transition-all hover:rotate-90 cursor-pointer p-0 bg-transparent border-0" onClick={onClose}>×</button>
        </div>
        <div className="p-6">
          {/* Quick Strategies */}
          <div className="mb-6 pb-6 border-b border-[var(--border-medium)]">
            {quickStrategies.map((category, idx) => (
              <div key={idx} className="mb-5 last:mb-0">
                <div className="text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wide font-semibold">{category.category}</div>
                <TagGroup label={category.category} size="sm">
                  <TagList className="flex flex-wrap gap-1 mt-1">
                    {category.items.map((item, i) => (
                      <Tag
                        key={i}
                        id={`quick-${idx}-${i}`}
                        dot
                        dotClassName="text-fg-brand-primary"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleAddQuickStrategy(item)}
                      >
                        {item}
                      </Tag>
                    ))}
                  </TagList>
                </TagGroup>
              </div>
            ))}
          </div>

          {/* Custom Strategy Input */}
          <div className="mb-6">
            <label className="block mb-2.5 text-sm font-medium text-[var(--text-primary)]">Custom Strategy:</label>
            <textarea
              className="w-full p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] resize-y transition-all"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="Describe your trading strategy..."
              rows={6}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-4 pt-4 border-t border-[var(--border-light)]">
            <button className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--surface-muted)] transition-all cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="px-4 py-2 text-xs font-medium text-[var(--button-text)] bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:opacity-90 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Strategy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
