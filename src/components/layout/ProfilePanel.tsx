import styles from './ProfilePanel.module.css';

interface ProfilePanelProps {
  userName: string | null;
  onLogout: () => void;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function ProfilePanel({ userName, onLogout, onClose, theme, onToggleTheme }: ProfilePanelProps) {
  return (
    <section className={styles.profileSection} aria-label="Profile">
      <div className={styles.profileCard}>
        <p className={styles.profileEyebrow}>Signed in</p>
        <h2 className={styles.profileTitle}>Profile</h2>
        <p className={styles.profileName}>{userName}</p>
        <div className={styles.themeRow}>
          <div>
            <p className={styles.themeLabel}>Theme</p>
            <p className={styles.themeHint}>Choose light or dark mode.</p>
          </div>
          <button
            type="button"
            className={styles.themeButton}
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span className={styles.themeIcon} aria-hidden="true">
              {theme === 'dark' ? '☀' : '🌙'}
            </span>
          </button>
        </div>
        <div className={styles.profileActions}>
          <button type="button" className={styles.logoutButton} onClick={onLogout}>
            Log out
          </button>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </section>
  );
}
