import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PortfolioPill } from "../../_types";
import styles from "./portfolio-hero.module.css";

interface PortfolioHeroProps {
  totalValue: number;
  pills: PortfolioPill[];
}

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return CURRENCY_FORMAT.format(value);
}

function getPillVariantClass(variant: PortfolioPill["variant"]): string {
  const map: Record<PortfolioPill["variant"], string> = {
    stock: styles.pillStock ?? "",
    fo: styles.pillFo ?? "",
    crypto: styles.pillCrypto ?? "",
  };
  return map[variant];
}

export function PortfolioHero({ totalValue, pills }: PortfolioHeroProps) {
  return (
    <section className={styles.card}>
      <div className={styles.left}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>
            ← Dashboard
          </Link>
          <span className={styles.breadcrumbSeparator}> / </span>
          <span className={styles.breadcrumbCurrent}>My Portfolio</span>
        </nav>

        <h1 className={styles.title}>My Portfolio</h1>

        <div className={styles.pills}>
          {pills.map((pill, index) => (
            <div
              key={`${pill.label}-${index}`}
              className={`${styles.pill} ${getPillVariantClass(pill.variant)}`}
            >
              <div className={styles.pillBlob} aria-hidden />
              <div className={styles.pillContent}>
                <span className={styles.pillLabel}>{pill.label}</span>
                <span
                  className={
                    pill.value < 0 ? styles.pillValueNegative : styles.pillValue
                  }
                >
                  {formatCurrency(pill.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.gaugeSection}>
          <div className={styles.gaugeWrapper}>
            <svg
              viewBox="0 0 300 180"
              fill="none"
              className={styles.gaugeSvg}
              aria-hidden
            >
              <defs>
                <linearGradient
                  id="portfolioHeroGaugeGrad"
                  x1="0"
                  y1="0"
                  x2="300"
                  y2="0"
                >
                  <stop offset="0%" stopColor="var(--gauge-fill-start)" />
                  <stop offset="100%" stopColor="var(--gauge-fill-end)" />
                </linearGradient>
              </defs>
              <path
                d="M 30 160 A 120 120 0 0 1 270 160"
                className={styles.gaugeTrack}
                fill="none"
                strokeWidth={12}
                strokeLinecap="round"
              />
              <path
                d="M 30 160 A 120 120 0 0 1 270 160"
                className={styles.gaugeTrack}
                fill="none"
                strokeWidth={12}
                strokeLinecap="round"
              />
              <path
                d="M 30 160 A 120 120 0 0 1 270 160"
                className={styles.gaugeFill}
                fill="none"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray="377"
                strokeDashoffset="75"
              />
              <circle cx={68} cy={82} r={5} className={styles.gaugeDot} />
              <circle cx={150} cy={40} r={5} className={styles.gaugeDot} />
              <circle cx={240} cy={90} r={5} className={styles.gaugeDot} />
            </svg>
            <div className={styles.gaugeInfo}>
              <span className={styles.gaugeLabel}>Total portfolio value</span>
              <span className={styles.gaugeValue}>
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
          <Link href="/wealth" className={styles.viewBtn}>
            View
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
