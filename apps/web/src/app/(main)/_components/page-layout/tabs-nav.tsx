"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./page-layout.module.css";
import { Route } from "next";

interface Tab {
  label: string;
  href: Route;
}

interface TabsNavProps {
  tabs: Tab[];
}

export function TabsNav({ tabs }: TabsNavProps) {
  const pathname = usePathname();

  return (
    <nav className={styles.tabsNav}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tabLink} ${isActive ? styles.tabLinkActive : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
