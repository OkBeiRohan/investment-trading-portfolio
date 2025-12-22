import Link from "next/link";
import styles from "./navigation.module.css";
import { Route } from "next";
import { Home, TrendingUp, Wallet } from "lucide-react";
import { usePathname } from "next/navigation";

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

function NavigationItem({
  href,
  label,
  icon,
}: {
  href: Route;
  label: string;
  icon?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === "/" || href === "/"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${styles.navigationItem} ${isActive ? styles.active : ""}`}
    >
      {icon}
      {label}
    </Link>
  );
}
