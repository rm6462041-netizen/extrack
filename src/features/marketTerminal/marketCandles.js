const INTERVAL_SECONDS = {
  '1m': 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
};

export const buildStreamCandle = ({ price, priceDigits, timestamp, interval, existingCandles = [] }) => {
  const digits = Number.isInteger(priceDigits) && priceDigits >= 0 && priceDigits <= 8 ? priceDigits : 5;
  const roundPrice = (value) => Number(Number(value).toFixed(digits));
  const nextPrice = roundPrice(price);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) return null;

  const rawTimestamp = Number(timestamp || Date.now() / 1000);
  const seconds = rawTimestamp > 1e12 ? Math.floor(rawTimestamp / 1000) : Math.floor(rawTimestamp);
  const bucketSize = INTERVAL_SECONDS[interval] || INTERVAL_SECONDS['1m'];
  const time = Math.floor(seconds / bucketSize) * bucketSize;
  const previous = existingCandles[existingCandles.length - 1];

  if (previous && Number(previous.time) > time) return null;
  if (previous && Number(previous.time) === time) {
    return {
      time,
      open: roundPrice(previous.open),
      high: roundPrice(Math.max(Number(previous.high), nextPrice)),
      low: roundPrice(Math.min(Number(previous.low), nextPrice)),
      close: nextPrice,
    };
  }

  return { time, open: nextPrice, high: nextPrice, low: nextPrice, close: nextPrice };
};
