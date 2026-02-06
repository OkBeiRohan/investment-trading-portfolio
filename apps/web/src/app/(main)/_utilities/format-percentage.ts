export function formatPercentage(value: number, includeSign: boolean = true): string {
  const formatted = Math.abs(value).toFixed(2);
  const sign = includeSign ? (value >= 0 ? "+" : "-") : "";
  return `${sign}${formatted}%`;
}
