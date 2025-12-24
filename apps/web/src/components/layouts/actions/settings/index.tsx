import ActiveLink from "@/components/form/link";
import styles from "./settings.module.css";
import { Settings } from "lucide-react";

export function HeaderSettings() {
  return (
    <ActiveLink href="/account/preferences" activeClassName={styles.active} className={styles.settingsButton}>
      <Settings size={20} />
    </ActiveLink>
  );
}
