import { ReactNode } from "react";
import FormGroup from "../group";
import styles from "./input.module.css";

interface IInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  name: string;
  icon?: ReactNode;
  error?: string | string[] | { errors: string[] };
}

export default function Input({
  label,
  name,
  id = name,
  icon,
  error,
  ...props
}: IInputProps) {
  let hasError = false,
    errorMessage: string | undefined;

  if (typeof error === "string") {
    hasError = !!error;
    errorMessage = error;
  } else if (Array.isArray(error)) {
    hasError = error.length > 0;
    errorMessage = error.join(", ");
  } else if (error && "errors" in error) {
    hasError = error.errors.length > 0;
    errorMessage = error.errors.join(", ");
  }

  return (
    <FormGroup label={label} id={id} error={errorMessage}>
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
