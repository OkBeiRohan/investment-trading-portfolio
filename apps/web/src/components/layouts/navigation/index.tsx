import Link from "next/link";
import styles from "./navigation.module.css";

export default function Navigation() {
  return (
    <nav className={styles.navigation}>
      <Link href="/">Home</Link>
      <Link href="/">Wealth</Link>
      <Link href="/">Trade</Link>
    </nav>
  );
}
