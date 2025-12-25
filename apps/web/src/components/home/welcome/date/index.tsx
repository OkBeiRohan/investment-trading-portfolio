import { styleFont } from "@/lib/fonts";
import styles from "./date.module.css";
import {
  getLocalDateNumber,
  getLocalDayName,
  getLocalMonthName,
} from "./date.utils";

/**
 * Displays the current date and a calendar view with activities.
 * Eg: 23 | Mon, March
 *
 */
export default async function WelcomeDate() {
  const date = new Date();

  return (
    <div className={styles.container}>
      <div className={styles.date}>
        <span className={styleFont.className}>{getLocalDateNumber(date)}</span>
      </div>
      <div className={styles.info}>
        <div className={styles.day}>{getLocalDayName(date)}</div>
        <div className={styles.month}>{getLocalMonthName(date)}</div>
      </div>
    </div>
  );
}
