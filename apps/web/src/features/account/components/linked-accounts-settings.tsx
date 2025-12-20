"use client";

import { useEffect, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import styles from "./linked-accounts-settings.module.css";
import GoogleIcon from "@/components/icons/brands/Google";
import GitHubIcon from "@/components/icons/brands/GitHub";
import { authClient } from "@/lib/auth/auth-client";
import Message from "@/components/form/message";
import { IAccount } from "@repo/schema";

export function LinkedAccountsSettings() {
  const [linkedAccounts, setLinkedAccounts] = useState<IAccount[] | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch linked accounts on component mount
    authClient
      .listAccounts()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message || "Failed to load linked accounts");
        } else {
          setLinkedAccounts(data);
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to load linked accounts");
      });
  }, []); // Empty dependency array - run once on mount

  // Helper to check if account is linked
  const isLinked = (providerId: string) => {
    return linkedAccounts?.some((acc) => acc.providerId === providerId);
  };

  // Get linked account info
  const getAccountInfo = (providerId: string) => {
    return linkedAccounts?.find((acc) => acc.providerId === providerId);
  };

  const handleLinkAccount = async (provider: "google" | "github") => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await authClient.linkSocial({
        provider,
        callbackURL: "/account/linked",
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

  const handleUnlinkAccount = async (providerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await authClient.unlinkAccount({ providerId });
      if (error) {
        setError(error.message || `Failed to unlink ${providerId}`);
      } else {
        // Reload page to refresh accounts
        window.location.reload();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpstoxAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await authClient.oauth2.link({
        providerId: "upstox",
        callbackURL: "/account/linked",
        errorCallbackURL: "/account/linked",
      });
      if (error) {
        setError(error.message || `Failed to link Upstox`);
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

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case "google":
        return <GoogleIcon />;
      case "github":
        return <GitHubIcon />;
      case "upstox":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            UP
          </div>
        );
      case "credential":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            PW
          </div>
        );

      default:
        return providerId.substring(0, 2).toUpperCase();
    }
  };

  const getProviderName = (providerId: string) => {
    if (providerId === "credential") return "Password";

    return providerId.charAt(0).toUpperCase() + providerId.slice(1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Linked Accounts</h2>
        <p className={styles.subtitle}>
          Manage your connected social accounts and broker accounts.
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

        {error && (
          <Message type="error" className={styles.message}>
            {error}
          </Message>
        )}

        {loading ? (
          <div className={styles.loading}>Loading accounts...</div>
        ) : (
          <div className={styles.accountsList}>
            {/* Google */}
            <div className={styles.accountItem}>
              <div className={styles.accountInfo}>
                <div className={styles.providerIcon}>
                  <GoogleIcon />
                </div>
                <div>
                  <p className={styles.providerName}>Google</p>
                  <p className={styles.accountEmail}>
                    {isLinked("google")
                      ? getAccountInfo("google")?.userId || "Linked"
                      : "Not linked"}
                  </p>
                </div>
              </div>
              {isLinked("google") ? (
                <button
                  className={styles.unlinkButton}
                  onClick={() => handleUnlinkAccount("google")}
                  disabled={loading}
                >
                  <Trash2 size={16} /> Unlink
                </button>
              ) : (
                <button
                  className={styles.linkButton}
                  onClick={() => handleLinkAccount("google")}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>

            {/* GitHub */}
            <div className={styles.accountItem}>
              <div className={styles.accountInfo}>
                <div className={styles.providerIcon}>
                  <GitHubIcon />
                </div>
                <div>
                  <p className={styles.providerName}>GitHub</p>
                  <p className={styles.accountEmail}>
                    {isLinked("github")
                      ? getAccountInfo("github")?.userId || "Linked"
                      : "Not linked"}
                  </p>
                </div>
              </div>
              {isLinked("github") ? (
                <button
                  className={styles.unlinkButton}
                  onClick={() => handleUnlinkAccount("github")}
                  disabled={loading}
                >
                  <Trash2 size={16} /> Unlink
                </button>
              ) : (
                <button
                  className={styles.linkButton}
                  onClick={() => handleLinkAccount("github")}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Upstox */}
            <div className={styles.accountItem}>
              <div className={styles.accountInfo}>
                <div className={styles.providerIcon}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    UP
                  </div>
                </div>
                <div>
                  <p className={styles.providerName}>Upstox</p>
                  <p className={styles.accountEmail}>
                    {isLinked("upstox")
                      ? `Account: ${getAccountInfo("upstox")?.accountId || "Linked"}`
                      : "Not linked"}
                  </p>
                </div>
              </div>
              {isLinked("upstox") ? (
                <button
                  className={styles.unlinkButton}
                  onClick={() => handleUnlinkAccount("upstox")}
                  disabled={loading}
                >
                  <Trash2 size={16} /> Unlink
                </button>
              ) : (
                <button
                  className={styles.linkButton}
                  onClick={handleUpstoxAccount}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Show other linked accounts if any */}
            {linkedAccounts
              ?.filter(
                (acc) =>
                  !["google", "github", "upstox"].includes(acc.providerId)
              )
              .map((account) => (
                <div key={account.providerId} className={styles.accountItem}>
                  <div className={styles.accountInfo}>
                    <div className={styles.providerIcon}>
                      {getProviderIcon(account.providerId)}
                    </div>
                    <div>
                      <p className={styles.providerName}>
                        {getProviderName(account.providerId)}
                      </p>
                      <p className={styles.accountEmail}>
                        {new Date(account.createdAt).toLocaleDateString() ||
                          `Account: ${account.accountId}`}
                      </p>
                    </div>
                  </div>
                  <button
                    className={styles.unlinkButton}
                    onClick={() => handleUnlinkAccount(account.providerId)}
                    disabled={loading}
                  >
                    <Trash2 size={16} /> Unlink
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
