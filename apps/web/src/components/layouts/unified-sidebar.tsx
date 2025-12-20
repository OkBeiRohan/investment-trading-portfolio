"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { useNavigation } from "@/hooks/use-navigation";
import { useAuth } from "@/hooks/auth/use-auth";
import type {
  NavigationSection,
  NavigationItem,
  SubNavigationItem,
} from "@/contexts/navigation-context";
import styles from "./unified-sidebar.module.css";

interface UnifiedSidebarProps {
  className?: string;
}

export function UnifiedSidebar({ className }: UnifiedSidebarProps) {
  const { sections, activeSection, activeItem } = useNavigation();
  const { user } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(
      sections
        .filter((s: NavigationSection) => s.defaultExpanded)
        .map((s: NavigationSection) => s.id)
    )
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const renderSection = (section: (typeof sections)[0]) => {
    const isExpanded = expandedSections.has(section.id);

    return (
      <div key={section.id} className={styles.section}>
        {section.collapsible ? (
          <button
            onClick={() => toggleSection(section.id)}
            className={styles.sectionHeader}
          >
            <span className={styles.sectionLabel}>{section.label}</span>
            {section.collapsible && (
              <ChevronDown
                size={16}
                className={`${styles.sectionToggle} ${
                  !isExpanded ? styles.collapsed : ""
                }`}
              />
            )}
          </button>
        ) : (
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>{section.label}</span>
          </div>
        )}

        <div
          className={`${styles.items} ${
            section.collapsible && !isExpanded ? styles.collapsed : ""
          }`}
        >
          {section.items.map((item: NavigationItem) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.route || activeItem?.id === item.id;
            const hasActiveSubItem = item.subItems?.some(
              (sub: SubNavigationItem) => pathname === sub.route
            );

            return (
              <div key={item.id}>
                <Link
                  href={item.route}
                  className={`${styles.navItem} ${
                    isActive ? styles.active : ""
                  }`}
                >
                  {Icon && <Icon size={20} className={styles.navIcon} />}
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && (
                    <span className={styles.navBadge}>{item.badge}</span>
                  )}
                  {item.subItems && (
                    <ChevronRight size={16} className={styles.navIcon} />
                  )}
                </Link>

                {item.subItems && (isActive || hasActiveSubItem) && (
                  <div className={styles.subNav}>
                    {item.subItems.map((subItem: SubNavigationItem) => {
                      const isSubActive = pathname === subItem.route;

                      return (
                        <Link
                          key={subItem.id}
                          href={subItem.route}
                          className={`${styles.subNavItem} ${
                            isSubActive ? styles.active : ""
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${className || ""}`}
    >
      {/* Brand Section */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>U</div>
        <div className={styles.brandText}>
          <h1 className={styles.brandTitle}>UFOS</h1>
          <p className={styles.brandSubtitle}>Financial Operating System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>{sections.map(renderSection)}</nav>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={styles.collapseButton}
        >
          <ChevronLeft size={20} className={styles.collapseIcon} />
          <span className={styles.collapseLabel}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
