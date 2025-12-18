"use client";

import { useActionState, useState } from "react";
import { Mail } from "lucide-react";
import styles from "./email-otp-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { sendEmailOtpAction } from "@/lib/actions/authentication/email-otp/send-otp-action";
import { verifyEmailOtpAction } from "@/lib/actions/authentication/email-otp/verify-otp-action";
import Message from "@/components/form/message";

export function EmailOtpForm() {
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");

  const [sendState, sendFormAction, isSending] = useActionState(
    sendEmailOtpAction,
    {
      error: null,
    }
  );

  const [verifyState, verifyFormAction, isVerifying] = useActionState(
    verifyEmailOtpAction,
    {
      error: null,
    }
  );

  // Handle OTP sent success
  if (sendState.success && !otpSent) {
    setOtpSent(true);
  }

  return (
    <div className={styles.form}>
      {!otpSent ? (
        <>
          {sendState.success && (
            <Message type="success">{sendState.success}</Message>
          )}
          <form
            className={styles.form}
            action={sendFormAction}
            onSubmit={(e) => {
              const formData = new FormData(e.currentTarget);
              setEmail(formData.get("email") as string);
            }}
          >
            <Input
              type="email"
              name="email"
              label="Email Address"
              icon={<Mail />}
              placeholder="you@example.com"
              autoComplete="email"
              error={sendState.fieldErrors?.properties?.email}
              required
            />

            <PrimaryButton type="submit" loading={isSending} text="Send OTP" />

            {sendState.error && (
              <Message type="error">{sendState.error}</Message>
            )}
          </form>
        </>
      ) : (
        <form className={styles.form} action={verifyFormAction}>
          <input type="hidden" name="email" value={email} />
          <Input
            type="text"
            name="code"
            label="Verification Code"
            icon={<Mail />}
            placeholder="123456"
            autoComplete="one-time-code"
            error={verifyState.fieldErrors?.properties?.code}
            maxLength={6}
            pattern="[0-9]*"
            inputMode="numeric"
            required
          />

          <PrimaryButton
            type="submit"
            loading={isVerifying}
            text="Verify OTP"
          />

          {verifyState.error && (
            <Message type="error">{verifyState.error}</Message>
          )}
        </form>
      )}
    </div>
  );
}
