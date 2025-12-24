import styles from "./date.module.css";
import { getLocalDayName } from "./date.utils";

/**
 * Displays the current date and a calendar view with activities.
 * Eg: 23 | Mon, March
 *
 */
export default function WelcomeDate() {
  const date = new Date();

  return (
    <div className={styles.container}>
      <div className={styles.date}>{date.getDate()}</div>
      <div className={styles.info}>
        <div className={styles.day}>{getLocalDayName(date)}</div>
        <div className={styles.month}>{date.getMonth()}</div>
      </div>
    </div>
  );
}
