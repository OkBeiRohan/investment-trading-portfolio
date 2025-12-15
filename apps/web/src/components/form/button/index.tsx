import { Spinner } from "@/components/loading/spinner";
import styles from "./button.module.css";

interface IPrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  disabled?: boolean;
  text: string;
  title?: string;
}

export default function PrimaryButton({
  loading,
  disabled = loading,
  text,
  title = text,
  ...props
}: IPrimaryButtonProps) {
  return (
    <button
      disabled={disabled}
      className={styles.loginButton}
      title={title}
      {...props}
    >
      {loading && <Spinner size="lg" />}
      {text}
    </button>
  );
}
