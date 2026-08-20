import api from "@/utils/common/serve";
import { normalizeChartCandle, TF_MAP } from "../utils/chartHelpers";
import { subscribeMarketStream } from "@/features/marketTerminal/marketStream";

/**
 * Standard TradingView-Style Datafeed for the Markets Chart Engine.
 * 
 * Contract:
 * - getBars: fetches historical candle chunks with { symbol, timeframe, from, to, countBack, firstDataRequest }
 * - subscribeBars: attaches to real-time WebSocket stream for live ticking updates
 */
export function createDefaultDatafeed({ queryClient } = {}) {
  return {
    getBars: async ({ symbol, timeframe, from, to, countBack = 1000, firstDataRequest = false }) => {
      const interval = TF_MAP[timeframe] || timeframe;
      const limit = Number(countBack) || 1000;

      const params = {
        symbol,
        interval,
        limit,
      };

      if (!firstDataRequest && Number.isFinite(Number(from)) && Number(from) > 0) {
        params.startTime = Math.floor(Number(from));
      }
      if (Number.isFinite(Number(to)) && Number(to) > 0) {
        params.endTime = Math.floor(Number(to));
      }

      const fetchFn = async () => {
        try {
          const { data } = await api.get("/market-chart/candles", { params });

          const rows = Array.isArray(data) ? data : data?.candles;
          if (!Array.isArray(rows) || rows.length === 0) {
            return { candles: [], noData: true };
          }

          const candles = rows
            .map(normalizeChartCandle)
            .filter(
              (candle) =>
                Number.isFinite(candle.time) &&
                Number.isFinite(candle.open) &&
                Number.isFinite(candle.high) &&
                Number.isFinite(candle.low) &&
                Number.isFinite(candle.close)
            )
            .sort((a, b) => a.time - b.time);

          return {
            candles,
            noData: candles.length === 0,
          };
        } catch (err) {
          console.warn("datafeed.getBars error", err);
          return { candles: [], noData: true };
        }
      };

      if (queryClient) {
        return queryClient.fetchQuery({
          queryKey: [
            "datafeed-candles",
            symbol,
            interval,
            params.startTime ?? "latest",
            params.endTime ?? "latest",
            limit,
          ],
          queryFn: fetchFn,
          staleTime: 30 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          retry: false,
        });
      }

      return fetchFn();
    },

    subscribeBars: ({ symbol, timeframe, priceDigits = 2, onTick, onQuote }) => {
      if (!symbol) return () => {};

      return subscribeMarketStream({
        symbols: [symbol],
        onTick: (tick) => {
          onQuote?.(tick);
          const price = Number(tick?.last ?? tick?.price ?? tick?.bid ?? tick?.ask ?? 0);
          if (price > 0) {
            onTick?.({
              price,
              priceDigits,
              timestamp: tick?.timestamp || tick?.serverTime || tick?.time || Math.floor(Date.now() / 1000),
              timeframe,
            });
          }
        },
      });
    },
  };
}
