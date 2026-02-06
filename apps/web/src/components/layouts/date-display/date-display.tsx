import styles from "./date-display.module.css";
import { getCurrentDateInfo } from "./get-current-date";

export function DateDisplay() {
  const { dayOfMonth, weekday, month } = getCurrentDateInfo();

  return (
    <div className={styles.container}>
      <span className={styles.day}>{dayOfMonth}</span>
      <div className={styles.details}>
        <span className={styles.weekday}>{weekday}</span>
        <span className={styles.month}>{month}</span>
      </div>
    </div>
  );
}
