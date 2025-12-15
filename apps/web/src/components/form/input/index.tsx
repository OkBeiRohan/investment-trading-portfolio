import { ReactNode } from "react";
import FormGroup from "../group";
import styles from "./input.module.css";

interface IInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
  name: string;
  icon?: ReactNode;
}

export default function Input({
  label,
  name,
  id = name,
  icon,
  ...props
}: IInputProps) {
  return (
    <FormGroup label={label} id={id}>
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input id={id} name={name} className={styles.input} {...props} />
      </div>
    </FormGroup>
  );
}
