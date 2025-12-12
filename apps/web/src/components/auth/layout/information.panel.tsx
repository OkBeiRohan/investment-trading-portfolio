import { styleFont } from "@/lib/fonts";
import styles from "./information-panel.module.css";

export default function InformationPanel() {
  return (
    <div className={styles.informationPanel}>
      <h1 className={styleFont.className}>Manage Your Portfolio</h1>
    </div>
  );
}
