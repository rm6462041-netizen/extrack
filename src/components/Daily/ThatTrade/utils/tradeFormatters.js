import { getTradeCloseDate, getTradeOpenDate } from "@/utils/trading/tradeTime";
import { normalizeStoredSymbol } from "@/utils/trading/symbols";
import { formatTradeMoney } from "@/utils/trading/tradePresentation";

export const formatTradeDateTime = (currentTrade) => {
  const tradeDate = getTradeOpenDate(currentTrade) || getTradeCloseDate(currentTrade);
  if (!tradeDate) return { date: "--", time: "--", dateObj: null, isoDate: null };

  return {
    date: tradeDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: tradeDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    dateObj: tradeDate,
    isoDate: tradeDate.toISOString().split("T")[0],
  };
};

export const formatTimeOnly = (dateValue) => {
  if (!dateValue) return "--";

  return dateValue.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toEpochSeconds = (value) => {
  if (!value) return null;
  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
};

export const formatPnlValue = (value, currency = "USD") => formatTradeMoney(value, currency);

export const hasRecordedValue = (value) => value !== null && value !== undefined && value !== "";

export const formatRecordedMoney = (value, currency = "USD") =>
  hasRecordedValue(value) && Number.isFinite(Number(value))
    ? formatTradeMoney(Math.abs(Number(value)), currency)
    : "Not recorded";

export const parseCustomFields = (value) => {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};

export const compressScreenshot = async (file) => {
  if (file.size < 1024 * 1024) return file;
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return blob?.size < file.size ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }) : file;
};

export const buildRunningPnlTrades = (candles = [], trade, throughTime = null) => {
  const entryTime = toEpochSeconds(trade?.entry_timestamp);
  const exitTime = toEpochSeconds(trade?.exit_timestamp);
  const entryPrice = Number(trade?.price ?? trade?.entry_price);
  const exitPrice = Number(trade?.exit_price);
  const finalPnl = Number(trade?.pnl ?? trade?.net_pnl) || 0;
  const direction = String(trade?.trade_type || trade?.side || "").toLowerCase() === "sell" ? -1 : 1;

  if (!Number.isFinite(entryTime) || !Number.isFinite(exitTime) || !Number.isFinite(entryPrice)) return [];
  if (Number.isFinite(throughTime) && throughTime < entryTime) return [];

  const visibleEndTime = Number.isFinite(throughTime) ? Math.min(exitTime, throughTime) : exitTime;

  const validCandles = Array.isArray(candles) ? candles : [];
  const prices = [
    { time: entryTime, price: entryPrice },
    ...validCandles.filter((candle) => candle.time >= entryTime && candle.time <= visibleEndTime).map((candle) => ({ time: candle.time, price: Number(candle.close) })),
    ...(Number.isFinite(exitPrice) && visibleEndTime >= exitTime ? [{ time: exitTime, price: exitPrice }] : []),
  ].filter((point) => Number.isFinite(point.price)).sort((left, right) => left.time - right.time);

  const rawExit = Number.isFinite(exitPrice) ? direction * (exitPrice - entryPrice) : 0;
  const multiplier = Math.abs(rawExit) > Number.EPSILON ? finalPnl / rawExit : Number(trade?.quantity) || 1;
  let previousValue = 0;

  return prices.filter((point, index) => index === 0 || point.time !== prices[index - 1].time).map((point, index) => {
    const value = direction * (point.price - entryPrice) * multiplier;
    const pnl = index === 0 ? 0 : value - previousValue;
    previousValue = value;
    return { id: `running-pnl-${point.time}`, pnl, entry_timestamp: point.time };
  });
};

export const getBinanceSymbol = (symbol) => {
  if (!symbol) return "BTCUSDT";
  return normalizeStoredSymbol(symbol);
};
