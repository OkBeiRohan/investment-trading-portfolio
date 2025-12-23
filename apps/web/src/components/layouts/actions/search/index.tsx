import styles from "./search.module.css";

export function HeaderSearch() {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search..."
      />
    </div>
  );
}
