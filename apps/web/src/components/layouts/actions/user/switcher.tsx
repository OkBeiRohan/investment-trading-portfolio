import { ChevronDown } from "lucide-react";
import styles from "./user.module.css";

export default function HeaderUserOrgSwitcher() {
  return (
    <div className={styles.switcher}>
      <ChevronDown size={18} />
    </div>
  );
}
