import { normalizeStoredSymbol } from "@/utils/trading/symbols";
import { normalizeOptionContractInput } from "@/utils/trading/optionContracts";

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

export const TF_MAP = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

export const INTERVAL_MS = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export const chartTimeToDate = (time) => {
  if (typeof time === "number") return new Date(time * 1000);
  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    return new Date(time.year, time.month - 1, time.day);
  }
  return null;
};

export const chartAxisDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export const chartAxisDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatChartLocalDateTime = (time) => {
  const date = chartTimeToDate(time);
  if (!date || Number.isNaN(date.getTime())) return "";
  if (typeof time === "object") return chartAxisDateFormatter.format(date);
  return chartAxisDateTimeFormatter.format(date);
};

export const chartTimeToSeconds = (time) => {
  if (typeof time === "number") return time;
  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    return Math.floor(new Date(time.year, time.month - 1, time.day).getTime() / 1000);
  }
  return null;
};

export const normalizeChartCandle = (item) => {
  const open = Number(Array.isArray(item) ? item[1] : item.open);
  const high = Number(Array.isArray(item) ? item[2] : item.high);
  const low = Number(Array.isArray(item) ? item[3] : item.low);
  const close = Number(Array.isArray(item) ? item[4] : item.close);
  const rawTime = Number(Array.isArray(item) ? item[0] : item.time ?? item.timestamp);

  return {
    time: rawTime > 10_000_000_000 ? Math.floor(rawTime / 1000) : Math.floor(rawTime),
    open,
    high: Math.max(open, high, low, close),
    low: Math.min(open, high, low, close),
    close,
    volume: Number(Array.isArray(item) ? item[5] || 0 : item.volume || 0),
  };
};

export const getDurationTimeframe = (trades = []) => {
  const trade = trades.find(
    (item) => Number.isFinite(Number(item?.entryTime)) && Number.isFinite(Number(item?.exitTime))
  );
  if (!trade) return "1m";

  const durationMs = Math.max(0, (Number(trade.exitTime) - Number(trade.entryTime)) * 1000);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (durationMs < 2 * hour) return "1m";
  if (durationMs < 4 * hour) return "5m";
  if (durationMs < 8 * hour) return "15m";
  if (durationMs < day) return "1h";
  if (durationMs <= 3 * day) return "4h";
  return "1d";
};

export const resolveCleanedSymbol = ({ symbol, productType, brokerSlug, brokerName }) => {
  const isOption = String(productType || "").toLowerCase() === "option";
  const broker = brokerSlug || brokerName || "";
  return isOption
    ? normalizeOptionContractInput(broker, symbol)
    : normalizeStoredSymbol(symbol) || "BTCUSDT";
};
