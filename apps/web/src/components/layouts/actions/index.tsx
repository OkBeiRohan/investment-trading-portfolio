import { HeaderSearch } from "./search";
import { HeaderNotifications } from "./notifications";
import { HeaderSettings } from "./settings";
import styles from "./actions.module.css";
import HeaderUser from "./user";

export default function HeaderActions() {
  return (
    <div className={styles.actions}>
      <HeaderSearch />

      <HeaderNotifications />

      <HeaderSettings />

      <HeaderUser />
    </div>
  );
}
