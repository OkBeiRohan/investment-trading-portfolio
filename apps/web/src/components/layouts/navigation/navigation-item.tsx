import { Route } from "next";
import styles from "./navigation.module.css";
import ActiveLink from "@/components/form/link";

export default function NavigationItem({
  href,
  label,
  icon,
}: {
  href: Route;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <ActiveLink
      href={href}
      className={styles.navigationItem}
      activeClassName={styles.active}
    >
      {icon}
      {label}
    </ActiveLink>
  );
}
