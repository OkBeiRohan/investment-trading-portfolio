import styles from "./header.module.css";
import Logo from "./logo";
import Navigation from "./navigation";
import HeaderActions from "./actions";

export function Header() {
  return (
    <header className={styles.header}>
      <Logo />

      <Navigation />

      <HeaderActions />
    </header>
  );
}
