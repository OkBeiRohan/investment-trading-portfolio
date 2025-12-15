import { PropsWithChildren } from "react";
import styles from "./formGroup.module.css";

interface IFormGroupProps extends PropsWithChildren {
  label?: string;
  id?: string;
  error?: string;
}

export default function FormGroup({
  children,
  label,
  id,
  error,
}: IFormGroupProps) {
  return (
    <div className={styles.formGroup}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
