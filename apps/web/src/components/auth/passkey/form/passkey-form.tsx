"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import styles from "./passkey-form.module.css";
import PrimaryButton from "@/components/form/button";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "@/lib/actions/authentication";
import Message from "@/components/form/message";

export function PasskeyForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.passkey();

      if (error) {
        setError(error.message || "Passkey authentication failed");
        setLoading(false);
      } else {
        await handleAuthSuccess();
      }

      console.log(data);
    } catch (err) {
      setError("Passkey authentication failed. Please try again.");
      setLoading(false);
      console.log(err);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.info}>
        <Fingerprint className={styles.infoIcon} />
        <p className={styles.infoText}>
          Use your device&apos;s biometric sensor or security key to sign in
          securely
        </p>
      </div>

      <PrimaryButton
        type="button"
        loading={loading}
        text="Authenticate with Passkey"
        onClick={handlePasskeyLogin}
      />

      {error && <Message type="error">{error}</Message>}
    </div>
  );
}
