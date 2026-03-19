import styles from "./page.module.css";
import { PortfolioHero } from "./_components/portfolio-hero";
import { CandlestickChart } from "./_components/candlestick-chart";
import { AIAssistant } from "./_components/ai-assistant";
import { TransfersCard } from "./_components/transfers-card";
import { SpendingOverview } from "./_components/spending-overview";
import {
  mockPortfolio,
  mockPortfolioPills,
  mockChartMetrics,
  mockAIMessages,
  mockAIKnowledge,
  mockTransfers,
  mockSpendingCategories,
} from "./_data/mock";

export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.heroRow}>
        <PortfolioHero
          totalValue={mockPortfolio.totalValue}
          pills={mockPortfolioPills}
        />
      </section>

      <section className={styles.middleRow}>
        <div className={styles.chartArea}>
          <CandlestickChart metrics={mockChartMetrics} />
        </div>
        <div className={styles.aiArea}>
          <AIAssistant
            initialMessages={mockAIMessages}
            knowledge={mockAIKnowledge}
          />
        </div>
      </section>

      <section className={styles.bottomRow}>
        <div className={styles.transfersArea}>
          <TransfersCard transfers={mockTransfers} />
        </div>
        <div className={styles.spendingArea}>
          <SpendingOverview
            totalValue={mockPortfolio.totalValue}
            weeklyChange={-30}
            categories={mockSpendingCategories}
          />
        </div>
      </section>
    </div>
  );
}
