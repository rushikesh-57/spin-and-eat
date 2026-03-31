import { useEffect, useState } from 'react';
import type {
  DietPreference,
  HomeCookingStyle,
  SpicePreference,
  UserProfilePreferences,
  UserProfileSetupStatus,
} from '../../types';
import styles from './ProfilePanel.module.css';

interface ProfilePanelProps {
  userName: string | null;
  userEmail: string | null;
  profile: UserProfilePreferences;
  profileStatus: UserProfileSetupStatus | null;
  onSaveProfile: (profile: UserProfilePreferences) => Promise<void> | void;
  onSkipProfile: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const DIET_OPTIONS: { value: DietPreference; label: string }[] = [
  { value: 'no-preference', label: 'No preference' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non-vegetarian', label: 'Non-vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const SPICE_OPTIONS: { value: SpicePreference; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'spicy', label: 'Spicy' },
];

const HOME_COOKING_STYLE_OPTIONS: { value: HomeCookingStyle; label: string }[] = [
  { value: 'mixed-indian', label: 'Mixed Indian' },
  { value: 'maharashtrian', label: 'Maharashtrian' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'south-indian', label: 'South Indian' },
  { value: 'north-indian', label: 'North Indian' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'rajasthani', label: 'Rajasthani' },
  { value: 'hyderabadi', label: 'Hyderabadi' },
  { value: 'other', label: 'Other' },
];

const formatPreference = (value: string) =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ProfilePanel({
  userName,
  userEmail,
  profile,
  profileStatus,
  onSaveProfile,
  onSkipProfile,
  onLogout,
  onClose,
  theme,
  onToggleTheme,
}: ProfilePanelProps) {
  const [draft, setDraft] = useState(profile);
  const [isEditing, setIsEditing] = useState(profileStatus === null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    setIsEditing(profileStatus === null);
  }, [profileStatus]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || isSkipping) {
      return;
    }
    setIsSaving(true);
    try {
      await onSaveProfile({
        preferredName: draft.preferredName.trim(),
        homeCookingStyle: draft.homeCookingStyle,
        dietPreference: draft.dietPreference,
        spicePreference: draft.spicePreference,
        familyMembers: Math.max(1, Math.round(draft.familyMembers || 1)),
        whatsappNumber: draft.whatsappNumber.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.profileSection} aria-label="Profile">
      <div className={styles.profileCard}>
        <p className={styles.profileEyebrow}>Signed in</p>
        <h2 className={styles.profileTitle}>Profile</h2>
        <p className={styles.profileName}>{userName}</p>
        {userEmail ? <p className={styles.profileMeta}>{userEmail}</p> : null}

        <div className={styles.accountBlock}>
          <p className={styles.blockTitle}>About you</p>
          {profileStatus === 'completed' && !isEditing ? (
            <div className={styles.summaryGrid}>
              <div>
                <p className={styles.summaryLabel}>Preferred name</p>
                <p className={styles.summaryValue}>{profile.preferredName || userName || 'Not set'}</p>
              </div>
              <div>
                <p className={styles.summaryLabel}>Home cooking style</p>
                <p className={styles.summaryValue}>{formatPreference(profile.homeCookingStyle)}</p>
              </div>
              <div>
                <p className={styles.summaryLabel}>Diet</p>
                <p className={styles.summaryValue}>{formatPreference(profile.dietPreference)}</p>
              </div>
              <div>
                <p className={styles.summaryLabel}>Spice level</p>
                <p className={styles.summaryValue}>{formatPreference(profile.spicePreference)}</p>
              </div>
              <div>
                <p className={styles.summaryLabel}>Family members</p>
                <p className={styles.summaryValue}>{profile.familyMembers}</p>
              </div>
              <div>
                <p className={styles.summaryLabel}>WhatsApp</p>
                <p className={styles.summaryValue}>{profile.whatsappNumber || 'Not set'}</p>
              </div>
            </div>
          ) : (
            <div className={styles.promptCard}>
              <p className={styles.promptTitle}>Help personalize your experience</p>
              <p className={styles.promptText}>
                Share a few basics so Spin &amp; Eat can make better suggestions later. This is optional, and you can skip it for now.
              </p>
            </div>
          )}
        </div>

        {isEditing ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Preferred name</span>
              <input
                type="text"
                value={draft.preferredName}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, preferredName: event.target.value }))
                }
                placeholder={userName ?? 'What should we call you?'}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Food cooked at home</span>
              <select
                value={draft.homeCookingStyle}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    homeCookingStyle: event.target.value as HomeCookingStyle,
                  }))
                }
                className={styles.select}
              >
                {HOME_COOKING_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Diet preference</span>
              <select
                value={draft.dietPreference}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    dietPreference: event.target.value as DietPreference,
                  }))
                }
                className={styles.select}
              >
                {DIET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Spice preference</span>
              <select
                value={draft.spicePreference}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    spicePreference: event.target.value as SpicePreference,
                  }))
                }
                className={styles.select}
              >
                {SPICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Family members</span>
              <input
                type="number"
                min="1"
                step="1"
                value={draft.familyMembers}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    familyMembers: Number(event.target.value) || 1,
                  }))
                }
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>WhatsApp number</span>
              <input
                type="tel"
                value={draft.whatsappNumber}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    whatsappNumber: event.target.value,
                  }))
                }
                placeholder="Include country code"
                className={styles.input}
              />
            </label>

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton} disabled={isSaving || isSkipping}>
                {isSaving ? 'Saving...' : 'Save profile'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={isSaving || isSkipping}
                onClick={async () => {
                  if (isSaving || isSkipping) {
                    return;
                  }
                  setIsSkipping(true);
                  try {
                    await onSkipProfile();
                    setIsEditing(false);
                  } finally {
                    setIsSkipping(false);
                  }
                }}
              >
                {isSkipping ? 'Skipping...' : 'Skip for now'}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.inlineActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setIsEditing(true)}>
              {profileStatus === 'completed' ? 'Edit preferences' : 'Set up profile'}
            </button>
          </div>
        )}

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
          <button
            type="button"
            className={styles.logoutButton}
            disabled={isLoggingOut}
            onClick={async () => {
              if (isLoggingOut) {
                return;
              }
              setIsLoggingOut(true);
              try {
                await onLogout();
              } finally {
                setIsLoggingOut(false);
              }
            }}
          >
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </section>
  );
}
