import styles from "./more.module.css";

export default async function MoreLoginPage({
  searchParams,
}: PageProps<"/authentication/more">) {
  return <div className={styles.container}>More Login Page</div>;
}
