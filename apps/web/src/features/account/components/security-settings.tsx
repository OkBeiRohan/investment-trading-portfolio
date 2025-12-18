"use client";

import { useState } from "react";
import { Shield, KeyRound, Smartphone, Lock } from "lucide-react";
import styles from "./security-settings.module.css";
import PrimaryButton from "@/components/form/button";
import Input from "@/components/form/input";
import { authClient } from "@/lib/auth/auth-client";
import Message from "@/components/form/message";

export function SecuritySettings() {
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        setPasswordError(error.message || "Failed to update password");
      } else {
        setPasswordSuccess("Password updated successfully");
        (e.target as HTMLFormElement).reset();
      }
    } catch (err) {
      setPasswordError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Security Settings</h2>
        <p className={styles.subtitle}>
          Manage your password and two-factor authentication.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconContainer}>
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Password</h3>
            <p className={styles.sectionDesc}>Update your password securely.</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handlePasswordChange}>
          <div className={styles.grid}>
            <Input
              type="password"
              name="currentPassword"
              label="Current Password"
              icon={<Lock size={18} />}
              required
            />
            <div className={styles.newPasswordGroup}>
              <Input
                type="password"
                name="newPassword"
                label="New Password"
                icon={<Lock size={18} />}
                required
              />
              <Input
                type="password"
                name="confirmPassword"
                label="Confirm New Password"
                icon={<Lock size={18} />}
                required
              />
            </div>
          </div>

          <div className={styles.actions}>
            <PrimaryButton
              text="Update Password"
              type="submit"
              loading={loading}
            />
          </div>

          {passwordError && <Message type="error">{passwordError}</Message>}
          {passwordSuccess && <Message type="success">{passwordSuccess}</Message>}
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconContainer}>
            <Shield size={20} />
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Two-Factor Authentication</h3>
            <p className={styles.sectionDesc}>
              Add an extra layer of security to your account.
            </p>
          </div>
        </div>

        <div className={styles.tfaContent}>
          <div className={styles.tfaStatus}>
            <div className={styles.tfaInfo}>
              <p className={styles.tfaLabel}>Status</p>
              <span className={`${styles.badge} ${styles.disabled}`}>Disabled</span>
            </div>
            <p className={styles.tfaDetail}>
              Two-factor authentication is currently not enabled on your account.
            </p>
          </div>
          
          <button className={styles.enableButton}>
            Enable 2FA
          </button>
        </div>
      </div>
    </div>
  );
}
