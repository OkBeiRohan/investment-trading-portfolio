"use client";

import { styleFont } from "@/lib/fonts";
import styles from "./information-panel.module.css";
import Link from "next/link";
import { ChevronRight, TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";

interface InformationPanelProps {
  onGetStarted?: () => void;
  showForm?: boolean;
  isLoginPage?: boolean;
}

export default function InformationPanel({
  onGetStarted,
  showForm,
  isLoginPage,
}: InformationPanelProps) {
  return (
    <div className={styles.informationPanel}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <TrendingUp size={32} strokeWidth={2.5} />
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
          analysis, intelligent portfolio management, and AI-driven strategies.
        </p>

        {/* CTA - Only show on mobile when form is hidden */}
        <div className={styles.ctaContainer}>
          {isLoginPage ? (
            <button onClick={onGetStarted} className={styles.ctaButton}>
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

      {/* Decorative Elements */}
      <div className={styles.decorativeCircle1} />
      <div className={styles.decorativeCircle2} />
    </div>
  );
}
