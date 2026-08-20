import React, { useState, useEffect } from "react";
import LegacyIcon from "@/components/Common/LegacyIcon/LegacyIcon";
import { Card, CardHeader, CardTitle, Tag } from "@/components/Common/base";
import { TagGroup, TagList } from "@/components/Common/base/tags/tags";
import { useAppDialog } from "@/context/AppDialogContext";
import TradeStrategyModal from "../modals/TradeStrategyModal";
import { QUICK_STRATEGIES } from "../../constants/tradeConstants";

export default function TradeStrategySection({ trade, onSaveDraft }) {
  const { notify } = useAppDialog();
  const [strategy, setStrategy] = useState(trade?.strategy || "");
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStrategy(trade?.strategy || "");
  }, [trade?.strategy]);

  const saveStrategy = async () => {
    if (!strategy) return;
    setIsSaving(true);
    try {
      if (onSaveDraft) {
        onSaveDraft({ strategy });
      }
      setShowStrategyModal(false);
      notify("Strategy updated.", "success");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuickStrategy = (strategyText) => {
    setStrategy((prev) => (prev ? prev + "\n" + strategyText : strategyText));
  };

  return (
    <>
      <Card variant="default" padding="sm" className="mb-3">
        <CardHeader className="pb-2.5 mb-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <CardTitle className="flex items-center gap-1.5">
            <LegacyIcon className="fas fa-chess-board" /> Strategy
          </CardTitle>
          <button
            className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all hover:-translate-y-0.5 cursor-pointer max-sm:self-end"
            onClick={() => setShowStrategyModal(true)}
          >
            <LegacyIcon className={strategy ? "fas fa-edit" : "fas fa-plus"} />{" "}
            {strategy ? "Edit" : "Add"}
          </button>
        </CardHeader>
        <div
          className={`bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg p-2.5 text-xs leading-relaxed cursor-pointer transition-all min-h-[52px] max-h-[96px] overflow-y-auto text-[var(--text-primary)] hover:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            !strategy ? "text-[var(--text-secondary)] italic flex items-center justify-center" : ""
          }`}
          onClick={() => setShowStrategyModal(true)}
        >
          {strategy ? (
            <TagGroup label="Strategy" size="md">
              <TagList className="flex flex-wrap gap-1">
                {strategy
                  .split("\n")
                  .flatMap((s) => s.split(","))
                  .map((st) => st.trim())
                  .filter(Boolean)
                  .map((st, idx) => (
                    <Tag
                      key={idx}
                      id={`strat-${idx}`}
                      dot
                      dotClassName="text-fg-brand-primary"
                    >
                      {st}
                    </Tag>
                  ))}
              </TagList>
            </TagGroup>
          ) : (
            "Click to add strategy"
          )}
        </div>
      </Card>

      <TradeStrategyModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        strategy={strategy}
        setStrategy={setStrategy}
        onSave={saveStrategy}
        isSaving={isSaving}
        quickStrategies={QUICK_STRATEGIES}
        onAddQuickStrategy={addQuickStrategy}
      />
    </>
  );
}
