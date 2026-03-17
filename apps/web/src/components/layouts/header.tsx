"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Globe } from "lucide-react";
import type { MarketTickerItem } from "@/app/(main)/_types";
import styles from "./header.module.css";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Analytic", href: "/analytics" },
  { label: "Trading", href: "/trade/execution" },
];

interface HeaderProps {
  marketTicker?: MarketTickerItem[];
}

function formatPrice(value: number) {
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toFixed(2);
}

export function Header({ marketTicker = [] }: HeaderProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={styles.logoIcon}>
              <rect width="24" height="24" rx="6" fill="var(--color-primary)" />
              <path d="M7 16L10.5 9L14 13L17 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.logoText}>Quantum</span>
          </Link>

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.navActive : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button className={styles.marketSelector} type="button">
            <Globe size={14} />
            <span>Market: BTC/USDT</span>
          </button>
        </div>

        <div className={styles.right}>
          {marketTicker.slice(0, 3).map((item) => (
            <div key={item.symbol} className={styles.tickerItem}>
              <span className={styles.tickerName}>{item.name}</span>
              <span className={styles.tickerPrice}>{formatPrice(item.price)}</span>
              <span className={item.changePercent >= 0 ? styles.tickerBadgeUp : styles.tickerBadgeDown}>
                {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(0)}%
              </span>
            </div>
          ))}

          <button className={styles.iconBtn} type="button" aria-label="Search">
            <Search size={18} />
          </button>
          <button className={styles.iconBtn} type="button" aria-label="Notifications">
            <Bell size={18} />
            <span className={styles.notifDot} />
          </button>
          <div className={styles.avatar}>
            <span className={styles.avatarText}>L</span>
          </div>
        </div>
      </div>
    </header>
  );
}
