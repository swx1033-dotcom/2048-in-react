import styles from "@/styles/flash.module.css";

interface FlashProps {
  active: boolean;
}

export default function Flash({ active }: FlashProps) {
  return active ? <div className={styles.flash} /> : null;
}
