export function normalizeTradePnlSign(trade) {
  const pnl = Number(trade?.netPnl ?? trade?.grossPnl);
  const entry = Number(trade?.entryPrice);
  const exit = Number(trade?.exitPrice);
  const side = String(trade?.side || "").trim().toLowerCase();

  if (
    !Number.isFinite(pnl)
    || pnl === 0
    || !Number.isFinite(entry)
    || !Number.isFinite(exit)
    || entry <= 0
    || exit <= 0
    || (side !== "buy" && side !== "sell")
  ) {
    return Number.isFinite(pnl) ? pnl : 0;
  }

  const expectedMove = side === "sell" ? entry - exit : exit - entry;
  if (expectedMove === 0) return pnl;

  const expectedSign = Math.sign(expectedMove);
  return Math.abs(pnl) * expectedSign;
}

export function normalizeTradeForCalculations(trade) {
  if (!trade || typeof trade !== "object") return trade;

  const originalPnl = trade.netPnl ?? trade.grossPnl;

  return {
    ...trade,
    pnl: normalizeTradePnlSign(trade),
    source_pnl: originalPnl,
  };
}

export function formatTradePrice(value, instrumentDigits) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value || "--";
  }

  const digits = instrumentDigits === null || instrumentDigits === undefined || instrumentDigits === ""
    ? Number.NaN
    : Number(instrumentDigits);

  if (Number.isInteger(digits) && digits >= 0 && digits <= 12) {
    return numericValue.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}
