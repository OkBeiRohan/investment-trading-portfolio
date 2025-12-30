"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";
import styles from "./login-form.module.css";
import Input from "@/components/form/input";
import Checkbox from "@/components/form/input/checkbox";
import PrimaryButton from "@/components/form/button";
import { loginAction } from "../../../../lib/actions/authentication/login/login-action";
import Form from "next/form";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <Form className={styles.form} action={formAction}>
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
      <Input
        type="password"
        name="password"
        label="Password"
        icon={<KeyRound />}
        placeholder="••••••••"
        autoComplete="current-password"
        error={state.fieldErrors?.properties?.password}
        defaultValue={state.fieldValues?.password}
        required
      />

      <Checkbox name="rememberMe" label="Remember me for 30 days" />

      <div className={styles.links}>
        <Link href="/authentication/forgot-password" className={styles.link}>
          Forgot password?
        </Link>
      </div>

      <PrimaryButton type="submit" loading={isPending} text="Sign In" />

      {state.error && <div className={styles.error}>{state.error}</div>}
    </Form>
  );
}
