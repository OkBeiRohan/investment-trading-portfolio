import { Suspense } from "react";
import { Metadata } from "next";
import styles from "./analytics.module.css";
import { AnalyticsFilters } from "./_components/analytics-filters";

export const metadata: Metadata = {
  title: "Analytics | Quantum Investments",
  description: "Analyze your investment performance and trading activity",
};

export default function AnalyticsLayout({
  children,
  performance,
  breakdown,
  trends,
  goals,
}: LayoutProps<'/analytics'>) {
  return (
    <div className={styles.analyticsPage}>
      {/* Header with filters */}
      <header className={styles.analyticsHeader}>
        <div>
          <h1 className={styles.analyticsTitle}>Analytics</h1>
          <p className={styles.analyticsSubtitle}>
            Track your investment performance and activity
          </p>
        </div>
        <Suspense fallback={null}>
          <AnalyticsFilters />
        </Suspense>
      </header>

      {/* Parallel Slots Grid */}
      <div className={styles.slotsGrid}>
        {/* Performance - Main chart (8 cols) */}
        <div className={styles.slotPerformance}>
          <Suspense fallback={<PerformanceSkeleton />}>
            {performance}
          </Suspense>
        </div>

        {/* Breakdown - Donut chart (4 cols) */}
        <div className={styles.slotBreakdown}>
          <Suspense fallback={<BreakdownSkeleton />}>
            {breakdown}
          </Suspense>
        </div>

        {/* Trends - Bar chart (6 cols) */}
        <div className={styles.slotTrends}>
          <Suspense fallback={<TrendsSkeleton />}>
            {trends}
          </Suspense>
        </div>

        {/* Goals - Progress rings (6 cols) */}
        <div className={styles.slotGoals}>
          <Suspense fallback={<GoalsSkeleton />}>
            {goals}
          </Suspense>
        </div>

        {/* Main content area (12 cols) */}
        <div className={styles.slotActivity}>
          <Suspense>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}

// Skeleton components
function PerformanceSkeleton() {
  return (
    <div className={styles.slotCard} style={{ height: "300px" }}>
      <div style={{ background: "var(--color-bg-tertiary)", height: "100%", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <div className={styles.slotCard} style={{ height: "300px" }}>
      <div style={{ background: "var(--color-bg-tertiary)", height: "100%", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div className={styles.slotCard} style={{ height: "240px" }}>
      <div style={{ background: "var(--color-bg-tertiary)", height: "100%", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );
}

function GoalsSkeleton() {
  return (
    <div className={styles.slotCard} style={{ height: "240px" }}>
      <div style={{ background: "var(--color-bg-tertiary)", height: "100%", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease-in-out infinite" }} />
    </div>
  );
}
