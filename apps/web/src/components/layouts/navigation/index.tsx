import styles from "./navigation.module.css";
import { Home, TrendingUp, Wallet } from "lucide-react";
import NavigationItem from "./navigation-item";

export default function Navigation() {
  return (
    <nav className={styles.navigation}>
      <NavigationItem href="/" label="Home" icon={<Home />} />
      <NavigationItem href="/account" label="Wealth" icon={<Wallet />} />
      <NavigationItem
        href="/organization"
        label="Trade"
        icon={<TrendingUp />}
      />
    </nav>
  );
}
