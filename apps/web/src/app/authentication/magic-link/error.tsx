"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function MagicLinkError() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        textAlign: "center",
        maxWidth: "440px",
        margin: "0 auto",
        animation: "slideUp 0.5s ease-out",
      }}
    >
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
          Magic Link Error
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "1rem",
          }}
        >
          There was an error with your magic link. Please try again.
        </p>
      </div>
      <Link
        href="/authentication/magic-link"
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
        Try Again
      </Link>
    </div>
  );
}
