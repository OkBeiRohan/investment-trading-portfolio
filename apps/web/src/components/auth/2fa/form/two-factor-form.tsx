"use client";

import { useActionState } from "react";
import { Shield } from "lucide-react";
import styles from "./two-factor-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { twoFactorAction } from "@/lib/actions/authentication/2fa/2fa-action";
import Message from "@/components/form/message";

export function TwoFactorForm() {
  const [state, formAction, isPending] = useActionState(twoFactorAction, {
    error: null,
  });

  return (
    <div className={styles.form}>
      <form className={styles.form} action={formAction}>
        <Input
          type="text"
          name="code"
          label="Verification Code"
          icon={<Shield />}
          placeholder="123456"
          autoComplete="one-time-code"
          error={state.fieldErrors?.properties?.code}
          defaultValue={state.fieldValues?.code}
          maxLength={6}
          pattern="[0-9]*"
          inputMode="numeric"
          required
        />

        <PrimaryButton type="submit" loading={isPending} text="Verify" />

        {state.error && <Message type="error">{state.error}</Message>}
      </form>
    </div>
  );
}
