"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import styles from "./reset-password-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { resetPasswordAction } from "@/lib/actions/authentication/reset-password/reset-password-action";
import Message from "@/components/form/message";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, {
    error: null,
  });

  return (
    <div className={styles.form}>
      <form className={styles.form} action={formAction}>
        <Input
          type="password"
          name="password"
          label="New Password"
          icon={<KeyRound />}
          placeholder="••••••••"
          autoComplete="new-password"
          error={state.fieldErrors?.properties?.password}
          defaultValue={state.fieldValues?.password}
          required
        />
        <Input
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          icon={<KeyRound />}
          placeholder="••••••••"
          autoComplete="new-password"
          error={state.fieldErrors?.properties?.confirmPassword}
          defaultValue={state.fieldValues?.confirmPassword}
          required
        />

        <PrimaryButton
          type="submit"
          loading={isPending}
          text="Reset Password"
        />

        {state.error && <Message type="error">{state.error}</Message>}
      </form>
    </div>
  );
}
