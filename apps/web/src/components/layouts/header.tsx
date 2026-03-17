"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, ChevronDown } from "lucide-react";
import type { MarketTickerItem } from "@/app/(main)/_types";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import styles from "./header.module.css";

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

function getPageTitle(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/analytics")) return "Analytics";
  if (pathname.startsWith("/trade")) return "Trading";
  if (pathname.startsWith("/wealth")) return "Wealth";
  if (pathname.startsWith("/organization")) return "Organization";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/account")) return "Account";
  return "Dashboard";
}

export function Header({ marketTicker = [] }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.left}>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
            <span className={styles.pageSubtitle}>Overview</span>
          </div>
        </div>

        <div className={styles.center}>
          {marketTicker.slice(0, 4).map((item) => (
            <div key={item.symbol} className={styles.tickerItem}>
              <span className={styles.tickerSymbol}>{item.symbol}</span>
              <span className={styles.tickerPrice}>{formatPrice(item.price)}</span>
              <span className={item.changePercent >= 0 ? styles.tickerUp : styles.tickerDown}>
                {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        <div className={styles.right}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              className={styles.searchInput}
            />
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </div>

          <ThemeToggle iconOnly />

          <button className={styles.iconBtn} type="button" aria-label="Notifications">
            <Bell size={18} />
            <span className={styles.notifDot} />
          </button>

          <button className={styles.userBtn} type="button">
            <div className={styles.avatar}>
              <span className={styles.avatarText}>Q</span>
            </div>
            <ChevronDown size={14} className={styles.userChevron} />
          </button>
        </div>
      </div>
    </header>
  );
}
