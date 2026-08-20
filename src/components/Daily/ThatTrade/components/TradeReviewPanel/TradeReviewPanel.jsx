import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/Common/base";
import TagField from "./TagField";
import RatingRow from "./RatingRow";
import ExecutionScaleControl from "./ExecutionScaleControl";
import { REVIEW_TAG_OPTIONS } from "../../constants/tradeConstants";

export default function TradeReviewPanel({
  trade,
  reviewMetrics = [],
  qualityScore,
  resultRating,
  executionScore,
  onSaveDraft,
}) {
  const [reviewValues, setReviewValues] = useState({
    stop_loss: trade?.stop_loss ?? "",
    take_profit: trade?.take_profit ?? "",
    setup: trade?.setup ?? "",
    mistakes: trade?.mistakes ?? "",
    custom_tags: trade?.custom_tags ?? "",
    trade_quality: trade?.trade_quality ?? "",
    trade_rating: trade?.trade_rating ?? "",
    execution_score: trade?.execution_score ?? "",
  });

  useEffect(() => {
    if (!trade) return;
    setReviewValues({
      stop_loss: trade.stop_loss ?? "",
      take_profit: trade.take_profit ?? "",
      setup: trade.setup ?? "",
      mistakes: trade.mistakes ?? "",
      custom_tags: trade.custom_tags ?? "",
      trade_quality: trade.trade_quality ?? "",
      trade_rating: trade.trade_rating ?? "",
      execution_score: trade.execution_score ?? "",
    });
  }, [
    trade?.unique_id,
    trade?.stop_loss,
    trade?.take_profit,
    trade?.setup,
    trade?.mistakes,
    trade?.custom_tags,
    trade?.trade_quality,
    trade?.trade_rating,
    trade?.execution_score,
  ]);

  const handleReviewValueChange = (field, value) => {
    setReviewValues((prev) => ({ ...prev, [field]: value }));
    if (onSaveDraft) {
      onSaveDraft({ [field]: value });
    }
  };

  const handleExecutionSave = (score) => {
    setReviewValues((prev) => ({ ...prev, execution_score: score }));
    if (onSaveDraft) {
      onSaveDraft({ execution_score: score });
    }
  };

  const currentQualityScore = qualityScore ?? Number(reviewValues.trade_quality) ?? 0;
  const currentResultRating = resultRating ?? Number(reviewValues.trade_rating) ?? 0;
  const currentExecutionScore = executionScore ?? Number(reviewValues.execution_score) ?? 0;

  return (
    <aside className="flex min-w-0 h-full flex-col gap-2.5 overflow-hidden max-lg:h-auto max-lg:overflow-visible">
      <Card variant="default" padding="sm" className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:overflow-visible">
        <CardHeader className="pb-2.5 mb-2.5">
          <CardTitle>Review &amp; Performance</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3.5 min-h-0 flex-none">
          <div className="flex flex-col">
            {reviewMetrics.map((metric) => (
              <div
                key={metric.label}
                className="flex min-w-0 items-center justify-between gap-1.5 py-1.5 border-b border-[var(--border-light)] last:border-b-0"
              >
                <span className="text-xs text-[var(--text-secondary)] font-normal">{metric.label}</span>
                {metric.field ? (
                  <label
                    className={`flex w-[132px] min-h-[34px] items-center gap-1.5 px-2.5 border border-[var(--border-medium)] rounded-[10px] bg-[var(--bg-card)] text-[var(--text-secondary)] ${
                      metric.tone === "profit"
                        ? "text-[var(--profit-color)]"
                        : metric.tone === "loss"
                        ? "text-[var(--loss-color)]"
                        : ""
                    } focus-within:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all`}
                  >
                    <input
                      className="w-full min-w-0 p-0 border-0 outline-none bg-transparent text-[var(--text-primary)] text-xs font-semibold text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      type="number"
                      min="0"
                      step="any"
                      value={metric.value}
                      placeholder="Enter price"
                      onChange={(event) => handleReviewValueChange(metric.field, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                      aria-label={metric.label}
                    />
                  </label>
                ) : (
                  <strong
                    className={`text-xs font-semibold whitespace-nowrap ${
                      metric.tone === "profit"
                        ? "text-[var(--profit-color)]"
                        : metric.tone === "loss"
                        ? "text-[var(--loss-color)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {metric.value}
                  </strong>
                )}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex flex-col gap-1">
            {[
              ["Setup", "setup", "setup"],
              ["Mistakes", "mistakes", "mistake"],
              ["Custom Tags", "custom_tags", "tag"],
            ].map(([label, field, tone]) => (
              <TagField
                key={field}
                label={label}
                value={reviewValues[field]}
                tone={tone}
                options={REVIEW_TAG_OPTIONS[field]}
                onChange={(value) => handleReviewValueChange(field, value)}
              />
            ))}
            <RatingRow
              label="Trade Quality"
              score={currentQualityScore}
              onChange={(score) => handleReviewValueChange("trade_quality", score)}
            />
            <RatingRow
              label="Trade Rating"
              score={currentResultRating}
              onChange={(score) => handleReviewValueChange("trade_rating", score)}
            />
          </div>
        </div>
        <ExecutionScaleControl
          score={currentExecutionScore}
          onSave={handleExecutionSave}
        />
      </Card>
    </aside>
  );
}
