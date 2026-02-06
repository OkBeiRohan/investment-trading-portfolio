export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DonutChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface BarChartData {
  labels: string[];
  values: number[];
}
