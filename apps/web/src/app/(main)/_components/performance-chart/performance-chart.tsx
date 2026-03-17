"use client";

import type { PerformanceDataPoint } from "../../_types";
import styles from "./performance-chart.module.css";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  title?: string;
}

export function PerformanceChart({ data, title = "Performance" }: PerformanceChartProps) {
  if (data.length < 2) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.periodToggles}>
            {["1M", "3M", "6M", "1Y", "All"].map((p) => (
              <button key={p} type="button" className={styles.periodBtn}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartWrapper} />
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 400;
  const chartHeight = 180;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (i: number) =>
    padding.left + (i / (data.length - 1)) * innerWidth;
  const yScale = (v: number) =>
    padding.top + innerHeight - ((v - minVal) / range) * innerHeight;

  const linePoints = data
    .map((d, i) => `${xScale(i)},${yScale(d.value)}`)
    .join(" ");
  const areaPath = `M ${xScale(0)},${padding.top + innerHeight} L ${data
    .map((d, i) => `${xScale(i)},${yScale(d.value)}`)
    .join(" ")} L ${xScale(data.length - 1)},${padding.top + innerHeight} Z`;

  const ySteps = 4;
  const yLabels: number[] = [];
  for (let i = 0; i <= ySteps; i++) {
    yLabels.push(minVal + (range * i) / ySteps);
  }

  const xLabelIndices: number[] = [];
  const step = Math.max(1, Math.floor(data.length / 5));
  for (let i = 0; i < data.length; i += step) {
    xLabelIndices.push(i);
  }
  if (xLabelIndices[xLabelIndices.length - 1] !== data.length - 1) {
    xLabelIndices.push(data.length - 1);
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.periodToggles}>
          {["1M", "3M", "6M", "1Y", "All"].map((p) => (
            <button key={p} type="button" className={styles.periodBtn}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <svg
          className={styles.chartSvg}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient
              id="perfChartGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-emerald)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="var(--color-emerald)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          {yLabels.map((val, i) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={yScale(val)}
                x2={chartWidth - padding.right}
                y2={yScale(val)}
                stroke="var(--color-border-subtle)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <text
                x={padding.left - 8}
                y={yScale(val)}
                textAnchor="end"
                dominantBaseline="middle"
                className={styles.yAxis}
              >
                {formatValue(val)}
              </text>
            </g>
          ))}
          <path
            d={areaPath}
            fill="url(#perfChartGradient)"
          />
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--color-emerald)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {xLabelIndices.map((i) => (
            <text
              key={i}
              x={xScale(i)}
              y={chartHeight - 8}
              textAnchor="middle"
              className={styles.xAxis}
            >
              {formatDate(data[i]!.date)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
