import styles from './LoginScreen.module.css';

interface LoginScreenProps {
  authError: string | null;
  isSubmitting: boolean;
  onLogin: () => void;
  onBack: () => void;
}

export function LoginScreen({ authError, isSubmitting, onLogin, onBack }: LoginScreenProps) {
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
          <button type="button" className={styles.loginButton} onClick={onLogin} disabled={isSubmitting}>
            <span className={styles.googleIcon} aria-hidden="true">
              <svg viewBox="0 0 533.5 544.3" role="img" focusable="false">
                <path
                  fill="#4285f4"
                  d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272v104.7h147.1c-6.1 33.7-25 63.5-53.2 83.4v69.2h85.9c50.4-46.4 81.7-114.9 81.7-202z"
                />
                <path
                  fill="#34a853"
                  d="M272 544.3c73.6 0 135.6-24.4 180.8-66.1l-85.9-69.2c-23.9 16.3-54.8 25.6-94.9 25.6-72.9 0-134.8-49.2-156.9-115.3H26.5v72.4C72.8 483.4 167.2 544.3 272 544.3z"
                />
                <path
                  fill="#fbbc04"
                  d="M115.1 319.3c-10.7-31.9-10.7-66.7 0-98.6V148.3H26.5c-38.9 77.6-38.9 169.8 0 247.4l88.6-76.4z"
                />
                <path
                  fill="#ea4335"
                  d="M272 107.7c42.1-.6 82.8 15.2 113.8 44.1l85.1-85.1C405.2 24.2 339.2-.8 272 0 167.2 0 72.8 60.9 26.5 148.3l88.6 72.4C137.2 156.9 199.1 107.7 272 107.7z"
                />
              </svg>
            </span>
            <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
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
