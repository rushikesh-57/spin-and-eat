import type { FoodItem } from '../../types';
import styles from './ResultDisplay.module.css';

interface ResultDisplayProps {
  item: FoodItem | null;
  isSpinning: boolean;
  showHintWhenEmpty?: boolean;
  onDismiss?: () => void;
  onSpinAgain?: () => void;
  asDialog?: boolean;
}

export function ResultDisplay({
  item,
  isSpinning,
  showHintWhenEmpty = true,
  onDismiss,
  onSpinAgain,
  asDialog = false,
}: ResultDisplayProps) {
  if (isSpinning) {
    return null;
  }

  if (!item) {
    if (!showHintWhenEmpty) {
      return null;
    }

    return (
      <div className={styles.wrapper} role="status" aria-live="polite">
        <p className={styles.hint}>Spin the wheel to decide what to eat!</p>
      </div>
    );
  }

  const content = (
    <div
      className={`${styles.wrapper} ${styles.result} ${asDialog ? styles.dialogCard : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Selected: ${item.name}`}
    >
      {asDialog && onDismiss ? (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onDismiss}
          aria-label="Close selected result"
        >
          x
        </button>
      ) : null}
      <p className={styles.label}>You got</p>
      <p className={styles.name}>{item.name}</p>
      {asDialog && onSpinAgain ? (
        <button type="button" className={styles.spinAgainButton} onClick={onSpinAgain}>
          Spin again
        </button>
      ) : null}
    </div>
  );

  if (!asDialog) {
    return content;
  }

  return (
    <div className={styles.dialogOverlay} role="dialog" aria-modal="true" aria-label="Spin result">
      {content}
    </div>
  );
}
