import React from "react";
import { dateFromEpoch, formatDisplayDate, formatDisplayTime } from "@/utils/trading/tradeTime";
import { formatCurrency } from "@/utils/user/Currency";
import { Tag } from "@/components/Common/base";
import { TagGroup, TagList } from "@/components/Common/base/tags/tags";

export const renderTradeTypeBadge = (value) => {
  const tradeType = String(value || "").trim().toLowerCase();
  const isBuy = tradeType.startsWith("buy");
  const isSell = tradeType.startsWith("sell");
  const typeLabel = tradeType ? tradeType.toUpperCase() : "--";

  const colorClasses = isBuy
    ? "bg-[var(--accent-success-soft)] text-[var(--accent-success-strong)] border-[color-mix(in_srgb,var(--accent-success)_30%,transparent)]"
    : isSell
    ? "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[color-mix(in_srgb,var(--accent-danger)_30%,transparent)]"
    : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-light)]";

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[42px] min-h-[21px] px-2 py-0.5 rounded-full border text-[11px] font-bold leading-none tracking-wide uppercase ${colorClasses}`}
    >
      {typeLabel}
    </span>
  );
};

export const renderRatingScale = (value) => {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value))));
  if (!Number.isFinite(Number(value))) return "--";

  return (
    <span
      className="inline-flex items-center gap-0.5 select-none"
      aria-label={`${rating} out of 5`}
      title={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={`text-[17px] leading-none ${
            step <= rating ? "text-[var(--accent-rating,#f59e0b)]" : "text-[var(--border-medium)]"
          }`}
        >
          ★
        </span>
      ))}
    </span>
  );
};

export const renderTags = (value, type = "neutral") => {
  if (value === null || value === undefined || value === "") return "--";

  const tagsList = Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : String(value).split(",").map((t) => t.trim()).filter(Boolean);

  if (tagsList.length === 0) return "--";

  const dotColorClass =
    type === "strategy"
      ? "text-fg-brand-primary"
      : type === "setup"
      ? "text-fg-success-secondary"
      : type === "mistake"
      ? "text-fg-error-primary"
      : "text-fg-tertiary";

  return (
    <TagGroup label="Trade Tags" size="sm">
      <TagList className="flex flex-wrap gap-1">
        {tagsList.map((tag, idx) => (
          <Tag key={idx} id={`tag-${type}-${idx}`} dot dotClassName={dotColorClass}>
            {tag.replaceAll("_", " ")}
          </Tag>
        ))}
      </TagList>
    </TagGroup>
  );
};

export const formatDateTime = (value) =>
  dateFromEpoch(value)
    ? `${formatDisplayDate(value)} ${formatDisplayTime(value)}`
    : "--";

export const displayValue = (value) =>
  value === null || value === undefined || value === ""
    ? "--"
    : String(value).replaceAll("_", " ");

export const formatOptionalCurrency = (value, currencyCode) =>
  Number.isFinite(Number(value))
    ? formatCurrency(Number(value), currencyCode)
    : "--";

export const formatDuration = (trade) => {
  if (!trade) return "--";
  const start = dateFromEpoch(trade.entryAt || trade.entry_timestamp);
  const end = dateFromEpoch(trade.exitAt || trade.exit_timestamp);
  if (!start || !end || end < start) return "--";
  const minutes = Math.floor((end - start) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
