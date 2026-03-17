import { ArrowLeft } from "lucide-react";
import styles from "./page.module.css";
import { PortfolioGauge } from "./_components/portfolio-gauge";
import { PerformanceChart } from "./_components/performance-chart";
import { TradingMetrics } from "./_components/trading-metrics";
import { AIAssistant } from "./_components/ai-assistant";
import { TransactionsList } from "./_components/transactions";
import { AllocationChart } from "./_components/allocation-chart";
import {
  mockPortfolio,
  mockAllocation,
  mockPerformance,
  mockTransactions,
  mockAIMessages,
  mockTradingMetrics,
} from "./_data/mock";

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.breadcrumb}>
        <button className={styles.backBtn} type="button" aria-label="Go back">
          <ArrowLeft size={16} />
        </button>
        <span className={styles.breadcrumbPath}>
          <span className={styles.breadcrumbMuted}>Dashboard</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbActive}>My Portfolio</span>
        </span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.title}>My Portfolio</h1>

          <div className={styles.portfolioTabs}>
            <div className={`${styles.portfolioTab} ${styles.tabStock}`}>
              <div className={styles.tabBlobs}>
                <div className={`${styles.blob} ${styles.blobPink}`} />
                <div className={`${styles.blob} ${styles.blobBlue}`} />
              </div>
              <div className={styles.tabContent}>
                <span className={styles.tabLabel}>Stock Portfolio</span>
                <span className={styles.tabValue}>/$4,156.32</span>
              </div>
            </div>
            <div className={`${styles.portfolioTab} ${styles.tabCrypto}`}>
              <div className={styles.tabBlobs}>
                <div className={`${styles.blob} ${styles.blobAmber}`} />
                <div className={`${styles.blob} ${styles.blobGreen}`} />
              </div>
              <div className={styles.tabContent}>
                <span className={styles.tabLabel}>Crypto Portfolio</span>
                <span className={styles.tabValue}>/$3,156.32</span>
              </div>
            </div>
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

      <section className={styles.middleRow}>
        <div className={styles.graphSection}>
          <div className={styles.graphCard}>
            <div className={styles.graphMain}>
              <PerformanceChart data={mockPerformance} title="Graph" />
            </div>
            <div className={styles.graphMetrics}>
              <TradingMetrics metrics={mockTradingMetrics} />
            </div>
          </div>
        </div>
        <div className={styles.aiSection}>
          <AIAssistant messages={mockAIMessages} />
        </div>
      </section>

      <section className={styles.bottomRow}>
        <div className={styles.transfersSection}>
          <TransactionsList
            transactions={mockTransactions}
            title="Transfers"
          />
        </div>
        <div className={styles.spendingSection}>
          <AllocationChart
            allocations={mockAllocation}
            totalValue={mockPortfolio.totalValue}
          />
        </div>
      </section>
    </div>
  );
}
