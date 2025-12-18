"use client";

import React from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/hooks/auth/use-auth";
import { Bell } from "lucide-react";
import styles from "./header.module.css";

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {title && <h1 className={styles.title}>{title}</h1>}
      </div>

      <div className={styles.right}>
        {actions}
        
        <button className={styles.iconButton} aria-label="Notifications">
          <Bell size={20} />
        </button>

        <ThemeToggle iconOnly />

        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            <span>{user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}</span>
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
