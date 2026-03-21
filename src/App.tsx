import { useCallback, useEffect, useState } from 'react';
import { useFoodItems } from './hooks/useFoodItems';
import { useSpinHistory } from './hooks/useSpinHistory';
import { useWheelSpin } from './hooks/useWheelSpin';
import { useGroceryInventory } from './hooks/useGroceryInventory';
import { FoodWheel } from './components/FoodWheel';
import { SpinButton } from './components/SpinButton';
import { ResultDisplay } from './components/ResultDisplay';
import { FoodManager } from './components/FoodManager';
import { SpinHistory } from './components/SpinHistory';
import { Kitchen } from './components/Kitchen/Kitchen';
import { CookAtHome } from './components/CookAtHome/CookAtHome';
import { MakeYourOwnWheel } from './components/MakeYourOwnWheel/MakeYourOwnWheel';
import { AppHeader } from './components/layout/AppHeader';
import { TabBar } from './components/layout/TabBar';
import { LoginScreen } from './components/layout/LoginScreen';
import { ProfilePanel } from './components/layout/ProfilePanel';
import { playSpinCompleteSound } from './utils/sound';
import {
  DEFAULT_USER_PROFILE,
  loadOnboardingChoice,
  loadUserProfile,
  loadUserProfileStatus,
  saveOnboardingChoice,
  saveUserProfile,
  saveUserProfileStatus,
} from './utils/storage';
import { supabase } from './lib/supabaseClient';
import styles from './App.module.css';
import type { UserProfilePreferences, UserProfileSetupStatus } from './types';

const THEME_STORAGE_KEY = 'spin-eat-theme';
const MOBILE_LAYOUT_QUERY = '(max-width: 719px)';

function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'spin' | 'kitchen' | 'cook' | 'custom' | 'profile'>('spin');
  const [showLogin, setShowLogin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfilePreferences>(DEFAULT_USER_PROFILE);
  const [profileStatus, setProfileStatus] = useState<UserProfileSetupStatus | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    window.matchMedia(MOBILE_LAYOUT_QUERY).matches
  );
  const [isPlanOpen, setIsPlanOpen] = useState(() =>
    !window.matchMedia(MOBILE_LAYOUT_QUERY).matches
  );
  const [showMobileResult, setShowMobileResult] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const food = useFoodItems(userId);
  const kitchen = useGroceryInventory(userId);
  const history = useSpinHistory();
  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(food.filteredItems);
  const isLoggedIn = Boolean(userName);

  const handleSpin = useCallback(() => {
    spin((item) => {
      history.addToHistory({
        foodName: item.name,
        category: item.category,
        timestamp: Date.now(),
      });
      playSpinCompleteSound();
    });
  }, [spin, history.addToHistory]);

  useEffect(() => {
    let isMounted = true;

    const hydrateUserProfile = (nextUserId: string | null) => {
      if (!nextUserId) {
        setUserProfile(DEFAULT_USER_PROFILE);
        setProfileStatus(null);
        return;
      }

      setUserProfile(loadUserProfile(nextUserId));
      setProfileStatus(loadUserProfileStatus(nextUserId));
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      const user = data.session?.user;
      const nextUserId = user?.id ?? null;
      const nextName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        null;
      setUserName(nextName);
      setUserId(nextUserId);
      setUserEmail(user?.email ?? null);
      hydrateUserProfile(nextUserId);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const nextUserId = user?.id ?? null;
      const nextName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        null;
      setUserName(nextName);
      setUserId(nextUserId);
      setUserEmail(user?.email ?? null);
      hydrateUserProfile(nextUserId);
      if (nextName) {
        setShowLogin(false);
        setAuthError(null);
        if (event === 'SIGNED_IN' && nextUserId && !loadUserProfileStatus(nextUserId)) {
          setActiveTab('profile');
        }
      } else {
        setActiveTab('spin');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);

    const updateLayout = (matches: boolean) => {
      setIsMobileLayout(matches);
      setIsPlanOpen(!matches);
    };

    updateLayout(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateLayout(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (isSpinning) {
      setShowMobileResult(false);
      return;
    }

    if (isMobileLayout && selectedItem) {
      setShowMobileResult(true);
    }
  }, [isMobileLayout, isSpinning, selectedItem]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleLogin = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setActiveTab('spin');
    setUserProfile(DEFAULT_USER_PROFILE);
    setProfileStatus(null);
    setUserEmail(null);
  }, []);

  const handleSaveProfile = useCallback(
    (profile: UserProfilePreferences) => {
      if (!userId) {
        return;
      }

      setUserProfile(profile);
      setProfileStatus('completed');
      saveUserProfile(userId, profile);
      saveUserProfileStatus(userId, 'completed');
    },
    [userId]
  );

  const handleSkipProfile = useCallback(() => {
    if (!userId) {
      return;
    }

    setProfileStatus('skipped');
    saveUserProfileStatus(userId, 'skipped');
  }, [userId]);

  const showAuthPage = !isLoggedIn && (showLogin || activeTab !== 'spin');

  const handleTabChange = useCallback(
    (tab: 'spin' | 'kitchen' | 'cook' | 'custom' | 'profile') => {
      setActiveTab(tab);
      if ((tab === 'kitchen' || tab === 'cook' || tab === 'custom' || tab === 'profile') && !isLoggedIn) {
        setShowLogin(true);
        return;
      }
      setShowLogin(false);
    },
    [isLoggedIn]
  );

  const handleProfileClick = useCallback(() => {
    if (isLoggedIn) {
      setActiveTab('profile');
      setShowLogin(false);
      return;
    }
    setShowLogin(true);
    setActiveTab('spin');
  }, [isLoggedIn]);

  useEffect(() => {
    if (!userId) {
      setShowOnboarding(false);
      return;
    }

    const storedChoice = loadOnboardingChoice(userId);
    if (storedChoice) {
      setShowOnboarding(false);
      return;
    }

    if (food.isLoading || kitchen.isLoading) {
      return;
    }

    const hasFood = food.items.length > 0;
    const hasGroceries = kitchen.items.length > 0;
    if (hasFood || hasGroceries) {
      saveOnboardingChoice(userId, 'done');
      setShowOnboarding(false);
      return;
    }

    setShowOnboarding(true);
  }, [userId, food.isLoading, kitchen.isLoading, food.items.length, kitchen.items.length]);

  const handleUseDefaultLists = useCallback(async () => {
    if (!userId) return;
    saveOnboardingChoice(userId, 'default');
    setShowOnboarding(false);
    await food.resetToSample();
    await kitchen.resetToSample();
  }, [userId, food.resetToSample, kitchen.resetToSample]);

  const handleStartCustomLists = useCallback(() => {
    if (!userId) return;
    saveOnboardingChoice(userId, 'custom');
    setShowOnboarding(false);
  }, [userId]);

  return (
    <div className={styles.app}>
      <AppHeader
        isLoggedIn={isLoggedIn}
        userName={userName}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLoginClick={() => {
          setShowLogin(true);
        }}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className={styles.main}>
        {showAuthPage ? (
          <LoginScreen
            authError={authError}
            onLogin={handleLogin}
            onBack={() => {
              setShowLogin(false);
              setActiveTab('spin');
            }}
          />
        ) : (
          <>
            {showOnboarding ? (
              <section className={styles.onboardingCard} aria-label="Get started">
                <div>
                  <h2 className={styles.onboardingTitle}>Start with a default list?</h2>
                  <p className={styles.onboardingText}>
                    We can load a starter set of foods and groceries for you, or you can build your own list from scratch.
                  </p>
                </div>
                <div className={styles.onboardingActions}>
                  <button
                    type="button"
                    className={styles.onboardingPrimary}
                    onClick={handleUseDefaultLists}
                  >
                    Use default list
                  </button>
                  <button
                    type="button"
                    className={styles.onboardingSecondary}
                    onClick={handleStartCustomLists}
                  >
                    Create my own
                  </button>
                </div>
              </section>
            ) : null}
            {activeTab === 'spin' ? (
              <div className={styles.spinLayout}>
                <section
                  className={styles.spinPanel}
                  aria-labelledby="wheel-heading"
                  aria-label="Food wheel"
                >
                  <div className={styles.panelHeader}>
                    <div>
                      <h2 id="wheel-heading" className={styles.panelTitle}>
                        Spin the wheel
                      </h2>
                      <p className={styles.panelSubtitle}>Let randomness pick the meal.</p>
                    </div>
                    <span className={styles.panelBadge}>Live</span>
                  </div>
                  <div className={styles.wheelWrap}>
                    <FoodWheel
                      items={food.filteredItems}
                      rotation={rotation}
                      aria-label={`Wheel with ${food.filteredItems.length} food options`}
                    />
                  </div>
                  <div className={styles.spinRow}>
                    <SpinButton
                      onClick={handleSpin}
                      disabled={isSpinning || food.filteredItems.length === 0}
                      isSpinning={isSpinning}
                      aria-label="Spin the wheel to pick a random food"
                    />
                  </div>
                  <ResultDisplay
                    item={isMobileLayout ? null : selectedItem}
                    isSpinning={isSpinning}
                    showHintWhenEmpty={!isMobileLayout}
                  />
                </section>

                <section className={styles.controlsPanel} aria-label="Wheel options">
                  <button
                    type="button"
                    className={styles.controlsToggle}
                    onClick={() => setIsPlanOpen((prev) => !prev)}
                    aria-expanded={isPlanOpen}
                    aria-controls="spin-plan-content"
                  >
                    <span className={styles.controlsToggleText}>
                      <span className={styles.panelTitle}>Wheel options</span>
                      <span className={styles.panelSubtitle}>Pick what to show.</span>
                    </span>
                    <span className={styles.controlsToggleIcon} aria-hidden="true">
                      {isPlanOpen ? 'Hide' : 'Show'}
                    </span>
                  </button>

                  <div
                    id="spin-plan-content"
                    className={!isPlanOpen ? styles.controlsContentClosed : styles.controlsContent}
                  >
                    <FoodManager
                      items={food.items}
                      includedFoodIds={food.includedFoodIds}
                      activeSource={food.activeSource}
                      onSourceChange={food.setActiveSource}
                      onToggleIncluded={food.toggleIncluded}
                      onAdd={food.addItem}
                      onClearAll={() => food.clearBySource(food.activeSource)}
                      onReset={() => food.resetSourceToSample(food.activeSource)}
                    />
                  </div>
                </section>

                <section className={styles.historyPanel} aria-label="Recent spins">
                  <SpinHistory history={history.history} onClear={history.clearHistory} />
                </section>
              </div>
            ) : activeTab === 'kitchen' ? (
              <section className={styles.kitchenPanel} aria-label="Kitchen inventory">
                <Kitchen
                  groceries={kitchen.items}
                  onAddGrocery={kitchen.addItem}
                  onUpdateGrocery={kitchen.updateItem}
                  onRemoveGrocery={kitchen.removeItem}
                  onClearGroceries={kitchen.clearAll}
                  onResetGrocery={kitchen.resetToSample}
                />
              </section>
            ) : activeTab === 'cook' ? (
              <section className={styles.cookPanel} aria-label="Cook at home">
                <CookAtHome groceries={kitchen.items} onUpdateGrocery={kitchen.updateItem} />
              </section>
            ) : activeTab === 'custom' ? (
              <section className={styles.cookPanel} aria-label="Make your own wheel">
                <MakeYourOwnWheel userId={userId} />
              </section>
            ) : (
              <ProfilePanel
                userName={userName}
                userEmail={userEmail}
                profile={userProfile}
                profileStatus={profileStatus}
                onSaveProfile={handleSaveProfile}
                onSkipProfile={handleSkipProfile}
                onLogout={handleLogout}
                onClose={() => setActiveTab('spin')}
                theme={theme}
                onToggleTheme={handleToggleTheme}
              />
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Spin &amp; Eat - Decide what to eat with a spin</p>
      </footer>

      {!showAuthPage ? (
        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      ) : null}

      {activeTab === 'spin' && isMobileLayout && showMobileResult ? (
        <ResultDisplay
          item={selectedItem}
          isSpinning={false}
          asDialog
          onDismiss={() => setShowMobileResult(false)}
          onSpinAgain={() => {
            setShowMobileResult(false);
            handleSpin();
          }}
        />
      ) : null}
    </div>
  );
}

export default App;

