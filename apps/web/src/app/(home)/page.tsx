import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  LineChart,
  Wallet,
  ArrowRight,
} from "lucide-react";
import styles from "./home.module.css";

export default function DashboardPage() {
  // Ideally we fetch user data here or use a hook
  // const { data: session } = authClient.useSession();
  // But for a server component or simple client component, we can just render.
  // Since we need interactivity or hooks, let's make it use client if needed,
  // but for the dashboard links it can be static.
  // actually authClient.useSession is a hook, so "use client"

  return <DashboardContent />;
}

function DashboardContent() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome to your investment portfolio.</p>
      </div>

      <div className={styles.grid}>
        <Link href="/organizations" className={styles.card}>
          <div className={styles.cardIcon}>
            <Building2 size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Organizations</h3>
            <p className={styles.cardDescription}>
              Manage your trading teams and groups.
            </p>
          </div>
          <ArrowRight className={styles.arrow} size={20} />
        </Link>

        <Link href="/portfolio" className={styles.card}>
          <div className={styles.cardIcon}>
            <Wallet size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Portfolio</h3>
            <p className={styles.cardDescription}>
              View your asset allocation and performance.
            </p>
          </div>
          <ArrowRight className={styles.arrow} size={20} />
        </Link>

        <Link href="/strategies" className={styles.card}>
          <div className={styles.cardIcon}>
            <LineChart size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Strategies</h3>
            <p className={styles.cardDescription}>
              Configure and monitor trading strategies.
            </p>
          </div>
          <ArrowRight className={styles.arrow} size={20} />
        </Link>

        <Link href="/signals" className={styles.card}>
          <div className={styles.cardIcon}>
            <LayoutDashboard size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Signals</h3>
            <p className={styles.cardDescription}>
              Real-time market signals and alerts.
            </p>
          </div>
          <ArrowRight className={styles.arrow} size={20} />
        </Link>
      </div>
    </div>
  );
}
