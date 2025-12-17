"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import styles from "./verify-phone.module.css";

export default function VerifyPhoneError() {
  return (
    <main className={styles.verifyPhoneMain}>
      <div className={styles.verifyPhoneContainer}>
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle size={32} color="#ef4444" />
      </div>
      <div>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: "600",
            color: "var(--color-text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Verification Error
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "1rem",
          }}
        >
          Something went wrong with phone verification. Please try again.
        </p>
      </div>
      <Link
        href="/authentication/login"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.875rem 1.5rem",
          background: "linear-gradient(135deg, var(--color-primary), #7c3aed)",
          color: "white",
          borderRadius: "12px",
          fontWeight: "600",
          textDecoration: "none",
          transition: "all 0.3s",
          boxShadow: "0 4px 12px rgba(129, 140, 248, 0.3)",
        }}
      >
        Back to Login
      </Link>
      </div>
    </main>
}
