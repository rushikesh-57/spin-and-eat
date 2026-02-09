import styles from './SpinButton.module.css';

interface SpinButtonProps {
  onClick: () => void;
  disabled: boolean;
  'aria-label'?: string;
}

export function SpinButton({ onClick, disabled, 'aria-label': ariaLabel }: SpinButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? 'Spin the wheel to pick a random food'}
    >
      Spin Now 🍽️
    </button>
  );
}
