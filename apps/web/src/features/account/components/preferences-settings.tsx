"use client";

import { Moon, Bell, Globe } from "lucide-react";
import styles from "./preferences-settings.module.css";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Checkbox from "@/components/form/input/checkbox";

export function PreferencesSettings() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Preferences</h2>
        <p className={styles.subtitle}>
          Customize your dashboard experience.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconContainer}>
            <Moon size={20} />
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Appearance</h3>
            <p className={styles.sectionDesc}>
              Choose your preferred theme mode.
            </p>
          </div>
        </div>

        <div className={styles.themeSection}>
          <p className={styles.label}>Interface Theme</p>
          <div className={styles.themeToggleWrapper}>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconContainer}>
            <Bell size={20} />
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Notifications</h3>
            <p className={styles.sectionDesc}>
              Manage how and when you receive alerts.
            </p>
          </div>
        </div>

        <div className={styles.notificationsForm}>
          <Checkbox 
            name="emailAlerts" 
            label="Email Alerts for Trade Executions" 
            defaultChecked 
          />
          <Checkbox 
            name="pushNotifications" 
            label="Push Notifications for Risk Alerts" 
            defaultChecked 
          />
          <Checkbox 
            name="marketingEmails" 
            label="Receive Product Updates and News" 
          />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.iconContainer}>
            <Globe size={20} />
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Localization</h3>
            <p className={styles.sectionDesc}>
              Set your language and region preferences.
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Language</label>
            <select className={styles.select} defaultValue="en">
              <option value="en">English (US)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Timezone</label>
            <select className={styles.select} defaultValue="utc">
              <option value="utc">UTC (Coordinated Universal Time)</option>
              <option value="est">EST (Eastern Standard Time)</option>
              <option value="ist">IST (Indian Standard Time)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
