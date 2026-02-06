import styles from "./header.module.css";
import Logo from "./logo";
import Navigation from "./navigation";
import HeaderActions from "./actions";
import { DateDisplay } from "./date-display";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Logo />
        <DateDisplay />
      </div>

      <Navigation />

      <div className={styles.rightSection}>
        <HeaderActions />
      </div>
    </header>
  );
}
