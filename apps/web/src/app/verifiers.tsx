import ThemeVerifier from "@/components/theme/theme-verifier";
import AuthVerifier from "@/verifiers/auth";

export default function Verifiers() {
  return (
    <>
      <AuthVerifier />
      <ThemeVerifier />
    </>
  );
}
