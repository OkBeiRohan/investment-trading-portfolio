import { Bell, Search, Moon, Sun } from "lucide-react";
import styles from "./header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search assets, markets..."
            className={styles.searchInput}
          />
          <kbd className={styles.searchKbd}>/</kbd>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} type="button" aria-label="Toggle theme">
          <Sun size={18} />
        </button>
        <button className={styles.iconBtn} type="button" aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.notifDot} />
        </button>
        <div className={styles.avatar}>
          <span className={styles.avatarText}>L</span>
        </div>
      </div>
    </header>
  );
}
