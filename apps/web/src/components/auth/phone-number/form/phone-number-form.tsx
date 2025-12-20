"use client";

import { useActionState, useState } from "react";
import { Phone } from "lucide-react";
import styles from "./phone-number-form.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";
import { sendPhoneOtpAction } from "@/lib/actions/authentication/phone-number/send-otp-action";
import { verifyPhoneOtpAction } from "@/lib/actions/authentication/phone-number/verify-otp-action";
import Message from "@/components/form/message";

export function PhoneNumberForm() {
  const [otpSent, setOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [sendState, sendFormAction, isSending] = useActionState(
    sendPhoneOtpAction,
    {
      error: null,
    }
  );

  const [verifyState, verifyFormAction, isVerifying] = useActionState(
    verifyPhoneOtpAction,
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
              setPhoneNumber(formData.get("phoneNumber") as string);
            }}
          >
            <Input
              type="tel"
              name="phoneNumber"
              label="Phone Number"
              icon={<Phone />}
              placeholder="+1234567890"
              autoComplete="tel"
              error={sendState.fieldErrors?.properties?.phoneNumber}
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
          <input type="hidden" name="phoneNumber" value={phoneNumber} />
          <Input
            type="text"
            name="code"
            label="Verification Code"
            icon={<Phone />}
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
