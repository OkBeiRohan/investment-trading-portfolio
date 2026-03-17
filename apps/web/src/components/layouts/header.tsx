import { Bell, Search, Sun, Moon } from "lucide-react";
import styles from "./header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbMuted}>Dashboard</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbActive}>My Portfolio</span>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search assets, markets, strategies..."
            className={styles.searchInput}
          />
          <kbd className={styles.searchKbd}>/</kbd>
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} type="button" aria-label="Toggle theme">
          <Sun size={17} />
        </button>
        <button className={styles.iconBtn} type="button" aria-label="Notifications">
          <Bell size={17} />
          <span className={styles.notifDot} />
        </button>
        <div className={styles.userChip}>
          <div className={styles.avatar}>
            <span className={styles.avatarText}>L</span>
          </div>
          <span className={styles.userName}>Leandro</span>
        </div>
      </div>
    </header>
  );
}
