import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import BacktestPlaybackControls from "@/features/backtesting/components/BacktestPlaybackControls";
import {
  DEFAULT_LAYOUTS,
  TradingChartFooter,
  TradingChartHeader,
} from "@/components/Common/TradingChartChrome/TradingChartChrome";
import { normalizeStoredSymbol } from "@/utils/trading/symbols";
import { readDraggedSymbol } from "@/features/marketTerminal/utils/terminalHelpers";
import { getDatabaseInstrumentDigits } from "@/features/marketTerminal/utils/instrumentDigits";

import { useChartInstance } from "./engine/useChartInstance";
import { useChartDataEngine } from "./engine/useChartDataEngine";
import { useChartReplayEngine } from "./engine/useChartReplayEngine";
import { useChartOverlays } from "./engine/useChartOverlays";
import { createDefaultDatafeed } from "./datafeeds/defaultDatafeed";
import {
  INTERVAL_MS,
  TIMEFRAMES,
} from "./utils/chartHelpers";

/**
 * Universal Master Chart Component.
 * - Accepts TradingView-style `datafeed` prop for 100% data-agnostic rendering.
 * - Supports Historical Data with Infinite Scroll & Viewport Chunking.
 * - Supports Real-time Live WebSocket streaming & Ticking Candles.
 * - Supports Multi-Chart Terminal Grid Layouts, Focus Management & Symbol Drag-and-Drop.
 * - Supports Alerts, Price Lines, Signal Markers, Trade Annotations & Custom Lines.
 * - Supports Bar-by-bar Replay Playback engine.
 */
function Chart({
  chart,
  datafeed: customDatafeed,
  darkMode,
  symbol: directSymbol,
  timeframe: directTimeframe,
  interval: directInterval,
  active = false,
  compact = false,
  fitNonce,
  pageActive = true,
  availableSymbols = [],
  prioritySymbols = [],
  initialQuote,
  alerts = [],
  onAddAlert,
  onUpdateAlertPrice,
  onDeleteAlert,
  layout = "1",
  layouts = DEFAULT_LAYOUTS,
  onLayoutChange,
  onSymbolChange,
  onIntervalChange,
  onTimeframeChange,
  onDropSymbol,
  onActivate,
  onQuote,
  live = true,
  priceDigits,
  markers = [],
  lines = [],
  trades = [],
  anchorTime: customAnchorTime,
  onCandleData,
  onQuoteChange,
  onReplayChange,
  onReplayTick,
  className = "",
}) {
  const queryClient = useQueryClient();

  // Resolve target symbol and timeframe from chart object or direct props
  const targetSymbol = chart?.symbol || directSymbol || "EURUSD";
  const targetTimeframe = chart?.interval || directInterval || directTimeframe || "15m";

  const normalizedSymbol = useMemo(
    () => normalizeStoredSymbol(targetSymbol) || targetSymbol || "EURUSD",
    [targetSymbol]
  );

  const [tf, setTf] = useState(() => targetTimeframe);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [resolvedDigits, setResolvedDigits] = useState(() => {
    const num = Number(priceDigits);
    return Number.isInteger(num) && num >= 0 && num <= 8 ? num : null;
  });

  useEffect(() => {
    if (targetTimeframe) setTf(targetTimeframe);
  }, [targetTimeframe]);

  useEffect(() => {
    const num = Number(priceDigits);
    if (Number.isInteger(num) && num >= 0 && num <= 8) {
      setResolvedDigits(num);
      return;
    }
    let cancelled = false;
    getDatabaseInstrumentDigits(normalizedSymbol).then((digits) => {
      if (!cancelled && Number.isInteger(digits) && digits >= 0 && digits <= 8) {
        setResolvedDigits(digits);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [normalizedSymbol, priceDigits]);

  const chartPricePrecision = resolvedDigits !== null ? resolvedDigits : 4;

  // Standard TradingView Datafeed (REST + WebSocket)
  const datafeed = useMemo(() => {
    if (customDatafeed) return customDatafeed;
    return createDefaultDatafeed({ queryClient });
  }, [customDatafeed, queryClient]);

  // Compute anchor time if specific trades or custom anchor is provided
  const anchorTime = useMemo(() => {
    if (customAnchorTime) return Number(customAnchorTime);
    if (Array.isArray(trades) && trades.length > 0) {
      const tradeTimes = trades
        .flatMap((t) => [t?.entryTime, t?.exitTime])
        .map((val) => {
          if (!val) return null;
          const num = Number(val);
          const ms = Number.isFinite(num) ? num : new Date(val).getTime();
          return Number.isFinite(ms) ? (ms > 1e12 ? Math.floor(ms / 1000) : Math.floor(ms)) : null;
        })
        .filter(Boolean);

      if (tradeTimes.length > 0) return Math.min(...tradeTimes);
    }
    return undefined;
  }, [customAnchorTime, trades]);

  // 1. Chart Instance Lifecycle & Rendering
  const {
    chartRef,
    chartShellRef,
    chartApiRef,
    candleSeriesRef,
    tradeMarkerPrimitiveRef,
    isChartReady,
    isFullscreen,
    latestCandle,
    setLatestCandle,
    cssVariables,
    toggleFullscreen,
    saveSnapshot,
  } = useChartInstance({
    darkMode,
    pricePrecision: chartPricePrecision,
    symbol: normalizedSymbol,
  });

  // 2. Universal Overlays (Markers, Lines & Alerts)
  const { updateOverlays, clearOverlays } = useChartOverlays({
    chartApiRef,
    candleSeriesRef,
    markerPrimitiveRef: tradeMarkerPrimitiveRef,
    pricePrecision: chartPricePrecision,
  });

  // 3. Universal Replay Engine
  const {
    isReplaying,
    isReplayPlaying,
    replaySpeed,
    replayActiveRef,
    startReplay,
    stopReplay,
    togglePlay,
    stepForward,
    stepBackward,
    setSpeed,
  } = useChartReplayEngine({
    chartDataRef: { current: [] },
    candleSeriesRef,
    chartApiRef,
    onReplayChange: (state) => {
      if (state.candle) setLatestCandle(state.candle);
      onReplayChange?.(state);
    },
    onTick: (candle, cursorIndex) => {
      onReplayTick?.(candle, cursorIndex);
    },
    onResetFullChart: () => {
      if (chartDataRef.current.length > 0) {
        candleSeriesRef.current?.setData(chartDataRef.current);
        setLatestCandle(chartDataRef.current.at(-1) || null);
        updateOverlays({
          markers,
          lines,
          trades,
          alerts,
          symbol: normalizedSymbol,
          candles: chartDataRef.current,
          timeframe: tf,
        });
      }
    },
  });

  // 4. Pure Datafeed Consumer Engine (Historical Chunks + Live WebSocket)
  const isLiveEnabled = live && !isReplaying && (!trades || trades.length === 0);

  const { chartDataRef, loading, error, liveQuote } = useChartDataEngine({
    datafeed,
    symbol: normalizedSymbol,
    timeframe: tf,
    anchorTime,
    chartApi: chartApiRef.current,
    candleSeries: candleSeriesRef.current,
    chartReady: isChartReady,
    enableLiveStream: isLiveEnabled,
    isReplayActive: isReplaying,
    priceDigits: chartPricePrecision,
    onCandleData: (candles) => {
      setLatestCandle(candles.at(-1) || null);
      onCandleData?.(candles);
      if (!replayActiveRef.current) {
        updateOverlays({
          markers,
          lines,
          trades,
          alerts,
          symbol: normalizedSymbol,
          candles,
          timeframe: tf,
        });
      }
    },
    onTick: (candle) => {
      if (!replayActiveRef.current && candle) {
        setLatestCandle(candle);
      }
    },
    onLiveQuote: (quote) => {
      onQuoteChange?.(quote);
      onQuote?.(quote?.symbolName || normalizedSymbol, quote);
    },
  });

  // Update overlays whenever alerts or external lines/markers change
  useEffect(() => {
    if (!replayActiveRef.current && chartDataRef.current.length > 0) {
      updateOverlays({
        markers,
        lines,
        trades,
        alerts,
        symbol: normalizedSymbol,
        candles: chartDataRef.current,
        timeframe: tf,
      });
    }
  }, [alerts, markers, lines, trades, normalizedSymbol, tf, updateOverlays]);

  // Handle fitNonce and tab visibility changes
  useEffect(() => {
    if (pageActive && chartApiRef.current) {
      const timer = setTimeout(() => {
        chartApiRef.current?.timeScale().fitContent();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [fitNonce, pageActive]);

  const handleToggleReplay = useCallback(() => {
    if (isReplaying) {
      stopReplay();
      return;
    }
    const candles = chartDataRef.current;
    if (!candles || candles.length === 0) return;

    clearOverlays();
    const startIndex = Math.max(0, candles.length - 50);
    startReplay({ startIndex, customData: candles });
  }, [clearOverlays, isReplaying, startReplay, stopReplay, chartDataRef]);

  const fitContent = useCallback(() => {
    chartApiRef.current?.timeScale().fitContent();
  }, [chartApiRef]);

  const goToActiveTrade = useCallback(() => {
    const chartApi = chartApiRef.current;
    if (!chartApi || !trades.length) return;

    const tradeTimes = trades
      .flatMap((t) => [t.entryTime, t.exitTime])
      .map((v) => {
        const num = Number(v);
        return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
      })
      .filter(Boolean);

    if (tradeTimes.length > 0) {
      const minTime = Math.min(...tradeTimes);
      const maxTime = Math.max(...tradeTimes);
      const duration = Math.max(maxTime - minTime, (INTERVAL_MS[tf] || 60000) / 1000);
      chartApi.timeScale().setVisibleRange({
        from: minTime - duration * 4,
        to: maxTime + duration * 4,
      });
    }
  }, [chartApiRef, tf, trades]);

  const handleTimeframeChange = useCallback(
    (newTf) => {
      setTf(newTf);
      onIntervalChange?.(newTf);
      onTimeframeChange?.(newTf);
    },
    [onIntervalChange, onTimeframeChange]
  );

  const handleSelectSymbol = useCallback(
    (newSym) => {
      onSymbolChange?.(newSym);
    },
    [onSymbolChange]
  );

  const handleDragOver = useCallback((event) => {
    if (!readDraggedSymbol(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragTarget(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragTarget(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event) => {
      setIsDragTarget(false);
      const droppedSymbol = readDraggedSymbol(event);
      if (droppedSymbol) {
        event.preventDefault();
        onDropSymbol?.(droppedSymbol);
        onSymbolChange?.(droppedSymbol);
      }
    },
    [onDropSymbol, onSymbolChange]
  );

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] overflow-hidden transition-all select-none ${
        active ? "ring-1 ring-inset ring-[var(--primary,#2563eb)]" : ""
      } ${isDragTarget ? "ring-2 ring-inset ring-[var(--primary,#2563eb)] opacity-90" : ""} ${
        isFullscreen ? "fixed inset-0 z-[9999] bg-[var(--bg-card,#131722)]" : ""
      } ${className}`}
      ref={chartShellRef}
      onClick={() => onActivate?.()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        "--chart-loader-up": cssVariables?.pnlPositive || "#16a34a",
        "--chart-loader-down": cssVariables?.pnlNegative || "#b91c1c",
      }}
    >
      <TradingChartHeader
        title={targetSymbol}
        activeSymbol={targetSymbol}
        timeframe={tf}
        timeframes={TIMEFRAMES}
        onTimeframeChange={handleTimeframeChange}
        availableSymbols={availableSymbols}
        onSelectSymbol={handleSelectSymbol}
        layout={layout}
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        candle={latestCandle}
        quote={liveQuote || initialQuote}
        priceDigits={chartPricePrecision}
        replayActive={isReplaying}
        replayDisabled={loading || chartDataRef.current.length === 0}
        onReplay={trades?.length > 0 ? handleToggleReplay : undefined}
        onFullscreen={toggleFullscreen}
        onSnapshot={() => saveSnapshot(tf)}
        isFullscreen={isFullscreen}
      />

      {error && !loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3.5 z-10 bg-[var(--bg-card,#ffffff)] p-6 rounded-xl border border-[var(--loss-color,#ef4444)] shadow-sm min-w-[250px] text-center text-sm text-[var(--loss-color,#ef4444)]">
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div
          className="absolute inset-[42px_0_0] z-20 grid place-items-center overflow-hidden rounded-[10px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.78),rgba(244,248,252,0.62)_30%,rgba(218,228,239,0.34)_64%,rgba(210,222,236,0.2)_100%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.72),rgba(15,23,42,0.52)_34%,rgba(2,6,23,0.34)_72%,rgba(2,6,23,0.18)_100%)] backdrop-blur-[18px] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]"
          role="status"
          aria-label="Loading chart data"
        >
          <span
            className="relative z-[2] w-9 h-9 border-[3px] border-[var(--border-medium)] border-t-[var(--pnl-positive,#10b981)] rounded-full animate-spin"
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={`relative w-full flex-1 min-h-0 overflow-hidden ${
          loading ? "blur-[4px] opacity-50 scale-[0.996]" : ""
        } transition-all duration-200`}
        ref={chartRef}
      />

      {isReplaying && (
        <BacktestPlaybackControls
          isPlaying={isReplayPlaying}
          speed={replaySpeed}
          onTogglePlay={togglePlay}
          onStep={stepForward}
          onSpeedChange={setSpeed}
        />
      )}

      <TradingChartFooter
        chartApi={chartApiRef.current}
        timeframe={tf}
        timeframes={TIMEFRAMES}
        onTimeframeChange={handleTimeframeChange}
        onFit={fitContent}
        onGoToTrade={trades?.length > 0 ? goToActiveTrade : undefined}
      />
    </div>
  );
}

export default Chart;
