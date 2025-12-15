import { styleFont } from "@/lib/fonts";
import styles from "./information-panel.module.css";

export default function InformationPanel() {
  return (
    <div className={styles.informationPanel}>
      <h1 className={styleFont.className}>Manage Your Portfolio and Trade</h1>
      <p>
        Welcome to our Investment Trading Portfolio platform. Access your
        personalized dashboard to monitor your investments, execute trades, and
        analyze market trends all in one place.
      </p>
      <h2>Your Personal Wealth Manager</h2>
      <p>
        Our platform offers advanced tools to help you make informed decisions
        about your portfolio. Track your net worth, review active strategies,
        and manage your accounts with ease.
      </p>
      <h2>Trade with AI</h2>
      <p>
        Leverage cutting-edge AI algorithms to optimize your trading strategies.
        Our system analyzes market data in real-time to provide you with the
        best opportunities for growth.
      </p>
    </div>
  );
}
