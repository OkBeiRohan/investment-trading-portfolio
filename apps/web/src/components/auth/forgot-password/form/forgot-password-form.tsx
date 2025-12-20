"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import styles from "./forgot-password-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { forgotPasswordAction } from "@/lib/actions/authentication/forgot-password/forgot-password-action";
import Message from "@/components/form/message";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, {
    error: null,
  });

  return (
    <div className={styles.form}>
      {state.success ? (
        <Message type="success">{state.success}</Message>
      ) : (
        <form className={styles.form} action={formAction}>
          <Input
            type="email"
            name="email"
            label="Email Address"
            icon={<Mail />}
            placeholder="you@example.com"
            autoComplete="email"
            error={state.fieldErrors?.properties?.email}
            defaultValue={state.fieldValues?.email}
            required
          />

          <PrimaryButton
            type="submit"
            loading={isPending}
            text="Send Reset Link"
          />

          {state.error && <Message type="error">{state.error}</Message>}
        </form>
      )}
    </div>
  );
}
