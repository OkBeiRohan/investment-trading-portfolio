import styles from "./divider.module.css";

interface IDividerProps {
  text?: string;
  className?: string;
}

export default function Divider({ text, className }: IDividerProps) {
  return (
    <div className={`${styles.divider} ${className || ""}`}>
      {text && <span className={styles.text}>{text}</span>}
    </div>
  );
}
