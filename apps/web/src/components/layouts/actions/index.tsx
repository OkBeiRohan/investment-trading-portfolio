import { Bell } from "lucide-react";
import styles from "./actions.module.css";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { HeaderSearch } from "./search";

export default function HeaderActions() {
  return (
    <div className={styles.actions}>
      <HeaderSearch />

      {/* Notifications */}
      <button
        className={`${styles.iconButton} ${styles.hasNotification}`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        <span className={styles.notificationDot} />
      </button>

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User Profile */}
      <div className={styles.userProfile}>
        <div className={styles.avatar}>
          <span>US</span>
        </div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>User</p>
          <p className={styles.userRole}>Member</p>
        </div>
      </div>
    </div>
  );
}
