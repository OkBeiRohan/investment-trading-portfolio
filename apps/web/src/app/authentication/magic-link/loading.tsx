import { Loader2 } from "lucide-react";

export default function MagicLinkLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        maxWidth: "440px",
        margin: "0 auto",
      }}
    >
      <Loader2
        size={48}
        color="var(--color-primary)"
        style={{
          animation: "spin 1s linear infinite",
        }}
      />
      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "1rem",
        }}
      >
        Loading magic link...
      </p>
    </div>
  );
}
