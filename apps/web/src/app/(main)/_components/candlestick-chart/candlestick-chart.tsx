"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BarChart3,
  Info,
  ArrowUpRight,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import type { CandlestickDataPoint, TradingMetric } from "../../_types";
import styles from "./candlestick-chart.module.css";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const Y_MIN = 74.321;
const Y_MAX = 74.333;
const SEED = 42;

/** Seeded pseudo-random for stable chart data across renders */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateCandlestickData(): CandlestickDataPoint[] {
  const random = seededRandom(SEED);
  const data: CandlestickDataPoint[] = [];
  const months = 7;

  for (let m = 0; m < months; m++) {
    const candlesCount = 4 + Math.floor(random() * 3);
    let lastClose = Y_MIN + random() * (Y_MAX - Y_MIN);

    for (let c = 0; c < candlesCount; c++) {
      const range = (Y_MAX - Y_MIN) * 0.002;
      const change = (random() - 0.5) * 2 * range;
      const open = lastClose;
      const close = Math.max(Y_MIN, Math.min(Y_MAX, lastClose + change));
      const high = Math.max(open, close) + random() * range * 0.5;
      const low = Math.min(open, close) - random() * range * 0.5;
      const day = c + 1;
      const date = `${2024}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const volume = Math.floor(1000 + random() * 5000);

      data.push({
        month: m,
        open,
        high: Math.min(Y_MAX, high),
        low: Math.max(Y_MIN, low),
        close,
        date,
        volume,
      });
      lastClose = close;
    }
  }

  return data;
}

interface CandlestickChartProps {
  metrics: TradingMetric[];
}

const BULLISH_COLOR = "#34d399";
const BEARISH_COLOR = "#f87171";
const GRID_COLOR = "#e8edf2";
const LABEL_COLOR = "#94a3b8";

export function CandlestickChart({ metrics }: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<"line" | "candlestick">("candlestick");
  const [activeTab, setActiveTab] = useState<"Year" | "Month" | "Week" | "Day">("Month");
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    price: string;
  }>({ visible: false, x: 0, y: 0, date: "", price: "" });

  const candleData = useMemo(generateCandlestickData, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const padding = { top: 24, right: 16, bottom: 32, left: 52 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const priceRange = Y_MAX - Y_MIN;
    const yScale = (v: number) =>
      padding.top + innerHeight - ((v - Y_MIN) / priceRange) * innerHeight;
    const xScale = (i: number) =>
      padding.left + (i / Math.max(1, candleData.length - 1)) * innerWidth;

    ctx.clearRect(0, 0, width, height);

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = Y_MIN + (priceRange * i) / gridSteps;
      const py = yScale(y);
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, py);
      ctx.lineTo(width - padding.right, py);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "11px sans-serif";
      ctx.fillStyle = LABEL_COLOR;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(y.toFixed(4), padding.left - 8, py);
    }

    const monthIndices = new Set<number>();
    candleData.forEach((d, i) => monthIndices.add(d.month));
    const monthList = Array.from(monthIndices).sort((a, b) => a - b);
    const firstCandlePerMonth = new Map<number, number>();
    candleData.forEach((d, i) => {
      if (!firstCandlePerMonth.has(d.month)) firstCandlePerMonth.set(d.month, i);
    });

    monthList.forEach((month) => {
      const idx = firstCandlePerMonth.get(month) ?? 0;
      const x = xScale(idx);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = LABEL_COLOR;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(MONTH_LABELS[month] ?? "", x, height - padding.bottom + 8);
    });

    const candleWidth = Math.max(2, (innerWidth / candleData.length) * 0.6);
    const gap = innerWidth / candleData.length;

    candleData.forEach((d, i) => {
      const x = padding.left + (i + 0.5) * gap - candleWidth / 2;
      const isBullish = d.close >= d.open;
      const color = isBullish ? BULLISH_COLOR : BEARISH_COLOR;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;

      const bodyTop = yScale(Math.max(d.open, d.close));
      const bodyBottom = yScale(Math.min(d.open, d.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      const wickTop = yScale(d.high);
      const wickBottom = yScale(d.low);

      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, wickTop);
      ctx.lineTo(x + candleWidth / 2, wickBottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(x, bodyTop, candleWidth, bodyHeight, 2);
      ctx.fill();
      ctx.stroke();
    });
  }, [candleData]);

  const handleResize = useCallback(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw, handleResize]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const padding = { left: 52, right: 16, top: 24, bottom: 32 };
      const innerWidth = rect.width - padding.left - padding.right;
      const gap = innerWidth / candleData.length;
      const x = e.clientX - rect.left - padding.left;

      if (x < 0 || x > innerWidth) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }

      const idx = Math.floor(x / gap);
      if (idx < 0 || idx >= candleData.length) {
        setTooltip((t) => ({ ...t, visible: false }));
        return;
      }

      const d = candleData[idx]!;
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        date: d.date,
        price: d.close.toFixed(4),
      });
    },
    [candleData]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((t) => ({ ...t, visible: false }));
  }, []);

  const displayMetrics = metrics.slice(0, 3);

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <BarChart3 size={18} aria-hidden />
          <span className={styles.title}>Graph</span>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.iconBtn}
            title="Info"
            aria-label="Info"
          >
            <Info size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            title="Expand"
            aria-label="Expand"
          >
            <ArrowUpRight size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.chartSection}>
          <div
            ref={containerRef}
            className={styles.canvasWrapper}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <canvas ref={canvasRef} className={styles.canvas} />
            {tooltip.visible && (
              <div
                className={styles.tooltip}
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  pointerEvents: "none",
                }}
              >
                <div className={styles.tooltipDate}>{tooltip.date}</div>
                <div className={styles.tooltipPrice}>{tooltip.price}</div>
              </div>
            )}
          </div>

          <div className={styles.chartControls}>
            <div className={styles.iconButtonGroup}>
              <button
                type="button"
                className={`${styles.chartTypeBtn} ${chartType === "line" ? styles.chartTypeBtnActive : ""}`}
                onClick={() => setChartType("line")}
                aria-pressed={chartType === "line"}
                aria-label="Line chart"
              >
                <TrendingUp size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`${styles.chartTypeBtn} ${chartType === "candlestick" ? styles.chartTypeBtnActive : ""}`}
                onClick={() => setChartType("candlestick")}
                aria-pressed={chartType === "candlestick"}
                aria-label="Candlestick chart"
              >
                <BarChart2 size={16} aria-hidden />
              </button>
            </div>
            <div className={styles.tabPills}>
              {(["Year", "Month", "Week", "Day"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.tabPill} ${activeTab === tab ? styles.tabPillActive : ""}`}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className={styles.statsColumn}>
          {displayMetrics.map((metric) => (
            <div key={metric.label} className={styles.statItem}>
              <span className={styles.statLabel}>{metric.label}</span>
              <span className={styles.statValue}>{metric.value}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
