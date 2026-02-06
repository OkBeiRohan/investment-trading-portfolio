import styles from "./page.module.css";
import { WelcomeSection } from "./_components/welcome";
import { BalanceCard } from "./_components/balance-card";
import { TransactionsList } from "./_components/transactions";
import { mockBalance, mockTransactions } from "./_data/mock";

export default function DashboardPage() {
  // TODO: Replace with actual user data from auth
  const userName = "Leandro";

  return (
    <main className={styles.dashboard}>
      <WelcomeSection userName={userName} />

      <div className={styles.grid}>
        {/* Balance Card - Left column */}
        <div className={styles.colSpan5}>
          <BalanceCard balance={mockBalance} />
        </div>

        {/* Transactions - Right column */}
        <div className={styles.colSpan7}>
          <TransactionsList transactions={mockTransactions} />
        </div>
      </div>
    </main>
  );
}
