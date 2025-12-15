import { ReactNode } from "react";
import FormGroup from "../group";
import styles from "./input.module.css";

interface IInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  name: string;
  icon?: ReactNode;
  error?: string | string[];
}

export default function Input({
  label,
  name,
  id = name,
  icon,
  error,
  ...props
}: IInputProps) {
  const hasError = Array.isArray(error) ? error.length > 0 : !!error;

  return (
    <FormGroup label={label} id={id} error={error}>
      <div
        className={`${styles.inputWrapper} ${hasError ? styles.hasError : ""}`}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          id={id}
          name={name}
          className={styles.input}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? `${id}-error` : undefined}
          {...props}
        />
      </div>
    </FormGroup>
  );
}
