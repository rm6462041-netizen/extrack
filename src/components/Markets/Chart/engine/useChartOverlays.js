import { useCallback, useRef } from "react";
import { LineSeries, LineStyle } from "lightweight-charts";
import { INTERVAL_MS } from "../utils/chartHelpers";
import { formatTradePrice } from "@/utils/trading/tradeCalculations";

const getConnectorColor = () => {
  return getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "#64748b";
};

/**
 * Universal Overlay Engine for Charts.
 * Renders signal markers, annotations, alert price lines, and connector lines.
 */
export function useChartOverlays({
  chartApiRef,
  candleSeriesRef,
  markerPrimitiveRef,
  pricePrecision = 2,
}) {
  const overlayLineSeriesRef = useRef([]);
  const overlayPriceLinesRef = useRef([]);

  const clearOverlays = useCallback(() => {
    if (chartApiRef.current) {
      overlayLineSeriesRef.current.forEach((series) => {
        try {
          chartApiRef.current.removeSeries(series);
        } catch {
          // Series disposed
        }
      });
    }
    overlayLineSeriesRef.current = [];

    if (candleSeriesRef?.current) {
      overlayPriceLinesRef.current.forEach((priceLine) => {
        try {
          candleSeriesRef.current.removePriceLine(priceLine);
        } catch {
          // Line disposed
        }
      });
    }
    overlayPriceLinesRef.current = [];
    markerPrimitiveRef.current?.setMarkers([]);
  }, [chartApiRef, candleSeriesRef, markerPrimitiveRef]);

  const updateOverlays = useCallback(
    ({ markers = [], lines = [], trades = [], alerts = [], symbol = "", candles = [], timeframe = "1m" }) => {
      const chartApi = chartApiRef.current;
      if (!chartApi || !candles.length) {
        clearOverlays();
        return;
      }

      const candleTimes = candles.map((c) => c.time);
      const candleTimeSet = new Set(candleTimes);
      const intervalSeconds = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);

      const resolveTime = (value) => {
        if (!value) return null;
        const num = Number(value);
        const tsMs = Number.isFinite(num) ? num : new Date(value).getTime();
        if (!Number.isFinite(tsMs)) return null;
        const tsSec = tsMs > 1e12 ? Math.floor(tsMs / 1000) : Math.floor(tsMs);
        const snappedTime = Math.floor(tsSec / intervalSeconds) * intervalSeconds;

        if (candleTimeSet.has(snappedTime)) return snappedTime;

        let nearestTime = null;
        let nearestDistance = Infinity;
        for (const candleTime of candleTimes) {
          const distance = Math.abs(candleTime - snappedTime);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestTime = candleTime;
          }
        }
        return nearestDistance <= intervalSeconds ? nearestTime : snappedTime;
      };

      clearOverlays();
      const allMarkers = [...markers];

      // Convert trades to markers & lines if provided
      if (Array.isArray(trades) && trades.length > 0) {
        trades.forEach((t) => {
          const side = String(t.side || "").toLowerCase();
          const isSell = side === "sell" || side === "short" || side === "bearish";
          const entryTime = resolveTime(t.entryTime);
          const exitTime = resolveTime(t.exitTime);

          if (entryTime && t.entryPrice) {
            allMarkers.push({
              time: entryTime,
              price: Number(t.entryPrice),
              direction: isSell ? "down" : "up",
              color: isSell ? "#f23645" : "#089981",
              bgColor: "#ffffff",
              radius: 10,
              label: `@ ${t.entryPrice}`,
            });
          }

          if (exitTime && t.exitPrice) {
            allMarkers.push({
              time: exitTime,
              price: Number(t.exitPrice),
              direction: isSell ? "up" : "down",
              color: "#2962ff",
              bgColor: "#ffffff",
              radius: 9,
              label: `@ ${t.exitPrice}`,
            });
          }

          const entryPrice = Number(t.entryPrice);
          const exitPrice = Number(t.exitPrice);
          if (
            entryTime &&
            exitTime &&
            entryTime !== exitTime &&
            Number.isFinite(entryPrice) &&
            Number.isFinite(exitPrice)
          ) {
            const lineSeries = chartApi.addSeries(LineSeries, {
              color: getConnectorColor(),
              priceFormat: {
                type: "price",
                precision: pricePrecision,
                minMove: 10 ** -pricePrecision,
              },
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
            });

            const points = [
              { time: entryTime, value: entryPrice },
              { time: exitTime, value: exitPrice },
            ].sort((a, b) => Number(a.time) - Number(b.time));

            lineSeries.setData(points);
            overlayLineSeriesRef.current.push(lineSeries);
          }
        });
      }

      // Draw custom lines if provided
      if (Array.isArray(lines) && lines.length > 0) {
        lines.forEach((line) => {
          if (!line?.from || !line?.to) return;
          const lineSeries = chartApi.addSeries(LineSeries, {
            color: line.color || getConnectorColor(),
            priceFormat: {
              type: "price",
              precision: pricePrecision,
              minMove: 10 ** -pricePrecision,
            },
            lineWidth: line.width || 1,
            lineStyle: line.style === "solid" ? LineStyle.Solid : LineStyle.Dashed,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });

          const points = [
            { time: resolveTime(line.from.time), value: Number(line.from.price) },
            { time: resolveTime(line.to.time), value: Number(line.to.price) },
          ].sort((a, b) => Number(a.time) - Number(b.time));

          lineSeries.setData(points);
          overlayLineSeriesRef.current.push(lineSeries);
        });
      }

      // Render Alert Price Lines if provided
      if (candleSeriesRef?.current && Array.isArray(alerts) && alerts.length > 0) {
        const isDark =
          document.body.classList.contains("dark-mode") ||
          document.documentElement.classList.contains("dark");
        const alertColor = isDark ? "#f8fafc" : "#0f172a";
        const alertLabelTextColor = isDark ? "#070707" : "#ffffff";

        alerts
          .filter((a) => a.status === "ACTIVE" && (!symbol || a.symbol === symbol))
          .forEach((alert) => {
            try {
              const priceLine = candleSeriesRef.current.createPriceLine({
                price: Number(alert.targetPrice),
                color: alertColor,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: `🔔 Alert @ ${formatTradePrice(alert.targetPrice, pricePrecision)}`,
                axisLabelColor: alertColor,
                axisLabelTextColor: alertLabelTextColor,
              });
              overlayPriceLinesRef.current.push(priceLine);
            } catch {
              // Ignore if series disposed
            }
          });
      }

      markerPrimitiveRef.current?.setMarkers(allMarkers);
    },
    [chartApiRef, candleSeriesRef, clearOverlays, markerPrimitiveRef, pricePrecision]
  );

  return {
    updateOverlays,
    clearOverlays,
  };
}
