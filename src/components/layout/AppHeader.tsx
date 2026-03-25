import styles from './AppHeader.module.css';
import { useAlertDialog } from './AlertDialogProvider';

interface AppHeaderProps {
  isLoggedIn: boolean;
  userName: string | null;
  activeTab: 'spin' | 'kitchen' | 'cook' | 'custom' | 'profile';
  onTabChange: (tab: 'spin' | 'kitchen' | 'cook' | 'custom' | 'profile') => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
  canInstallApp: boolean;
  isAppInstalled: boolean;
  onInstallApp: () => Promise<boolean>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function getInitial(name: string | null) {
  if (!name) {
    return '?';
  }
  return name.trim().charAt(0).toUpperCase();
}

export function AppHeader({
  isLoggedIn,
  userName,
  activeTab,
  onTabChange,
  onLoginClick,
  onProfileClick,
  onLogout,
  canInstallApp,
  isAppInstalled,
  onInstallApp,
  theme,
  onToggleTheme,
}: AppHeaderProps) {
  const { notify } = useAlertDialog();

  const handleInstallClick = async () => {
    if (isAppInstalled) {
      await notify({
        title: 'App already installed',
        message: 'Spin & Eat is already installed on this device.',
      });
      return;
    }

    if (canInstallApp) {
      await onInstallApp();
      return;
    }

    await notify({
      title: 'Install Spin & Eat',
      message:
        'If the install prompt is not ready yet, refresh once after the app loads. If it still does not appear, use the browser menu or Share menu and choose Install app or Add to Home Screen.',
    });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo} aria-hidden="true">
            <div className={styles.logoDot} />
          </div>
          <div>
            <p className={styles.title}>Spin &amp; Eat</p>
            <p className={styles.subtitle}>Let the wheel decide</p>
          </div>
        </div>

        <nav className={styles.desktopNav} aria-label="Primary">
          <button
            type="button"
            className={activeTab === 'spin' ? styles.navButtonActive : styles.navButton}
            onClick={() => onTabChange('spin')}
          >
            Spin
          </button>
          <button
            type="button"
            className={activeTab === 'kitchen' ? styles.navButtonActive : styles.navButton}
            onClick={() => onTabChange('kitchen')}
          >
            Kitchen
          </button>
          <button
            type="button"
            className={activeTab === 'cook' ? styles.navButtonActive : styles.navButton}
            onClick={() => onTabChange('cook')}
          >
            Cook at home
          </button>
          <button
            type="button"
            className={activeTab === 'custom' ? styles.navButtonActive : styles.navButton}
            onClick={() => onTabChange('custom')}
          >
            Make wheel
          </button>
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={isAppInstalled ? styles.installButtonInstalled : styles.installButton}
            onClick={handleInstallClick}
            aria-label={isAppInstalled ? 'App installed' : 'Install app'}
            title={isAppInstalled ? 'Installed' : 'Install app'}
          >
            {isAppInstalled ? 'Installed' : 'Install app'}
          </button>
          {isLoggedIn ? (
            <>
              <button type="button" className={styles.avatarButton} onClick={onProfileClick}>
                <span className={styles.avatar} aria-hidden="true">
                  {getInitial(userName)}
                </span>
                <span className={styles.avatarLabel}>Profile</span>
              </button>
              <button type="button" className={styles.logoutButton} onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <button type="button" className={styles.loginButton} onClick={onLoginClick}>
              Log in
            </button>
          )}
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
      </div>
    </header>
  );
}
