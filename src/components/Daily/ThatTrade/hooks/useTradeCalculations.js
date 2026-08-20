import { useMemo } from "react";
import { formatTradeMoney, getMarketDetailRows } from "@/utils/trading/tradePresentation";
import { calculateRMultiples } from "@/utils/trading/tradeRisk";
import {
  toEpochSeconds,
  formatPnlValue,
  hasRecordedValue,
  formatRecordedMoney,
  parseCustomFields,
  buildRunningPnlTrades,
} from "../utils/tradeFormatters";

export function useTradeCalculations({ trade, reviewValues = {}, chartCandles = [], replayCandle = null } = {}) {
  const tradeEntryTimestamp = trade?.entry_timestamp;
  const tradeExitTimestamp = trade?.exit_timestamp;
  const tradeEntryPrice = trade?.entry_price ?? trade?.price;
  const tradeExitPrice = trade?.exit_price;
  const tradeSide = trade?.side;
  const tradeIdentity = String(trade?.unique_id || "").toLowerCase();

  const chartMarket = useMemo(() => {
    return (
      parseCustomFields(trade?.custom_fields).market ||
      (tradeIdentity.includes(":usdmfutures:")
        ? "usdmFutures"
        : tradeIdentity.includes(":coinmfutures:")
        ? "coinmFutures"
        : tradeIdentity.includes(":spot:")
        ? "spot"
        : trade?.platform === "binance-spot"
        ? "spot"
        : trade?.platform === "binance-coinm"
        ? "coinmFutures"
        : trade?.platform === "binance-usdm"
        ? "usdmFutures"
        : "")
    );
  }, [trade?.custom_fields, tradeIdentity, trade?.platform]);

  const chartTrades = useMemo(() => {
    if (!tradeEntryTimestamp && !tradeExitTimestamp) return [];

    return [
      {
        entryTime: toEpochSeconds(tradeEntryTimestamp),
        exitTime: toEpochSeconds(tradeExitTimestamp),
        entryPrice: tradeEntryPrice,
        exitPrice: tradeExitPrice,
        side: tradeSide,
      },
    ];
  }, [tradeEntryTimestamp, tradeExitTimestamp, tradeEntryPrice, tradeExitPrice, tradeSide]);

  const runningPnlTrades = useMemo(
    () => buildRunningPnlTrades(chartCandles, trade, replayCandle?.time),
    [chartCandles, replayCandle?.time, trade]
  );

  const replayPnl = useMemo(
    () => runningPnlTrades.reduce((total, point) => total + (Number(point.pnl) || 0), 0),
    [runningPnlTrades]
  );

  const runningPnlStats = useMemo(() => {
    let value = 0;
    let favorable = 0;
    let adverse = 0;
    runningPnlTrades.forEach((point) => {
      value += Number(point.pnl) || 0;
      favorable = Math.max(favorable, value);
      adverse = Math.min(adverse, value);
    });
    const finalValue = Number(trade?.net_pnl) || 0;
    return {
      favorable,
      adverse,
      capture: favorable > 0 ? Math.min(100, Math.max(0, (finalValue / favorable) * 100)) : 0,
    };
  }, [runningPnlTrades, trade?.net_pnl]);

  const pnl = Number(trade?.net_pnl) || 0;
  const pnlCurrency = trade?.pnl_currency || "USD";
  const marketDetailRows = trade ? getMarketDetailRows(trade) : [];
  const optionDetails = trade?.optionDetails || trade?.product_details || {};
  const isOptionTrade = ["option", "options"].includes(String(trade?.product_type || trade?.category || "").toLowerCase());
  const iconSymbol = isOptionTrade
    ? optionDetails.underlyingSymbol || optionDetails.underlying_symbol || String(trade?.symbol || "").split("-")[0]
    : trade?.symbol;

  const displayedPnl = replayCandle ? replayPnl : pnl;
  const isProfit = displayedPnl >= 0;

  const entrySeconds = toEpochSeconds(tradeEntryTimestamp);
  const exitSeconds = toEpochSeconds(tradeExitTimestamp);
  const durationMinutes =
    Number.isFinite(entrySeconds) && Number.isFinite(exitSeconds)
      ? Math.max(1, Math.round((exitSeconds - entrySeconds) / 60))
      : null;

  const entryPriceNumber = Number(trade?.entry_price ?? trade?.price);
  const exitPriceNumber = Number(trade?.exit_price);
  const priceMovePercent =
    Number.isFinite(entryPriceNumber) && Number.isFinite(exitPriceNumber) && entryPriceNumber !== 0
      ? ((exitPriceNumber - entryPriceNumber) / entryPriceNumber) * 100
      : null;

  const feesValue = trade?.total_charges ?? trade?.charges;
  const targetValue = reviewValues?.take_profit !== undefined ? reviewValues.take_profit : (trade?.take_profit ?? "");
  const stopValue = reviewValues?.stop_loss !== undefined ? reviewValues.stop_loss : (trade?.stop_loss ?? "");

  const calculatedRisk =
    Number.isFinite(entryPriceNumber) && hasRecordedValue(stopValue) && Number.isFinite(Number(stopValue)) && Number.isFinite(Number(trade?.quantity))
      ? Math.abs(entryPriceNumber - Number(stopValue)) * Number(trade.quantity)
      : null;

  const initialTargetValue = trade?.initial_target ?? targetValue;
  const riskValue = trade?.trade_risk ?? calculatedRisk;

  const { planned: plannedRValue, realized: realizedRValue } = calculateRMultiples({
    entry: entryPriceNumber,
    exit: exitPriceNumber,
    stop: stopValue,
    target: targetValue,
    side: tradeSide,
  });

  const positionValue =
    Number.isFinite(entryPriceNumber) && Number.isFinite(Number(trade?.quantity))
      ? entryPriceNumber * Number(trade.quantity)
      : null;

  const qualityScore =
    Number(reviewValues?.trade_quality) ||
    Math.max(1, Math.min(5, Math.round(runningPnlStats.capture / 20) || (isProfit ? 3 : 2)));

  const resultRating =
    Number(reviewValues?.trade_rating) ||
    Math.max(1, Math.min(5, Math.round((qualityScore + (isProfit ? 4 : 2)) / 2)));

  const storedExecutionScore = Number(reviewValues?.execution_score);
  const executionScore =
    hasRecordedValue(reviewValues?.execution_score) && Number.isFinite(storedExecutionScore)
      ? Math.max(0, Math.min(100, storedExecutionScore))
      : Math.round(runningPnlStats.capture);

  const executionLabel = executionScore >= 75 ? "Great" : executionScore >= 45 ? "Average" : "Needs work";
  const executionColor =
    executionScore >= 75
      ? "var(--accent-success-strong)"
      : executionScore >= 45
      ? "var(--accent-rating)"
      : "var(--accent-danger)";

  const reviewMetrics = [
    { label: "Commissions & Fees", value: formatRecordedMoney(feesValue, pnlCurrency) },
    {
      label: "Price ROI",
      value: priceMovePercent === null ? "Not recorded" : `${priceMovePercent >= 0 ? "+" : ""}${priceMovePercent.toFixed(2)}%`,
      tone: priceMovePercent >= 0 ? "profit" : "loss",
    },
    { label: "Gross P&L", value: formatPnlValue(pnl, pnlCurrency), tone: isProfit ? "profit" : "loss" },
    { label: "Position Value", value: positionValue === null ? "Not recorded" : formatTradeMoney(positionValue, pnlCurrency) },
    { label: "Profit Target", value: hasRecordedValue(targetValue) ? targetValue : "Not recorded", tone: "profit" },
    { label: "Stop Loss", value: hasRecordedValue(stopValue) ? stopValue : "Not recorded", tone: "loss" },
    { label: "Initial Target", value: formatRecordedMoney(initialTargetValue, pnlCurrency), tone: "profit" },
    { label: "Trade Risk", value: formatRecordedMoney(riskValue, pnlCurrency), tone: "loss" },
    {
      label: "Planned R-Multiple",
      value: hasRecordedValue(plannedRValue) ? `${Number(plannedRValue).toFixed(2)}R` : "Not recorded",
    },
    {
      label: "Realized R-Multiple",
      value: hasRecordedValue(realizedRValue) ? `${Number(realizedRValue).toFixed(2)}R` : "Not recorded",
    },
    {
      label: "MAE / MFE",
      value: `${formatPnlValue(runningPnlStats.adverse, pnlCurrency)} / ${formatPnlValue(runningPnlStats.favorable, pnlCurrency)}`,
    },
  ];

  return {
    chartMarket,
    chartTrades,
    runningPnlTrades,
    replayPnl,
    runningPnlStats,
    pnl,
    pnlCurrency,
    marketDetailRows,
    optionDetails,
    isOptionTrade,
    iconSymbol,
    displayedPnl,
    isProfit,
    durationMinutes,
    priceMovePercent,
    positionValue,
    calculatedRisk,
    riskValue,
    plannedRValue,
    realizedRValue,
    qualityScore,
    resultRating,
    executionScore,
    executionLabel,
    executionColor,
    reviewMetrics,
  };
}

export default useTradeCalculations;
