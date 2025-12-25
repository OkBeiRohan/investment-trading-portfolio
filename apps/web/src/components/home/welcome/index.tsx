import WelcomeDate from "./date";
import styles from "./welcome.module.css";

export function Welcome() {
  return (
    <div className={styles.container}>
      <WelcomeDate />
    </div>
  );
}
