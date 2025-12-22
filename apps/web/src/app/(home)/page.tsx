"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  LineChart,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { useNavigation } from "@/hooks/use-navigation";
import styles from "./home.module.css";

export default function DashboardPage() {
  const { setNavigation } = useNavigation();

  useEffect(() => {
    setNavigation({
      title: "Dashboard",
      breadcrumbs: [{ label: "Home" }],
    });
  }, [setNavigation]);

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
        <Link href="/organization" className={styles.card}>
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

        <Link href="/" className={styles.card}>
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

        <Link href="/" className={styles.card}>
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

        <Link href="/" className={styles.card}>
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
