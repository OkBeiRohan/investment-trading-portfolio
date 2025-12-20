import styles from "./checkbox.module.css";

interface ICheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: string;
  id?: string;
  name: string;
}

export default function Checkbox({
  label,
  name,
  id = name,
  className,
  ...props
}: ICheckboxProps) {
  return (
    <div className={`${styles.checkboxWrapper} ${className || ""}`}>
      <input
        type="checkbox"
        id={id}
        name={name}
        className={styles.checkbox}
        {...props}
      />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
    </div>
  );
}
