"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/hooks/auth/use-auth";
import { useNavigation } from "@/hooks/use-navigation";
import type { Breadcrumb } from "@/contexts/navigation-context";
import { Bell, ChevronRight } from "lucide-react";
import styles from "./header.module.css";
import { usePathname } from "next/navigation";

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
  const { title, breadcrumbs, headerActions } = useNavigation();
  const pathname = usePathname();
  const hasNotifications = false; // TODO: Implement notifications system

  // Routes that should not have sidebar/header
  const isAuthRoute = pathname.startsWith("/authentication");

  if (isAuthRoute) {
    return null;
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Breadcrumbs Navigation */}
        {breadcrumbs.length > 0 && (
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            {breadcrumbs.map((crumb: Breadcrumb, index: number) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight
                    size={16}
                    className={styles.breadcrumbSeparator}
                    aria-hidden="true"
                  />
                )}
                {crumb.href ? (
                  <Link href={crumb.href} className={styles.breadcrumbLink}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={styles.breadcrumbCurrent}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Page Title (shows when no breadcrumbs) */}
        {title && breadcrumbs.length === 0 && (
          <h1 className={styles.title}>{title}</h1>
        )}
      </div>

      <div className={styles.right}>
        {/* Dynamic Actions from Context */}
        {headerActions && <div className={styles.actions}>{headerActions}</div>}

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
