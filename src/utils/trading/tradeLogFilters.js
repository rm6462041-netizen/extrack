import { getInstrumentType } from './tradePresentation.js';

export const matchesTradeLogFilters = (trade, filters) => {
  const exact = [
    ["category", trade.category],
    ["productType", getInstrumentType(trade)],
    ["source", trade.source],
    ["platform", trade.platform],
    ["account", trade.account_name ?? trade.accountName],
    ["broker", trade.broker_name ?? trade.brokerName],
    ["strategy", trade.strategy],
    ["setup", trade.setup],
    ["rating", trade.rating ?? trade.custom_fields?.trade_rating],
  ];

  if (
    exact.some(([key, value]) => {
      if (!filters[key]) return false;
      const expected =
        key === "productType"
          ? getInstrumentType({ product_type: filters[key] })
          : filters[key];
      return String(value) !== expected;
    })
  ) {
    return false;
  }

  if (filters.breakeven === "yes" && !trade.is_breakeven) return false;
  if (filters.breakeven === "no" && trade.is_breakeven) return false;
  if (filters.hasStopLoss && !trade.stop_loss) return false;
  if (filters.hasTakeProfit && !trade.take_profit) return false;
  if (filters.hasNotes && !trade.notes) return false;
  if (filters.hasMistakes && !trade.mistakes) return false;

  const quantity = Number(trade.quantity) || 0;
  if (filters.minQuantity && quantity < Number(filters.minQuantity)) return false;
  if (filters.maxQuantity && quantity > Number(filters.maxQuantity)) return false;

  return true;
};
