import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { TradeMarkerPrimitive } from "../TradeMarkerPrimitive";
import { formatChartLocalDateTime } from "../utils/chartHelpers";
import {
  getTradeDetailCandleOptions,
  getTradeDetailChartOptions,
  getTradeDetailChartTheme,
} from "@/utils/chart/tradeDetailChartDesign";

/**
 * Initializes Lightweight Charts instance, handles resizing,
 * theme reactivity, and crosshair hover tracking.
 */
export function useChartInstance({ darkMode, pricePrecision = 2, symbol = "CHART" }) {
  const chartRef = useRef(null);
  const chartShellRef = useRef(null);
  const chartApiRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const tradeMarkerPrimitiveRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latestCandle, setLatestCandle] = useState(null);
  const [cssVariables, setCssVariables] = useState(getTradeDetailChartTheme);
  const [isChartReady, setIsChartReady] = useState(false);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === chartShellRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Sync theme / CSS variables
  useEffect(() => {
    const updateCssVariables = () => {
      setCssVariables(getTradeDetailChartTheme());
    };
    updateCssVariables();
    const observer = new MutationObserver(updateCssVariables);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCssVariables(getTradeDetailChartTheme());
    }, 50);
    return () => clearTimeout(timer);
  }, [darkMode]);

  // Initialize Lightweight Chart Instance
  useEffect(() => {
    if (!chartRef.current) return;

    const isMobile = window.innerWidth < 480;
    const initialCss = getTradeDetailChartTheme();

    const chart = createChart(chartRef.current, {
      ...getTradeDetailChartOptions(initialCss, { isMobile, timeFormatter: formatChartLocalDateTime }),
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight || 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      ...getTradeDetailCandleOptions(initialCss),
    });

    // Custom circle-ring + arrow signal markers
    const markerPrimitive = new TradeMarkerPrimitive();
    candleSeries.attachPrimitive(markerPrimitive);
    tradeMarkerPrimitiveRef.current = markerPrimitive;

    chartApiRef.current = chart;
    candleSeriesRef.current = candleSeries;
    setIsChartReady(true);

    const handleCrosshairMove = (param) => {
      const candle = param?.seriesData?.get(candleSeries);
      if (candle?.open !== undefined) {
        setLatestCandle((current) => (current?.time === candle?.time ? current : candle));
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    const handleResize = () => {
      if (chartRef.current && chartApiRef.current) {
        chartApiRef.current.resize(chartRef.current.clientWidth, chartRef.current.clientHeight || 400);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      setIsChartReady(false);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      tradeMarkerPrimitiveRef.current = null;
    };
  }, []);

  // Update precision
  useEffect(() => {
    const priceFormat = {
      type: "price",
      precision: pricePrecision,
      minMove: 10 ** -pricePrecision,
    };
    candleSeriesRef.current?.applyOptions({ priceFormat });
  }, [pricePrecision]);

  // Apply theme updates
  useEffect(() => {
    if (!chartApiRef.current || !candleSeriesRef.current) return;
    const isMobile = window.innerWidth < 480;
    chartApiRef.current.applyOptions(
      getTradeDetailChartOptions(cssVariables, { isMobile, timeFormatter: formatChartLocalDateTime })
    );
    candleSeriesRef.current.applyOptions(getTradeDetailCandleOptions(cssVariables));
  }, [cssVariables]);

  const toggleFullscreen = async () => {
    if (!chartShellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await chartShellRef.current.requestFullscreen();
  };

  const saveSnapshot = (timeframe = "1m") => {
    const canvas = chartApiRef.current?.takeScreenshot?.();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${symbol}-${timeframe}-chart.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return {
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
  };
}
