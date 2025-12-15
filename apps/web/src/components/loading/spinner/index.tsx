import { Loader2 } from "lucide-react";
import styles from "./spinner.module.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 40,
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <Loader2
      className={`${styles.spinner} ${className || ""}`}
      size={sizeMap[size]}
      role="status"
      aria-label="Loading"
    />
  );
}
