import styles from './LoginScreen.module.css';

interface LoginScreenProps {
  authError: string | null;
  onLogin: () => void;
  onBack: () => void;
}

export function LoginScreen({ authError, onLogin, onBack }: LoginScreenProps) {
  return (
    <section className={styles.loginSection} aria-label="Login">
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <p className={styles.loginEyebrow}>Welcome back</p>
          <h2 className={styles.loginTitle}>Sign in to Spin &amp; Eat</h2>
          <p className={styles.loginTagline}>
            Use Google to start spinning, save your history, and manage your kitchen.
          </p>
        </div>
        <div className={styles.loginActions}>
          <button type="button" className={styles.loginButton} onClick={onLogin}>
            Continue with Google
          </button>
          <p className={styles.loginNote}>
            {authError ? `Sign-in failed: ${authError}` : 'You will be redirected to Google.'}
          </p>
        </div>
        <button type="button" className={styles.backButton} onClick={onBack}>
          Back to Spin
        </button>
      </div>
    </section>
  );
}
