import LogoIcon from "@/assets/logo";
import styles from "./logo.module.css";
import Link from "next/link";
import { styleFont } from "@/lib/fonts";

export default function Logo() {
  return (
    <Link href="/" className={styles.logo}>
      <div className={styles.icon}>
        <LogoIcon className={styles.iconSvg} />
      </div>
      <span className={styleFont.className}>Quantum Trades</span>
    </Link>
  );
}
