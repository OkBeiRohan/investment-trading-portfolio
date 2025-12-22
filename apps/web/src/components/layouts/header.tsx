"use client";

import React from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/hooks/auth/use-auth";
import { Bell } from "lucide-react";
import styles from "./header.module.css";
import { usePathname } from "next/navigation";
import Logo from "./logo";

/**
 * Unified Header Component
 *
 * Dynamically displays title, breadcrumbs, and actions from NavigationContext.
 * No props needed - fully context-driven for maximum flexibility.
 *
 * Updates automatically when navigation state changes anywhere in the app.
 */
export function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const hasNotifications = false; // TODO: Implement notifications system

  // Routes that should not have sidebar/header
  const isAuthRoute = pathname.startsWith("/authentication");

  if (isAuthRoute) {
    return null;
  }

  return (
    <header className={styles.header}>
      <Logo />
      <nav className={styles.nav}></nav>
      <div className={styles.actions}></div>

      <div className={styles.right}>
        {/* Dynamic Actions from Context */}

        {/* Notifications */}
        <button
          className={`${styles.iconButton} ${hasNotifications ? styles.hasNotification : ""}`}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {hasNotifications && <span className={styles.notificationDot} />}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle iconOnly />

        {/* User Profile */}
        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            <span>
              {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </span>
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.name || "User"}</p>
            <p className={styles.userRole}>{user?.role || "Member"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
