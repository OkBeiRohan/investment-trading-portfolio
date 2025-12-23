import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Bell } from "lucide-react";
import styles from "./header.module.css";
import Logo from "./logo";
import Navigation from "./navigation";

export function Header() {
  const user: unknown = undefined;
  const hasNotifications = false; // TODO: Implement notifications system

  return (
    <header className={styles.header}>
      <Logo />

      <Navigation />

      <div className={styles.actions}></div>

      <div className={styles.right}>
        {/* Notifications */}
        <button
          className={`${styles.iconButton} ${hasNotifications ? styles.hasNotification : ""}`}
          aria-label="Notifications"
        >
          <Bell size={20} />
          {hasNotifications && <span className={styles.notificationDot} />}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

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
