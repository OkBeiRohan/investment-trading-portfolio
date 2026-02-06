"use client";

import { RefreshCw, Send, Download } from "lucide-react";
import styles from "./balance-card.module.css";
import { ActionButtonsProps } from "./balance-card.types";

export function ActionButtons({
  onPay,
  onTransfer,
  onReceive,
}: ActionButtonsProps) {
  return (
    <div className={styles.actionButtons}>
      <button className={styles.actionButton} onClick={onPay} type="button">
        <RefreshCw size={18} />
        <span>Pay</span>
      </button>
      <button
        className={styles.actionButton}
        onClick={onTransfer}
        type="button"
      >
        <Send size={18} />
        <span>Transfer</span>
      </button>
      <button
        className={styles.actionButton}
        onClick={onReceive}
        type="button"
      >
        <Download size={18} />
        <span>Receive</span>
      </button>
    </div>
  );
}
