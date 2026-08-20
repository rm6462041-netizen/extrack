import { useMemo } from "react";
import {
  getTradeDisplayDate,
  getTradeDisplayTime,
} from "@/utils/trading/tradeTime";
import { matchesTradeLogFilters } from "@/utils/trading/tradeLogFilters";
import { getInstrumentType } from "@/utils/trading/tradePresentation";

export const uniqueTradeValues = (trades, getter) =>
  [
    ...new Set(
      trades
        .map(getter)
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map(String)
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export function useTradeLogFilters(
  trades,
  filters,
  currentMonth,
  currentYear,
  dateRange
) {
  const safeTrades = useMemo(
    () => (Array.isArray(trades) ? trades : []),
    [trades]
  );

  const filteredTrades = useMemo(() => {
    let result = [...safeTrades];

    result = result.filter((trade) => {
      const pnl = Number(trade.pnl) || 0;
      const tradeDate = getTradeDisplayDate(trade);

      if (
        filters?.symbol &&
        !trade.symbol?.toLowerCase().includes(filters.symbol.toLowerCase())
      ) {
        return false;
      }

      if (!dateRange?.from && !dateRange?.to && tradeDate) {
        if (
          tradeDate.getMonth() !== currentMonth ||
          tradeDate.getFullYear() !== currentYear
        ) {
          return false;
        }
      }

      if (dateRange?.from && tradeDate < new Date(dateRange.from)) {
        return false;
      }

      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (tradeDate > toDate) return false;
      }

      if (filters?.winTrades && pnl <= 0) return false;
      if (filters?.lossTrades && pnl >= 0) return false;

      if (filters?.minPnl && pnl < Number(filters.minPnl)) return false;
      if (filters?.maxPnl && pnl > Number(filters.maxPnl)) return false;

      if (filters?.tradeType && trade.trade_type !== filters.tradeType) {
        return false;
      }
      if (filters && !matchesTradeLogFilters(trade, filters)) {
        return false;
      }

      return true;
    });

    if (filters?.sortBy) {
      result.sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (filters.sortBy === "pnl") {
          valA = Number(a.pnl) || 0;
          valB = Number(b.pnl) || 0;
        }

        if (filters.sortBy === "date") {
          valA = getTradeDisplayTime(a);
          valB = getTradeDisplayTime(b);
        }

        if (filters.sortBy === "quantity") {
          valA = Number(a.quantity) || 0;
          valB = Number(b.quantity) || 0;
        }

        if (filters.sortBy === "rating") {
          valA = Number(a.rating ?? a.custom_fields?.trade_rating) || 0;
          valB = Number(b.rating ?? b.custom_fields?.trade_rating) || 0;
        }

        return filters.order === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [safeTrades, filters, currentMonth, currentYear, dateRange]);

  const filterValues = useMemo(() => {
    return {
      symbols: uniqueTradeValues(safeTrades, (trade) => trade.symbol),
      categories: uniqueTradeValues(safeTrades, (trade) => trade.category),
      productTypes: uniqueTradeValues(safeTrades, getInstrumentType),
      sources: uniqueTradeValues(safeTrades, (trade) => trade.source),
      platforms: uniqueTradeValues(safeTrades, (trade) => trade.platform),
      accounts: uniqueTradeValues(
        safeTrades,
        (trade) => trade.account_name ?? trade.accountName
      ),
      brokers: uniqueTradeValues(
        safeTrades,
        (trade) => trade.broker_name ?? trade.brokerName
      ),
      strategies: uniqueTradeValues(safeTrades, (trade) => trade.strategy),
      setups: uniqueTradeValues(safeTrades, (trade) => trade.setup),
      ratings: uniqueTradeValues(
        safeTrades,
        (trade) => trade.rating ?? trade.custom_fields?.trade_rating
      ),
    };
  }, [safeTrades]);

  const activeFilterCount = useMemo(
    () =>
      [
        filters?.symbol,
        filters?.tradeType,
        filters?.category,
        filters?.productType,
        filters?.source,
        filters?.platform,
        filters?.account,
        filters?.broker,
        filters?.strategy,
        filters?.setup,
        filters?.rating,
        filters?.breakeven,
        filters?.winTrades,
        filters?.lossTrades,
        filters?.hasStopLoss,
        filters?.hasTakeProfit,
        filters?.hasNotes,
        filters?.hasMistakes,
        filters?.minPnl,
        filters?.maxPnl,
        filters?.minQuantity,
        filters?.maxQuantity,
        filters?.sortBy,
      ].filter(Boolean).length,
    [filters]
  );

  const hasActiveFilters = activeFilterCount > 0;

  return {
    safeTrades,
    filteredTrades,
    filterValues,
    activeFilterCount,
    hasActiveFilters,
  };
}

export default useTradeLogFilters;
