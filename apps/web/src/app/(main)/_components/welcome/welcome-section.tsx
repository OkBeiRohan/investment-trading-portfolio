import styles from "./welcome-section.module.css";
import { GreetingGenerator } from "./greeting-generator";

interface WelcomeSectionProps {
  userName?: string;
}

export function WelcomeSection({ userName = "User" }: WelcomeSectionProps) {
  return (
    <section className={styles.welcome}>
      <GreetingGenerator userName={userName} />
    </section>
  );
}
