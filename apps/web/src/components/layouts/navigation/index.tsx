import { IndianRupee, TrendingUp, Wallet } from "lucide-react";
import NavigationItem from "./navigation-item";
import styles from "./navigation.module.css";

export default function Navigation() {
  return (
    <nav className={styles.navigation}>
      <NavigationItem href="/account" label="Wealth" icon={<Wallet />} />
      <NavigationItem href="/" label="Expense" icon={<IndianRupee />} />
      <NavigationItem
        href="/organization"
        label="Trade"
        icon={<TrendingUp />}
      />
    </nav>
  );
}
