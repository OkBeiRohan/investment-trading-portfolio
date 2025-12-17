import { Loader2 } from "lucide-react";

export default function VerifyEmailLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        maxWidth: "440px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <Loader2
        size={48}
        color="var(--color-primary)"
        style={{
          animation: "spin 1s linear infinite",
        }}
      />
      <div>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "var(--color-text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Verifying Email
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "1rem",
          }}
        >
          Please wait while we verify your email address...
        </p>
      </div>
    </div>
  );
}
