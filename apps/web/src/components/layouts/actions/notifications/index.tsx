import { Bell } from "lucide-react";
import styles from "./notifications.module.css";

export function HeaderNotifications() {
  return (
    <button
      type="button"
      className={styles.notificationButton}
      title="Notifications"
    >
      <Bell size={20} />
      <span className={styles.notificationDot} />
    </button>
  );
}
