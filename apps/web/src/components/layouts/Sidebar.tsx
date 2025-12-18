"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/auth/use-auth";
import styles from "./sidebar.module.css";
import { Route } from "next";

interface SidebarItem {
  label: string;
  href: Route;
  icon: React.ElementType;
}

interface SidebarProps {
  items: SidebarItem[];
  title: string;
  backLink?: { label: string; href: Route };
  footerSlot?: React.ReactNode;
}

export function Sidebar({ items, title, backLink, footerSlot }: SidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        {backLink ? (
          <Link href={backLink.href} className={styles.backLink}>
            <ChevronLeft className={styles.icon} />
            {backLink.label}
          </Link>
        ) : (
          <span className={styles.title}>{title}</span>
        )}
      </div>
      <div className={styles.navContainer}>
        <nav className={styles.nav}>
          {items.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={index}
                href={item.href}
                className={`${styles.navItem} ${
                  isActive ? styles.navItemActive : ""
                }`}
              >
                <item.icon className={styles.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={styles.footer}>
        {footerSlot}
        <button onClick={() => signOut()} className={styles.signOutButton}>
          <LogOut className={styles.icon} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function MainSidebar() {
  const items: SidebarItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Portfolio", href: "/", icon: LayoutDashboard },
    { label: "Trades", href: "/", icon: LayoutDashboard },
    { label: "Strategies", href: "/", icon: LayoutDashboard },
    { label: "Organizations", href: "/organization", icon: Users },
    { label: "Account", href: "/account", icon: User },
  ];

  return <Sidebar items={items} title="Project Quantum" />;
}

export function OrgSidebar({
  // orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const items: SidebarItem[] = [
    // {
    //   label: "Overview",
    //   href: `/organization/${orgId}`,
    //   icon: LayoutDashboard,
    // },
    // {
    //   label: "Members",
    //   href: `/organization/${orgId}/members`,
    //   icon: Users,
    // },
    // {
    //   label: "Settings",
    //   href: `/organization/${orgId}/settings`,
    //   icon: Settings,
    // },
  ];

  return (
    <Sidebar
      items={items}
      title={orgName}
      backLink={{ label: "Back to Main", href: "/" }}
    />
  );
}

export function AccountSidebar() {
  const items: SidebarItem[] = [
    { label: "Profile", href: "/account", icon: User },
    { label: "Security", href: "/account/security", icon: Settings },
    { label: "Preferences", href: "/account/preferences", icon: Settings },
  ];

  return (
    <Sidebar
      items={items}
      title="My Account"
      backLink={{ label: "Back to Dashboard", href: "/" }}
    />
  );
}
