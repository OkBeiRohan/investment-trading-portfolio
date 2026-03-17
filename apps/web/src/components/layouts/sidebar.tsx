"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  BarChart3,
  Wallet,
  Settings,
  Shield,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import styles from "./sidebar.module.css";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Wealth", href: "/wealth", icon: Wallet },
  { label: "Trade", href: "/trade/execution", icon: TrendingUp },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Strategies", href: "/trade/strategies", icon: LineChart },
];

const bottomItems = [
  { label: "Organization", href: "/organization", icon: Users },
  { label: "Admin", href: "/admin", icon: Shield },
  { label: "Settings", href: "/account", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.logoSection}>
        <div className={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="var(--color-emerald)" />
            <path
              d="M8 18L12 10L16 15L20 8"
              stroke="var(--color-bg-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {!collapsed && (
          <span className={styles.logoText}>Quantum</span>
        )}
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navGroup}>
          {!collapsed && <span className={styles.navLabel}>Menu</span>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {!collapsed && (
                  <span className={styles.navText}>{item.label}</span>
                )}
                {active && <span className={styles.activeIndicator} />}
              </Link>
            );
          })}
        </div>

        <div className={styles.navGroup}>
          {!collapsed && <span className={styles.navLabel}>System</span>}
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {!collapsed && (
                  <span className={styles.navText}>{item.label}</span>
                )}
                {active && <span className={styles.activeIndicator} />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={styles.footer}>
        <button className={styles.navItem} type="button">
          <span className={styles.navIcon}>
            <LogOut size={20} strokeWidth={1.8} />
          </span>
          {!collapsed && <span className={styles.navText}>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
