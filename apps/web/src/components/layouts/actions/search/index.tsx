import Form from "next/form";
import styles from "./search.module.css";
import { Search } from "lucide-react";

export function HeaderSearch() {
  return (
    <Form formMethod="get" action="/account" className={styles.searchContainer}>
      <input
        type="text"
        name="query"
        className={styles.searchInput}
        placeholder="Search..."
      />
      <button type="submit" className={styles.searchButton} title="Search">
        <Search />
      </button>
    </Form>
  );
}
