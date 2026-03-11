import styles from './TabBar.module.css';

interface TabBarProps {
  activeTab: 'spin' | 'kitchen' | 'cook' | 'profile';
  onTabChange: (tab: 'spin' | 'kitchen' | 'cook' | 'profile') => void;
  onProfileClick: () => void;
}

export function TabBar({ activeTab, onTabChange, onProfileClick }: TabBarProps) {
  return (
    <nav className={styles.tabBar} aria-label="Primary">
      <button
        type="button"
        className={activeTab === 'spin' ? styles.tabButtonActive : styles.tabButton}
        onClick={() => onTabChange('spin')}
        aria-current={activeTab === 'spin' ? 'page' : undefined}
      >
        <span className={styles.tabIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 3v9l6 3" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <span className={styles.tabLabel}>Spin</span>
      </button>
      <button
        type="button"
        className={activeTab === 'kitchen' ? styles.tabButtonActive : styles.tabButton}
        onClick={() => onTabChange('kitchen')}
        aria-current={activeTab === 'kitchen' ? 'page' : undefined}
      >
        <span className={styles.tabIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M5 7h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M7 7V5h10v2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <span className={styles.tabLabel}>Kitchen</span>
      </button>
      <button
        type="button"
        className={activeTab === 'cook' ? styles.tabButtonActive : styles.tabButton}
        onClick={() => onTabChange('cook')}
        aria-current={activeTab === 'cook' ? 'page' : undefined}
      >
        <span className={styles.tabIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M6 7h12v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M8 7V5h8v2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M9 11h6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <span className={styles.tabLabel}>Cook</span>
      </button>
      <button
        type="button"
        className={activeTab === 'profile' ? styles.tabButtonActive : styles.tabButton}
        onClick={onProfileClick}
        aria-current={activeTab === 'profile' ? 'page' : undefined}
      >
        <span className={styles.tabIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M5 20a7 7 0 0 1 14 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </span>
        <span className={styles.tabLabel}>Profile</span>
      </button>
    </nav>
  );
}
