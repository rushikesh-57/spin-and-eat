import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import styles from './AlertDialogProvider.module.css';

type AlertDialogTone = 'default' | 'danger';

type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AlertDialogTone;
};

type NoticeDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: AlertDialogTone;
};

type DialogState =
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      tone: AlertDialogTone;
    }
  | {
      kind: 'notice';
      title: string;
      message: string;
      confirmLabel: string;
      tone: AlertDialogTone;
    };

type AlertDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  notify: (options: NoticeDialogOptions) => Promise<void>;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

export function AlertDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const closeDialog = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        kind: 'confirm',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tone: options.tone ?? 'default',
      });
    });
  }, []);

  const notify = useCallback((options: NoticeDialogOptions) => {
    resolverRef.current?.(false);

    return new Promise<void>((resolve) => {
      resolverRef.current = (_confirmed: boolean) => resolve();
      setDialog({
        kind: 'notice',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'OK',
        tone: options.tone ?? 'default',
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDialog, dialog]);

  const contextValue = useMemo(
    () => ({
      confirm,
      notify,
    }),
    [confirm, notify]
  );

  return (
    <AlertDialogContext.Provider value={contextValue}>
      {children}
      {dialog ? (
        <div className={styles.overlay}>
          <div
            className={`${styles.card} ${
              dialog.tone === 'danger' ? styles.cardDanger : styles.cardDefault
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-message"
          >
            <div className={styles.header}>
              <span className={styles.eyebrow}>
                {dialog.kind === 'confirm' ? 'Please confirm' : 'Notice'}
              </span>
              <h2 id="alert-dialog-title" className={styles.title}>
                {dialog.title}
              </h2>
            </div>
            <p id="alert-dialog-message" className={styles.message}>
              {dialog.message}
            </p>
            <div className={styles.actions}>
              {dialog.kind === 'confirm' ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={
                  dialog.tone === 'danger' ? styles.dangerButton : styles.primaryButton
                }
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AlertDialogContext.Provider>
  );
}

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);

  if (!context) {
    throw new Error('useAlertDialog must be used within an AlertDialogProvider');
  }

  return context;
}
