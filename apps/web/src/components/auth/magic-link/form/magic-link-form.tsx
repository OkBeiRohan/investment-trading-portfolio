"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import styles from "./magic-link-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { magicLinkAction } from "@/lib/actions/authentication/magic-link/magic-link-action";
import Message from "@/components/form/message";

export function MagicLinkForm() {
  const [state, formAction, isPending] = useActionState(magicLinkAction, {
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
            required
          />

          <PrimaryButton
            type="submit"
            loading={isPending}
            text="Send Magic Link"
          />

          {state.error && <Message type="error">{state.error}</Message>}
        </form>
      )}
    </div>
  );
}
