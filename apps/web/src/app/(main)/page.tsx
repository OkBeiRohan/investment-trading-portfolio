import styles from "./page.module.css";
import { PortfolioCard } from "./_components/portfolio-card";
import { StatsGrid } from "./_components/stats-grid";
import { AllocationChart } from "./_components/allocation-chart";
import { PerformanceChart } from "./_components/performance-chart";
import { TransactionsList } from "./_components/transactions";
import { Watchlist } from "./_components/watchlist";
import { RiskScore } from "./_components/risk-score";
import {
  mockPortfolio,
  mockAllocation,
  mockPerformance,
  mockWatchlist,
  mockRisk,
  mockStats,
  mockTransactions,
} from "./_data/mock";

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.greeting}>
        <div>
          <h1 className={styles.greetingTitle}>Welcome back, Leandro</h1>
          <p className={styles.greetingSubtitle}>
            Here&apos;s your portfolio overview for today
          </p>
        </div>
      </div>

      <StatsGrid stats={mockStats} />

      <div className={styles.row}>
        <div className={styles.colMain}>
          <PerformanceChart data={mockPerformance} />
        </div>
        <div className={styles.colSide}>
          <PortfolioCard
            portfolio={mockPortfolio}
            performance={mockPerformance}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.colMain}>
          <AllocationChart
            allocations={mockAllocation}
            totalValue={mockPortfolio.totalValue}
          />
        </div>
        <div className={styles.colSide}>
          <RiskScore risk={mockRisk} />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.colMain}>
          <TransactionsList transactions={mockTransactions} />
        </div>
        <div className={styles.colSide}>
          <Watchlist items={mockWatchlist} />
        </div>
      </div>
    </div>
  );
}
