import { FOOD_CATEGORIES } from '../../types';
import type { FoodItem } from '../../types';
import styles from './ResultDisplay.module.css';

interface ResultDisplayProps {
  item: FoodItem | null;
  isSpinning: boolean;
}

export function ResultDisplay({ item, isSpinning }: ResultDisplayProps) {
  if (isSpinning) {
    return (
      <div className={styles.wrapper} role="status" aria-live="polite" aria-busy="true">
        <p className={styles.spinning}>Spinning...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.wrapper} role="status" aria-live="polite">
        <p className={styles.hint}>Spin the wheel to decide what to eat!</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.wrapper} ${styles.result}`}
      role="status"
      aria-live="polite"
      aria-label={`Selected: ${item.name}, ${FOOD_CATEGORIES[item.category]}`}
    >
      <p className={styles.label}>You got</p>
      <p className={styles.name}>{item.name}</p>
      <span className={styles.category}>{FOOD_CATEGORIES[item.category]}</span>
    </div>
  );
}
