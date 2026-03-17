import styles from "./page.module.css";
import { PortfolioGauge } from "./_components/portfolio-gauge";
import { StatsGrid } from "./_components/stats-grid";
import { AllocationChart } from "./_components/allocation-chart";
import { PerformanceChart } from "./_components/performance-chart";
import { TradingMetrics } from "./_components/trading-metrics";
import { AIAssistant } from "./_components/ai-assistant";
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
  mockAIMessages,
  mockTradingMetrics,
} from "./_data/mock";

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.greeting}>
            <h1 className={styles.greetingTitle}>My Portfolio</h1>
            <p className={styles.greetingSubtitle}>
              Markets are looking positive today. Keep up the momentum!
            </p>
          </div>

          <div className={styles.portfolioTabs}>
            <button className={`${styles.tab} ${styles.tabActive}`} type="button">
              <span className={styles.tabDot} data-color="emerald" />
              Stock Portfolio
              <span className={styles.tabValue}>$84,156.32</span>
            </button>
            <button className={styles.tab} type="button">
              <span className={styles.tabDot} data-color="amber" />
              Crypto Portfolio
              <span className={styles.tabValue}>$44,272.68</span>
            </button>
          </div>
        </div>

        <div className={styles.heroRight}>
          <PortfolioGauge
            totalValue={mockPortfolio.totalValue}
            todayChange={mockPortfolio.todayChange}
            todayChangePercent={mockPortfolio.todayChangePercent}
            investedValue={mockPortfolio.investedValue}
          />
        </div>
      </section>

      <StatsGrid stats={mockStats} />

      <section className={styles.row}>
        <div className={styles.chartArea}>
          <div className={styles.chartCard}>
            <PerformanceChart data={mockPerformance} title="Graph" />
          </div>
        </div>
        <div className={styles.metricsArea}>
          <div className={styles.metricsCard}>
            <TradingMetrics metrics={mockTradingMetrics} />
          </div>
        </div>
        <div className={styles.aiArea}>
          <AIAssistant messages={mockAIMessages} />
        </div>
      </section>

      <section className={styles.rowTwo}>
        <div className={styles.colWide}>
          <AllocationChart
            allocations={mockAllocation}
            totalValue={mockPortfolio.totalValue}
          />
        </div>
        <div className={styles.colNarrow}>
          <RiskScore risk={mockRisk} />
        </div>
      </section>

      <section className={styles.rowTwo}>
        <div className={styles.colWide}>
          <TransactionsList
            transactions={mockTransactions}
            title="Transfers"
          />
        </div>
        <div className={styles.colNarrow}>
          <Watchlist items={mockWatchlist} />
        </div>
      </section>
    </div>
  );
}
