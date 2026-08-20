import React, { memo } from "react";
import SymbolWithIcon from "@/components/Common/SymbolWithIcon/SymbolWithIcon";
import { Checkbox } from "@/components/Common/base";
import {
  formatDisplayDate,
  formatDisplayTime,
  getTradeDisplayDate,
  getTradeDisplayTime,
} from "@/utils/trading/tradeTime";
import {
  formatDirection,
  formatQuantity,
  formatTradeMoney,
} from "@/utils/trading/tradePresentation";
import { formatTradePrice } from "@/utils/trading/tradeCalculations";
import {
  renderTradeTypeBadge,
  renderRatingScale,
  renderTags,
  formatOptionalCurrency,
  formatDuration,
  displayValue,
} from "./TradeLogCellRenderers";
import TradeLogRowActions from "./TradeLogRowActions";

export const TradeLogTableRow = memo(function TradeLogTableRow({
  trade,
  _index,
  isSelected = false,
  onToggleSelect,
  onRowClick,
  visibleColumns = {},
  currencyCode = "USD",
  openActionMenuId,
  onOpenEdit,
  onCopy,
  onDownload,
  onDelete,
}) {
  if (!trade) return null;

  const pnl = Number(trade.pnl) || 0;
  const tradeDate = getTradeDisplayDate(trade);
  const statusTone = pnl > 0 ? "success" : pnl < 0 ? "error" : "gray";
  const statusLabel = pnl > 0 ? "Active" : pnl < 0 ? "Loss" : "Breakeven";
  const statusClasses =
    statusTone === "success"
      ? "bg-[var(--accent-success-soft)] text-[var(--accent-success-strong)] border-[color-mix(in_srgb,var(--accent-success)_30%,transparent)]"
      : statusTone === "error"
      ? "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[color-mix(in_srgb,var(--accent-danger)_30%,transparent)]"
      : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border-light)]";

  const pnlBadgeClass =
    pnl > 0
      ? "bg-[var(--accent-success-soft)] text-[var(--profit-color)] font-bold"
      : pnl < 0
      ? "bg-[var(--accent-danger-soft)] text-[var(--loss-color)] font-bold"
      : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-light)] font-semibold";

  return (
    <tr
      onClick={(e) => {
        if (!e.target.closest("[data-actions-cell]")) {
          if (onRowClick) onRowClick(trade);
        }
      }}
      className={`group border-b border-[var(--border-light)] cursor-pointer transition-colors duration-100 hover:bg-slate-500/5 ${
        isSelected ? "bg-[var(--surface-muted)]" : "bg-[var(--bg-card)]"
      } ${openActionMenuId === trade.unique_id ? "relative z-20 bg-slate-500/5" : ""}`}
    >
      <td
        className="w-9 min-w-[36px] max-w-[36px] px-1 py-2.5 text-center sticky left-0 z-11 bg-inherit shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            isSelected={isSelected}
            onChange={() => onToggleSelect && onToggleSelect(trade)}
            aria-label={`Select trade ${trade.symbol || ""}`}
          />
        </div>
      </td>

      {visibleColumns.symbol && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          <SymbolWithIcon symbol={trade.symbol} size="lg" />
        </td>
      )}

      {visibleColumns.date && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          <div className="flex flex-col gap-0.5">
            <div className="font-semibold text-[var(--text-primary)]">{formatDisplayDate(tradeDate)}</div>
            <small className="block text-[11px] font-medium text-[var(--text-muted)]">{formatDisplayTime(tradeDate)}</small>
          </div>
        </td>
      )}

      {visibleColumns.type && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderTradeTypeBadge(formatDirection(trade))}
        </td>
      )}

      <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none whitespace-nowrap border ${statusClasses}`}>
          <span className="size-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
      </td>

      {visibleColumns.pnl && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs leading-tight tracking-wide whitespace-nowrap ${pnlBadgeClass}`}>
            {formatTradeMoney(
              pnl,
              trade.pnlCurrency || trade.pnl_currency,
              currencyCode
            )}
          </span>
        </td>
      )}

      {visibleColumns.entry && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatOptionalCurrency(
            trade.entryPrice || trade.entry_price,
            trade.pnlCurrency || trade.pnl_currency
          )}
        </td>
      )}
      {visibleColumns.exit && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatOptionalCurrency(
            trade.exitPrice || trade.exit_price,
            trade.pnlCurrency || trade.pnl_currency
          )}
        </td>
      )}
      {visibleColumns.quantity && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatQuantity(trade.quantity || trade.amount)}
        </td>
      )}
      {visibleColumns.entryTime && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {getTradeDisplayTime(trade.entryAt || trade.entry_timestamp)}
        </td>
      )}
      {visibleColumns.exitTime && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {getTradeDisplayTime(trade.exitAt || trade.exit_timestamp)}
        </td>
      )}
      {visibleColumns.duration && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatDuration(trade)}
        </td>
      )}
      {visibleColumns.category && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.category)}
        </td>
      )}
      {visibleColumns.productType && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.productType || trade.product_type)}
        </td>
      )}
      {visibleColumns.source && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.source)}
        </td>
      )}
      {visibleColumns.platform && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.platform)}
        </td>
      )}
      {visibleColumns.account && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.account)}
        </td>
      )}
      {visibleColumns.broker && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.broker)}
        </td>
      )}
      {visibleColumns.grossPnl && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatTradeMoney(
            trade.grossPnl || trade.gross_pnl,
            trade.pnlCurrency || trade.pnl_currency
          )}
        </td>
      )}
      {visibleColumns.netPnl && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatTradeMoney(
            trade.netPnl || trade.net_pnl,
            trade.pnlCurrency || trade.pnl_currency
          )}
        </td>
      )}
      {visibleColumns.fees && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatTradeMoney(
            trade.fees || trade.commission,
            trade.pnlCurrency || trade.pnl_currency
          )}
        </td>
      )}
      {visibleColumns.stopLoss && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatTradePrice(
            trade.stopLoss || trade.stop_loss,
            trade.symbol
          )}
        </td>
      )}
      {visibleColumns.takeProfit && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatTradePrice(
            trade.takeProfit || trade.take_profit,
            trade.symbol
          )}
        </td>
      )}
      {visibleColumns.tradeRisk && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {formatTradeMoney(
            trade.tradeRisk || trade.trade_risk,
            trade.pnlCurrency || trade.pnl_currency
          )}
        </td>
      )}
      {visibleColumns.lotSize && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.lotSize || trade.lot_size)}
        </td>
      )}
      {visibleColumns.percentChange && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.percentChange || trade.percent_change)}
        </td>
      )}
      {visibleColumns.strategy && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderTags(trade.strategy, "strategy")}
        </td>
      )}
      {visibleColumns.setup && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderTags(trade.setup, "setup")}
        </td>
      )}
      {visibleColumns.notes && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.notes)}
        </td>
      )}
      {visibleColumns.mistakes && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderTags(trade.mistakes || trade.mistake, "mistake")}
        </td>
      )}
      {visibleColumns.rating && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderRatingScale(trade.rating ?? trade.trade_rating)}
        </td>
      )}
      {visibleColumns.executionScore && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.executionScore || trade.execution_score)}
        </td>
      )}
      {visibleColumns.breakeven && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {trade.is_breakeven == null
            ? "--"
            : trade.is_breakeven
            ? "Yes"
            : "No"}
        </td>
      )}
      {visibleColumns.customTags && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderTags(
            trade.customTags || trade.custom_tags || trade.tags,
            "custom"
          )}
        </td>
      )}
      {visibleColumns.quantityUnit && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.quantityUnit || trade.quantity_unit)}
        </td>
      )}
      {visibleColumns.pnlCurrency && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.pnlCurrency || trade.pnl_currency)}
        </td>
      )}
      {visibleColumns.pnlSource && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {displayValue(trade.pnlSource || trade.pnl_source)}
        </td>
      )}

      <td
        data-actions-cell="true"
        className="w-9 min-w-[36px] max-w-[36px] px-1 py-2.5 text-center sticky right-0 z-11 bg-inherit shadow-none overflow-visible"
      >
        <TradeLogRowActions
          trade={trade}
          onOpenEdit={onOpenEdit}
          onCopy={onCopy}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
});

export default TradeLogTableRow;
