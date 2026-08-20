// Custom series primitive: draws a circular ring with an arrow inside,
// matching TradingView's buy/sell signal marker style, and renders a `@price`
// tooltip badge on hover.

function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
  }
}

class TradeMarkerPaneRenderer {
  constructor(points, mousePoint) {
    // points: [{ x, y, color, bgColor, direction, radius, price, label }]
    this._points = points;
    this._mousePoint = mousePoint;
  }

  draw(target) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const ratio = scope.horizontalPixelRatio;
      const canvasWidth = scope.mediaSize.width * ratio;

      let hoveredPoint = null;

      this._points.forEach((point) => {
        if (point.x === null || point.y === null) return;

        const x = point.x * ratio;
        const y = point.y * ratio;
        const r = point.radius * ratio;

        // Check if mouse is hovering within this marker (radius + 6px hit slop)
        if (this._mousePoint && this._mousePoint.x != null && this._mousePoint.y != null) {
          const mouseX = this._mousePoint.x * ratio;
          const mouseY = this._mousePoint.y * ratio;
          const dist = Math.hypot(mouseX - x, mouseY - y);
          if (dist <= r + 6 * ratio) {
            hoveredPoint = { ...point, x, y, r };
          }
        }

        // ── Filled circle background ──────────────────────────────────────────
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = point.bgColor || "#ffffff";
        ctx.fill();

        // ── Coloured ring ─────────────────────────────────────────────────────
        ctx.lineWidth = 2 * ratio;
        ctx.strokeStyle = point.color;
        ctx.stroke();

        // ── Arrow inside ──────────────────────────────────────────────────────
        const arrowSize = r * 0.55;
        ctx.beginPath();
        ctx.strokeStyle = point.color;
        ctx.lineWidth = 2 * ratio;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (point.direction === "up") {
          // stem: bottom → top
          ctx.moveTo(x, y + arrowSize);
          ctx.lineTo(x, y - arrowSize);
          // arrowhead
          ctx.moveTo(x - arrowSize * 0.6, y - arrowSize * 0.2);
          ctx.lineTo(x, y - arrowSize);
          ctx.lineTo(x + arrowSize * 0.6, y - arrowSize * 0.2);
        } else {
          // stem: top → bottom
          ctx.moveTo(x, y - arrowSize);
          ctx.lineTo(x, y + arrowSize);
          // arrowhead
          ctx.moveTo(x - arrowSize * 0.6, y + arrowSize * 0.2);
          ctx.lineTo(x, y + arrowSize);
          ctx.lineTo(x + arrowSize * 0.6, y + arrowSize * 0.2);
        }
        ctx.stroke();
      });

      // ── Hover Tooltip Badge (@price) ────────────────────────────────────────
      if (hoveredPoint && (hoveredPoint.label || hoveredPoint.price != null)) {
        const rawText = String(hoveredPoint.label || `@ ${hoveredPoint.price}`);
        const text = rawText.startsWith("@") ? rawText : `@ ${rawText}`;

        ctx.font = `600 ${11 * ratio}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textMetrics = ctx.measureText(text);
        const paddingX = 8 * ratio;
        const paddingY = 4 * ratio;
        const boxWidth = textMetrics.width + paddingX * 2;
        const boxHeight = 18 * ratio + paddingY * 2;
        const caretHeight = 5 * ratio;

        let boxY = hoveredPoint.y - hoveredPoint.r - boxHeight - caretHeight - (2 * ratio);
        let caretDirection = "down";
        if (boxY < 5 * ratio) {
          boxY = hoveredPoint.y + hoveredPoint.r + caretHeight + (2 * ratio);
          caretDirection = "up";
        }

        let boxX = hoveredPoint.x - boxWidth / 2;
        if (boxX < 5 * ratio) {
          boxX = 5 * ratio;
        } else if (boxX + boxWidth > canvasWidth - 5 * ratio) {
          boxX = canvasWidth - 5 * ratio - boxWidth;
        }

        const caretX = Math.max(boxX + 6 * ratio, Math.min(boxX + boxWidth - 6 * ratio, hoveredPoint.x));
        const cornerRadius = 4 * ratio;

        ctx.save();
        // Drop shadow for tooltip
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 6 * ratio;
        ctx.shadowOffsetY = 2 * ratio;

        // Tooltip box background
        ctx.beginPath();
        drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, cornerRadius);
        ctx.fillStyle = "#1e222d";
        ctx.fill();

        ctx.shadowColor = "transparent";

        // Border stroke with marker color
        ctx.lineWidth = 1.5 * ratio;
        ctx.strokeStyle = hoveredPoint.color || "#2962ff";
        ctx.stroke();

        // Caret triangle
        ctx.beginPath();
        ctx.fillStyle = "#1e222d";
        ctx.strokeStyle = hoveredPoint.color || "#2962ff";
        ctx.lineWidth = 1.5 * ratio;

        if (caretDirection === "down") {
          const caretTop = boxY + boxHeight;
          ctx.moveTo(caretX - 4 * ratio, caretTop - 1 * ratio);
          ctx.lineTo(caretX, caretTop + caretHeight);
          ctx.lineTo(caretX + 4 * ratio, caretTop - 1 * ratio);
        } else {
          const caretBottom = boxY;
          ctx.moveTo(caretX - 4 * ratio, caretBottom + 1 * ratio);
          ctx.lineTo(caretX, caretBottom - caretHeight);
          ctx.lineTo(caretX + 4 * ratio, caretBottom + 1 * ratio);
        }
        ctx.fill();
        ctx.stroke();

        // Tooltip text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2);

        ctx.restore();
      }
    });
  }
}

class TradeMarkerPaneView {
  constructor(source) {
    this._source = source;
  }

  // Called by the library before each render; no per-frame state needed here.
  update() {}

  renderer() {
    const chart = this._source._chart;
    const series = this._source._series;
    if (!chart || !series) return new TradeMarkerPaneRenderer([], null);

    const timeScale = chart.timeScale();

    const points = this._source._markers.map((marker) => ({
      x: timeScale.timeToCoordinate(marker.time),
      y: series.priceToCoordinate(marker.price),
      price: marker.price,
      label: marker.label,
      color: marker.color,
      bgColor: marker.bgColor,
      direction: marker.direction, // "up" | "down"
      radius: marker.radius != null ? marker.radius : 10,
    }));

    return new TradeMarkerPaneRenderer(points, this._source._mousePoint);
  }
}

/**
 * Attach to a series with:
 *   const primitive = new TradeMarkerPrimitive();
 *   series.attachPrimitive(primitive);
 *
 * Update markers with:
 *   primitive.setMarkers([{ time, price, direction, color, bgColor, radius, label }]);
 */
export class TradeMarkerPrimitive {
  constructor() {
    this._markers = [];
    this._chart = null;
    this._series = null;
    this._mousePoint = null;
    this._isHovering = false;
    this._paneViews = [new TradeMarkerPaneView(this)];
    this._onCrosshairMove = this._onCrosshairMove.bind(this);
  }

  _onCrosshairMove(param) {
    if (!param || !param.point) {
      if (this._mousePoint !== null || this._isHovering) {
        this._mousePoint = null;
        if (this._isHovering) {
          this._isHovering = false;
          this._updateCrosshair(false);
        }
        this._updateCursor(false);
        if (this._chart) {
          this._chart.applyOptions({});
        }
      }
      return;
    }
    this._mousePoint = param.point;
    const isHovering = this._checkHover(param.point);

    if (this._isHovering !== isHovering) {
      this._isHovering = isHovering;
      this._updateCrosshair(isHovering);
      this._updateCursor(isHovering);
    }

    if (this._chart) {
      this._chart.applyOptions({});
    }
  }

  _checkHover(point) {
    if (!this._chart || !this._series) return false;
    const timeScale = this._chart.timeScale();
    const series = this._series;
    return this._markers.some((marker) => {
      const mx = timeScale.timeToCoordinate(marker.time);
      const my = series.priceToCoordinate(marker.price);
      if (mx == null || my == null) return false;
      const radius = marker.radius != null ? marker.radius : 10;
      return Math.hypot(point.x - mx, point.y - my) <= radius + 6;
    });
  }

  _updateCrosshair(isHovering) {
    if (!this._chart) return;
    try {
      if (isHovering) {
        this._chart.applyOptions({
          crosshair: {
            mode: 2, // CrosshairMode.Hidden
            vertLine: { visible: false },
            horzLine: { visible: false },
          },
        });
      } else {
        this._chart.applyOptions({
          crosshair: {
            mode: 0, // CrosshairMode.Normal
            vertLine: { visible: true },
            horzLine: { visible: true },
          },
        });
      }
    } catch (e) {
      // ignore options error
    }
  }

  _updateCursor(isHovering) {
    if (!this._chart) return;
    try {
      const container = typeof this._chart.chartElement === "function" ? this._chart.chartElement() : null;
      if (container) {
        container.style.cursor = isHovering ? "pointer" : "";
      }
    } catch (e) {
      // ignore cursor error
    }
  }

  attached({ chart, series }) {
    this._chart = chart;
    this._series = series;
    if (this._chart) {
      this._chart.subscribeCrosshairMove(this._onCrosshairMove);
    }
  }

  detached() {
    if (this._chart) {
      if (this._isHovering) {
        this._updateCrosshair(false);
      }
      this._chart.unsubscribeCrosshairMove(this._onCrosshairMove);
    }
    this._chart = null;
    this._series = null;
    this._mousePoint = null;
    this._isHovering = false;
  }

  updateAllViews() {
    this._paneViews.forEach((view) => view.update());
  }

  paneViews() {
    return this._paneViews;
  }

  /**
   * Replace the current set of markers and trigger a canvas repaint.
   * @param {Array<{ time: number, price: number, direction: 'up'|'down',
   *                 color: string, bgColor: string, radius?: number, label?: string }>} markers
   */
  setMarkers(markers) {
    this._markers = markers;
    // Nudge lightweight-charts into scheduling a repaint without changing any
    // meaningful chart option.
    if (this._chart) {
      this._chart.applyOptions({});
    }
  }
}
