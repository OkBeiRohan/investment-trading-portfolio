"use client";

import { useActionState } from "react";
import { Mail, KeyRound, User } from "lucide-react";
import styles from "./register-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { registerAction } from "@/lib/actions/authentication/register/register-action";
import Message from "@/components/form/message";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, {
    error: null,
  });

  return (
    <div className={styles.form}>
      <form className={styles.form} action={formAction}>
        <Input
          type="text"
          name="name"
          label="Full Name"
          icon={<User />}
          placeholder="John Doe"
          autoComplete="name"
          error={state.fieldErrors?.properties?.name}
          required
        />
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
        <Input
          type="password"
          name="password"
          label="Password"
          icon={<KeyRound />}
          placeholder="••••••••"
          autoComplete="new-password"
          error={state.fieldErrors?.properties?.password}
          required
        />

        <PrimaryButton
          type="submit"
          loading={isPending}
          text="Create Account"
        />

        {state.error && <Message type="error">{state.error}</Message>}
      </form>
    </div>
  );
}
