import styles from "./page.module.css";
import { PortfolioHero } from "./_components/portfolio-hero";
import { CandlestickChart } from "./_components/candlestick-chart";
import { AIAssistant } from "./_components/ai-assistant";
import { TransfersCard } from "./_components/transfers-card";
import { SpendingOverview } from "./_components/spending-overview";
import {
  mockPortfolioPills,
  mockChartMetrics,
  mockAIMessages,
  mockAIKnowledge,
  mockTransfers,
  mockSpendingCategories,
} from "./_data/mock";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3004";

async function fetchPortfolioValue(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/admin/trading/status`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.portfolioValue ?? 0;
  } catch {
    return 0;
  }
}

async function fetchDeployedModelsCount(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/admin/training/models`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const [portfolioValue, deployedModels] = await Promise.all([
    fetchPortfolioValue(),
    fetchDeployedModelsCount(),
  ]);

  const displayValue = portfolioValue > 0 ? portfolioValue : undefined;

  return (
    <div className={styles.dashboard}>
      <section className={styles.heroRow}>
        <PortfolioHero
          totalValue={displayValue ?? 0}
          pills={[
            ...mockPortfolioPills,
            { label: "Deployed Models", value: `${deployedModels}` },
          ]}
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
            totalValue={displayValue ?? 0}
            weeklyChange={0}
            categories={mockSpendingCategories}
          />
        </div>
      </section>
    </div>
  );
}
