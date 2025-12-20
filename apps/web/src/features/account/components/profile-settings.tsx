"use client";

import { useAuth } from "@/hooks/auth/use-auth";
import { User, Mail, Phone, BadgeCheck } from "lucide-react";
import styles from "./profile-settings.module.css";
import Input from "@/components/form/input";
import PrimaryButton from "@/components/form/button";

export function ProfileSettings() {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Personal Information</h2>
        <p className={styles.subtitle}>
          Update your photo and personal details here.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            <span>{user?.name?.charAt(0) || user?.email?.charAt(0)}</span>
          </div>
          <div className={styles.avatarInfo}>
            <h3 className={styles.avatarName}>{user?.name}</h3>
            <p className={styles.avatarRole}>{user?.role || "Member"}</p>
          </div>
          <button className={styles.changeAvatarButton}>Change</button>
        </div>

        <form className={styles.form}>
          <div className={styles.grid}>
            <Input
              name="name"
              label="Full Name"
              defaultValue={user?.name || ""}
              icon={<User size={18} />}
            />
            <Input
              name="email"
              label="Email Address"
              defaultValue={user?.email || ""}
              icon={<Mail size={18} />}
              disabled
            />
            <Input
              name="phone"
              label="Phone Number"
              defaultValue={user?.phoneNumber || ""}
              icon={<Phone size={18} />}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className={styles.actions}>
            <PrimaryButton text="Save Changes" type="submit" />
          </div>
        </form>
      </div>

      <div className={styles.verificationSection}>
        <div className={styles.verificationHeader}>
          <h3 className={styles.verificationTitle}>Identity Verification</h3>
          <span className={`${styles.badge} ${user?.emailVerified ? styles.verified : styles.pending}`}>
            {user?.emailVerified ? "Verified" : "Pending"}
          </span>
        </div>
        <div className={styles.verificationContent}>
          <div className={styles.verificationItem}>
            <div className={styles.verificationIcon}>
              <BadgeCheck size={20} />
            </div>
            <div>
              <p className={styles.verificationLabel}>Email Verification</p>
              <p className={styles.verificationDesc}>
                {user?.emailVerified 
                  ? "Your email address has been verified." 
                  : "Please verify your email address to unlock all features."}
              </p>
            </div>
            {!user?.emailVerified && (
              <button className={styles.verifyButton}>Verify</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
