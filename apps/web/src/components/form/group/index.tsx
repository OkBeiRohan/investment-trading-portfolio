import { PropsWithChildren } from "react";
import styles from "./formGroup.module.css";

interface IFormGroupProps extends PropsWithChildren {
  label?: string;
  id?: string;
  error?: string | string[];
}

export default function FormGroup({
  children,
  label,
  id,
  error,
}: IFormGroupProps) {
  const errorMessage = Array.isArray(error) ? error[0] : error;

  return (
    <div className={styles.formGroup}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      {children}
      {errorMessage && <span className={styles.error}>{errorMessage}</span>}
    </div>
  );
}
