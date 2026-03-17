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
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import styles from "./sidebar.module.css";

const navItems = [
  { label: "Dashboard", href: "/" as const, icon: LayoutDashboard },
  { label: "Wealth", href: "/wealth" as const, icon: Wallet },
  { label: "Trade", href: "/trade/execution" as const, icon: TrendingUp },
  { label: "Analytics", href: "/analytics" as const, icon: BarChart3 },
  { label: "Strategies", href: "/trade/strategies" as const, icon: LineChart },
];

const bottomItems = [
  { label: "Organization", href: "/organization" as const, icon: Users },
  { label: "Admin", href: "/admin" as const, icon: Shield },
  { label: "Settings", href: "/account" as const, icon: Settings },
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
        <Link href="/" className={styles.logoLink}>
          <div className={styles.logoMark}>
            <Sparkles size={20} strokeWidth={2} />
          </div>
          {!collapsed && (
            <span className={styles.logoText}>Quantum</span>
          )}
        </Link>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                {active && <span className={styles.activeIndicator} />}
                <span className={styles.navIcon}>
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                </span>
                {!collapsed && (
                  <span className={styles.navText}>{item.label}</span>
                )}
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
                {active && <span className={styles.activeIndicator} />}
                <span className={styles.navIcon}>
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                </span>
                {!collapsed && (
                  <span className={styles.navText}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} type="button">
          <span className={styles.navIcon}>
            <LogOut size={18} strokeWidth={1.7} />
          </span>
          {!collapsed && <span className={styles.navText}>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
