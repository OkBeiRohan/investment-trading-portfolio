import { PropsWithChildren } from "react";
import styles from "./formGroup.module.css";

interface IFormGroupProps extends PropsWithChildren {
  label?: string;
  id?: string;
}

export default function FormGroup({ children, label, id }: IFormGroupProps) {
  return (
    <div className={styles.formGroup}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      {children}
    </div>
  );
}
