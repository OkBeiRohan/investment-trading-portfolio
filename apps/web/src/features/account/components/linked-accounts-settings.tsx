"use client";

import { useState } from "react";
import { Link2, Trash2, Plus } from "lucide-react";
import styles from "./linked-accounts-settings.module.css";
import GoogleIcon from "@/components/icons/brands/Google";
import GitHubIcon from "@/components/icons/brands/GitHub";
import { authClient } from "@/lib/auth/auth-client";
import Message from "@/components/form/message";

export function LinkedAccountsSettings() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // In a real implementation, we would fetch the list of linked accounts from the server
  // const { data: linkedAccounts } = authClient.useListAccounts(); 
  // For now, we'll just show the UI for linking/unlinking

  const handleLinkAccount = async (provider: "google" | "github") => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await authClient.linkSocial({
        provider,
        callbackURL: "/account/linked-accounts",
      });

      if (error) {
        setError(error.message || `Failed to link ${provider}`);
      } else if (data) {
        // Redirect will happen
        console.log("Linking initiated", data);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Linked Accounts</h2>
        <p className={styles.subtitle}>
          Manage your connected social accounts for easier login.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconContainer}>
            <Link2 size={20} />
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Connected Accounts</h3>
            <p className={styles.sectionDesc}>
              Accounts currently linked to your profile.
            </p>
          </div>
        </div>

        {error && <Message type="error" className={styles.message}>{error}</Message>}

        <div className={styles.accountsList}>
          {/* Example of a linked account state - usually we'd map over actual linked accounts */}
          {/* This is a placeholder UI since we can't easily fetch linked accounts state client-side without a specific endpoint yet */}
          
          <div className={styles.accountItem}>
            <div className={styles.accountInfo}>
              <div className={styles.providerIcon}>
                <GoogleIcon />
              </div>
              <div>
                <p className={styles.providerName}>Google</p>
                <p className={styles.accountEmail}>Not linked</p>
              </div>
            </div>
            <button 
              className={styles.linkButton}
              onClick={() => handleLinkAccount("google")}
              disabled={loading}
            >
              Connect
            </button>
          </div>

          <div className={styles.accountItem}>
            <div className={styles.accountInfo}>
              <div className={styles.providerIcon}>
                <GitHubIcon />
              </div>
              <div>
                <p className={styles.providerName}>GitHub</p>
                <p className={styles.accountEmail}>Not linked</p>
              </div>
            </div>
            <button 
              className={styles.linkButton}
              onClick={() => handleLinkAccount("github")}
              disabled={loading}
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
