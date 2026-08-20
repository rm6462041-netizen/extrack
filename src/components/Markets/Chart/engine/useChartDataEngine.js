import { useCallback, useEffect, useRef, useState } from "react";
import { mergeCandles } from "@/features/backtesting/data/ohlcvChunks";
import { buildStreamCandle } from "@/features/marketTerminal/marketCandles";
import { CHART_ERROR_MESSAGE, getUserError } from "@/utils/common/errors";
import { chartTimeToSeconds, INTERVAL_MS, TF_MAP } from "../utils/chartHelpers";

const INITIAL_CHUNK_BARS = 1000;
const SCROLL_CHUNK_BARS = 600;
const EDGE_LOAD_THRESHOLD_BARS = 100;

/**
 * Pure Datafeed Consumer Engine for Charts.
 * Communicates strictly via standard TradingView-style Datafeed interface:
 * - datafeed.getBars({ symbol, timeframe, from, to, countBack, firstDataRequest })
 * - datafeed.subscribeBars({ symbol, timeframe, priceDigits, onTick, onQuote })
 */
export function useChartDataEngine({
  datafeed,
  symbol,
  timeframe = "1m",
  anchorTime,
  chartApi,
  candleSeries,
  chartReady = true,
  enableLiveStream = true,
  isReplayActive = false,
  priceDigits = 2,
  onCandleData,
  onLiveQuote,
  onTick,
}) {
  const chartDataRef = useRef([]);
  const isLoadingPastRef = useRef(false);
  const isLoadingFutureRef = useRef(false);
  const noMorePastDataRef = useRef(false);
  const noMoreFutureDataRef = useRef(false);
  const loadMoreRef = useRef(null);
  const resetKeyRef = useRef("");
  const lastLogicalRangeCheckRef = useRef(0);
  const lastTimeRangeCheckRef = useRef(0);
  const timeframeRef = useRef(timeframe);

  // Keep latest function references to prevent effect re-trigger loops
  const onCandleDataRef = useRef(onCandleData);
  const onLiveQuoteRef = useRef(onLiveQuote);
  const onTickRef = useRef(onTick);
  const datafeedRef = useRef(datafeed);
  const chartApiRef = useRef(chartApi);
  const candleSeriesRef = useRef(candleSeries);

  useEffect(() => {
    onCandleDataRef.current = onCandleData;
  }, [onCandleData]);

  useEffect(() => {
    onLiveQuoteRef.current = onLiveQuote;
  }, [onLiveQuote]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    datafeedRef.current = datafeed;
  }, [datafeed]);

  useEffect(() => {
    chartApiRef.current = chartApi;
  }, [chartApi]);

  useEffect(() => {
    candleSeriesRef.current = candleSeries;
  }, [candleSeries]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveQuote, setLiveQuote] = useState(null);

  const applyCandles = useCallback(
    ({ preserveRange = false, prependedCount = 0 } = {}) => {
      const activeChartApi = chartApiRef.current;
      const activeSeries = candleSeriesRef.current;
      if (!activeChartApi || !activeSeries) return;

      const candles = chartDataRef.current;
      const oldRange = preserveRange ? activeChartApi.timeScale().getVisibleLogicalRange() : null;

      activeSeries.setData(candles);
      onCandleDataRef.current?.(candles);

      if (oldRange && prependedCount > 0) {
        activeChartApi.timeScale().setVisibleLogicalRange({
          from: oldRange.from + prependedCount,
          to: oldRange.to + prependedCount,
        });
      }
    },
    []
  );

  // Load a historical chunk in past or future direction
  const loadChunk = useCallback(
    async (direction) => {
      const activeDatafeed = datafeedRef.current;
      if (isReplayActive || !activeDatafeed?.getBars) return false;
      const currentData = chartDataRef.current;
      if (!currentData.length) return false;

      if (direction === "past" && noMorePastDataRef.current) return false;
      if (direction === "future" && (noMoreFutureDataRef.current || !anchorTime)) return false;

      const loadingRef = direction === "past" ? isLoadingPastRef : isLoadingFutureRef;
      if (loadingRef.current) return false;
      loadingRef.current = true;

      const requestResetKey = resetKeyRef.current;
      const activeTf = timeframeRef.current;
      const intervalMs = INTERVAL_MS[activeTf] || INTERVAL_MS["1m"];
      const intervalSec = intervalMs / 1000;

      try {
        const oldestTime = currentData[0].time;
        const newestTime = currentData[currentData.length - 1].time;

        let from, to;
        if (direction === "past") {
          to = oldestTime * 1000;
          from = (oldestTime - SCROLL_CHUNK_BARS * intervalSec) * 1000;
        } else {
          from = newestTime * 1000;
          to = (newestTime + SCROLL_CHUNK_BARS * intervalSec) * 1000;
        }

        const result = await activeDatafeed.getBars({
          symbol,
          timeframe: TF_MAP[activeTf] || activeTf,
          from,
          to,
          countBack: SCROLL_CHUNK_BARS,
          firstDataRequest: false,
        });

        const newCandles = Array.isArray(result) ? result : result?.candles || [];
        const isNoData = Boolean(result?.noData) || newCandles.length === 0;

        if (isNoData) {
          if (direction === "past") noMorePastDataRef.current = true;
          if (direction === "future") noMoreFutureDataRef.current = true;
          return false;
        }

        if (resetKeyRef.current !== requestResetKey || isReplayActive) {
          return false;
        }

        const oldFirstTime = currentData[0]?.time;
        chartDataRef.current = mergeCandles(chartDataRef.current, newCandles);
        const prependedCount =
          direction === "past"
            ? chartDataRef.current.filter((c) => c.time < oldFirstTime).length
            : 0;

        applyCandles({ preserveRange: true, prependedCount });
        return true;
      } catch (err) {
        console.warn(`useChartDataEngine.${direction}_chunk_error`, err);
        return false;
      } finally {
        loadingRef.current = false;
      }
    },
    [anchorTime, applyCandles, isReplayActive, symbol]
  );

  useEffect(() => {
    loadMoreRef.current = loadChunk;
  }, [loadChunk]);

  // Viewport edge detection for automatic infinite scroll
  useEffect(() => {
    if (!chartApi) return;

    const handleVisibleLogicalRangeChange = (range) => {
      if (!range) return;
      const now = performance.now();
      if (now - lastLogicalRangeCheckRef.current < 250) return;
      lastLogicalRangeCheckRef.current = now;

      const totalCandles = chartDataRef.current.length;
      if (totalCandles === 0) return;

      // Scroll left: load older historical bars
      if (range.from < 50) {
        loadMoreRef.current?.("past");
      }
      // Scroll right: only load future bars if anchorTime is active (historical view mode)
      if (anchorTime && totalCandles - range.to < 40) {
        loadMoreRef.current?.("future");
      }
    };

    chartApi.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

    return () => {
      chartApi.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    };
  }, [chartApi, anchorTime]);

  // Initial Datafeed Load (First Data Request) - fires on ChartReady / Symbol / Timeframe / AnchorTime change
  useEffect(() => {
    const activeSeries = candleSeriesRef.current;
    const activeDatafeed = datafeedRef.current;
    if (!chartReady || !activeSeries || !activeDatafeed?.getBars) return;

    const normalizedTf = TF_MAP[timeframe] || timeframe;
    const resolvedAnchor = anchorTime ? String(anchorTime) : "";
    const resetKey = `${symbol}:${normalizedTf}:${resolvedAnchor}`;
    if (resetKeyRef.current === resetKey && chartDataRef.current.length > 0) return;

    resetKeyRef.current = resetKey;
    chartDataRef.current = [];
    noMorePastDataRef.current = false;
    noMoreFutureDataRef.current = false;
    isLoadingPastRef.current = false;
    isLoadingFutureRef.current = false;
    setLoading(true);
    setError(null);

    const loadInitialData = async () => {
      const requestResetKey = resetKey;
      try {
        let from = undefined;
        let to = undefined;

        if (anchorTime) {
          const resolvedAnchorTime = Number(anchorTime);
          const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);
          from = (resolvedAnchorTime - INITIAL_CHUNK_BARS * intervalSec) * 1000;
          to = (resolvedAnchorTime + INITIAL_CHUNK_BARS * intervalSec) * 1000;
        }

        const result = await activeDatafeed.getBars({
          symbol,
          timeframe: normalizedTf,
          from,
          to,
          countBack: INITIAL_CHUNK_BARS,
          firstDataRequest: true,
        });

        const candles = Array.isArray(result) ? result : result?.candles || [];

        if (resetKeyRef.current !== requestResetKey) return;

        if (candles.length === 0) {
          setError(CHART_ERROR_MESSAGE);
          chartDataRef.current = [];
          activeSeries.setData([]);
          onCandleDataRef.current?.([]);
          return;
        }

        chartDataRef.current = candles;
        applyCandles();
        if (chartApiRef.current) {
          chartApiRef.current.timeScale().fitContent();
        }
      } catch (err) {
        if (resetKeyRef.current === requestResetKey) {
          setError(getUserError(err, CHART_ERROR_MESSAGE));
        }
      } finally {
        if (resetKeyRef.current === requestResetKey) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
  }, [anchorTime, applyCandles, chartReady, symbol, timeframe]);

  // Real-time WebSocket Subscription via Datafeed
  useEffect(() => {
    const activeDatafeed = datafeedRef.current;
    if (!enableLiveStream || isReplayActive || !activeDatafeed?.subscribeBars) {
      return undefined;
    }

    const unsubscribe = activeDatafeed.subscribeBars({
      symbol,
      timeframe,
      priceDigits,
      onQuote: (quote) => {
        setLiveQuote(quote);
        onLiveQuoteRef.current?.(quote);
      },
      onTick: ({ price, timestamp }) => {
        const activeSeries = candleSeriesRef.current;
        if (!price || !chartDataRef.current.length || !activeSeries) return;

        const liveCandle = buildStreamCandle({
          price,
          priceDigits,
          timestamp,
          interval: timeframe,
          existingCandles: chartDataRef.current,
        });

        if (liveCandle) {
          activeSeries.update(liveCandle);
          const lastIdx = chartDataRef.current.length - 1;
          if (chartDataRef.current[lastIdx]?.time === liveCandle.time) {
            chartDataRef.current[lastIdx] = liveCandle;
          } else if (chartDataRef.current[lastIdx]?.time < liveCandle.time) {
            chartDataRef.current.push(liveCandle);
          }
          onTickRef.current?.(liveCandle);
        }
      },
    });

    return () => {
      unsubscribe?.();
    };
  }, [enableLiveStream, isReplayActive, priceDigits, symbol, timeframe]);

  return {
    chartDataRef,
    loading,
    error,
    liveQuote,
    applyCandles,
    loadChunk,
  };
}
