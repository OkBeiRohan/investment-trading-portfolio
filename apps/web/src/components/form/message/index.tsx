import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import styles from "./message.module.css";

type MessageType = "success" | "error" | "warning" | "info";

interface IMessageProps {
  type: MessageType;
  children: React.ReactNode;
  className?: string;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Message({ type, children, className }: IMessageProps) {
  const Icon = iconMap[type];

  return (
    <div className={`${styles.message} ${styles[type]} ${className || ""}`}>
      <Icon className={styles.icon} size={16} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
