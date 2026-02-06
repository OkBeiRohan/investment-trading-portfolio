import styles from "./welcome-section.module.css";

interface GreetingGeneratorProps {
  userName: string;
}

export function GreetingGenerator({ userName }: GreetingGeneratorProps) {
  const hour = new Date().getHours();
  let greeting = "Hello";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 17) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }

  return (
    <div className={styles.greeting}>
      <h1 className={styles.title}>
        Hi, {userName}!
      </h1>
      <p className={styles.subtitle}>
        {greeting}. Here&apos;s your financial overview.
      </p>
    </div>
  );
}
