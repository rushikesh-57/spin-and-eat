import type { SpinHistoryEntry } from '../../types';
import { useAlertDialog } from '../layout/AlertDialogProvider';
import styles from './SpinHistory.module.css';

interface SpinHistoryProps {
  history: SpinHistoryEntry[];
  onClear: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

export function SpinHistory({ history, onClear }: SpinHistoryProps) {
  const { confirm } = useAlertDialog();

  if (history.length === 0) {
    return (
      <section
        className={styles.wrapper}
        aria-labelledby="spin-history-heading"
        aria-label="Last 5 spins"
      >
        <h2 id="spin-history-heading" className={styles.heading}>
          Last 5 spins
        </h2>
        <p className={styles.empty}>No spins yet.</p>
      </section>
    );
  }

  return (
    <section
      className={styles.wrapper}
      aria-labelledby="spin-history-heading"
      aria-label="Last 5 spins"
    >
      <div className={styles.header}>
        <h2 id="spin-history-heading" className={styles.heading}>
          Last 5 spins
        </h2>
        <button
          type="button"
          onClick={async () => {
            const confirmed = await confirm({
              title: 'Clear spin history?',
              message: 'This will remove the recent spin results shown here.',
              confirmLabel: 'Clear history',
              tone: 'danger',
            });

            if (confirmed) {
              onClear();
            }
          }}
          className={styles.clearBtn}
          aria-label="Clear spin history"
        >
          Clear
        </button>
      </div>
      <ol className={styles.list} reversed aria-label="Recent spin results">
        {history.map((entry, i) => (
          <li key={`${entry.timestamp}-${i}`} className={styles.item}>
            <span className={styles.name}>{entry.foodName}</span>
            <time className={styles.time} dateTime={new Date(entry.timestamp).toISOString()}>
              {formatTime(entry.timestamp)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
