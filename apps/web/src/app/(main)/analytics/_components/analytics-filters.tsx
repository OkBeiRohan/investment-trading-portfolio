"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import styles from "../analytics.module.css";
import { Route } from "next";

const TIME_RANGES = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "1y", label: "1 Year" },
  { value: "all", label: "All Time" },
];

export function AnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentRange = searchParams.get("range") || "30d";

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}` as Route);
  };

  return (
    <div className={styles.filtersContainer}>
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => handleRangeChange(range.value)}
          className={`${styles.filterButton} ${
            currentRange === range.value ? styles.filterButtonActive : ""
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
