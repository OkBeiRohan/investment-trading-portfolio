import { SkeletonInput } from "@/components/form/input/skeleton";
import styles from "./login-form.module.css";

export default function SkeletonLoginForm() {
  return (
    <div className={styles.form}>
      <div className={styles.form}>
        <SkeletonInput label icon />
        <SkeletonInput label icon />
      </div>
    </div>
  );
}
