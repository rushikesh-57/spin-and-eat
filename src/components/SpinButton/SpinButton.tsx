import styles from './SpinButton.module.css';

interface SpinButtonProps {
  onClick: () => void;
  disabled: boolean;
  isSpinning?: boolean;
  'aria-label'?: string;
}

export function SpinButton({
  onClick,
  disabled,
  isSpinning = false,
  'aria-label': ariaLabel,
}: SpinButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${isSpinning ? styles.buttonSpinning : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? 'Spin the wheel to pick a random food'}
      aria-busy={isSpinning}
    >
      {isSpinning ? 'Spinning...' : 'Spin Now'}
    </button>
  );
}
