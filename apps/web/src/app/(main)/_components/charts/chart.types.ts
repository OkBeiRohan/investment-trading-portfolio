export interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutChartSegment[];
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export interface BarChartProps {
  data: BarChartDataItem[];
  height?: number;
  showLabels?: boolean;
  animate?: boolean;
}

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}
