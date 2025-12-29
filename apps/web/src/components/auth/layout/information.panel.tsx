"use client";

import { styleFont } from "@/lib/fonts";
import styles from "./information-panel.module.css";
import Link from "next/link";
import { ChevronRight, Shield, Zap, BarChart3 } from "lucide-react";
import LogoIcon from "@/assets/logo";
import { useLoginPageChecker } from "@/app/authentication/_contexts/login-page-checker";

export default function InformationPanel() {
  const { isLoginPage, showForm, getStarted } = useLoginPageChecker();

  return (
    <div
      className={styles.informationPanel}
      data-form-visible={showForm ? "true" : "false"}
    >
      {/* Top Section: Logo + Hero */}
      <div className={styles.informationPanelMainContent}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <LogoIcon />
          </div>
          <span className={styleFont.className}>Quantum Trades</span>
        </div>

        {/* Hero Content */}
        <div className={styles.hero}>
          <h1 className={`${styleFont.className} ${styles.heroTitle}`}>
            Your AI-Powered
            <span className={styles.gradient}> Trading </span>
            Companion
          </h1>

          <p className={styles.heroDescription}>
            Harness the power of algorithmic trading with real-time market
            analysis, intelligent portfolio management, and AI-driven
            strategies.
          </p>
        </div>

        {/* Feature Cards */}
        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Zap size={24} />
            </div>
            <h3>Real-Time Analytics</h3>
            <p>Lightning-fast market data processing with sub-second latency</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Shield size={24} />
            </div>
            <h3>Bank-Grade Security</h3>
            <p>End-to-end encryption with multi-factor authentication</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <BarChart3 size={24} />
            </div>
            <h3>AI Strategies</h3>
            <p>Machine learning models trained on years of market data</p>
          </div>
        </div>
      </div>

      {/* Bottom Section: CTA Button */}
      <div className={styles.ctaContainer}>
        {isLoginPage ? (
          <button onClick={getStarted} className={styles.ctaButton}>
            Get Started
            <ChevronRight size={20} />
          </button>
        ) : (
          <Link href="/authentication/login" className={styles.ctaButton}>
            Sign In
            <ChevronRight size={20} />
          </Link>
        )}
      </div>

      {/* Decorative Elements */}
      <div className={styles.decorativeCircle1} />
      <div className={styles.decorativeCircle2} />
    </div>
  );
}
