import styles from "./page.module.css";
import { PortfolioGauge } from "./_components/portfolio-gauge";
import { PerformanceChart } from "./_components/performance-chart";
import { TradingMetrics } from "./_components/trading-metrics";
import { AIAssistant } from "./_components/ai-assistant";
import { TransactionsList } from "./_components/transactions";
import { AllocationChart } from "./_components/allocation-chart";
import { StatsGrid } from "./_components/stats-grid";
import { Watchlist } from "./_components/watchlist";
import {
  mockPortfolio,
  mockAllocation,
  mockPerformance,
  mockTransactions,
  mockAIMessages,
  mockTradingMetrics,
  mockStats,
  mockWatchlist,
} from "./_data/mock";

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.statsRow}>
        <StatsGrid stats={mockStats} />
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.chartArea}>
          <div className={styles.chartCard}>
            <PerformanceChart data={mockPerformance} title="Portfolio Performance" />
          </div>
        </div>
        <div className={styles.gaugeArea}>
          <PortfolioGauge
            totalValue={mockPortfolio.totalValue}
            todayChange={mockPortfolio.todayChange}
            todayChangePercent={mockPortfolio.todayChangePercent}
            investedValue={mockPortfolio.investedValue}
          />
        </div>
      </section>

      <section className={styles.middleGrid}>
        <div className={styles.metricsArea}>
          <TradingMetrics metrics={mockTradingMetrics} />
        </div>
        <div className={styles.watchlistArea}>
          <Watchlist items={mockWatchlist} />
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.transfersArea}>
          <TransactionsList
            transactions={mockTransactions}
            title="Recent Transactions"
          />
        </div>
        <div className={styles.allocationArea}>
          <AllocationChart
            allocations={mockAllocation}
            totalValue={mockPortfolio.totalValue}
          />
        </div>
        <div className={styles.aiArea}>
          <AIAssistant messages={mockAIMessages} />
        </div>
      </section>
    </div>
  );
}
