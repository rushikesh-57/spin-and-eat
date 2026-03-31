import { useCallback, useEffect, useRef, useState } from 'react';
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
import { AlertDialogProvider } from './components/layout/AlertDialogProvider';
import { TabBar } from './components/layout/TabBar';
import { LoginScreen } from './components/layout/LoginScreen';
import { ProfilePanel } from './components/layout/ProfilePanel';
import { playSpinCompleteSound } from './utils/sound';
import { usePwaInstall } from './hooks/usePwaInstall';
import {
  DEFAULT_USER_PROFILE,
  loadOnboardingChoice,
  loadUserProfileStatus,
  saveOnboardingChoice,
} from './utils/storage';
import { supabase } from './lib/supabaseClient';
import {
  loadUserProfileFromSupabase,
  saveUserProfileStatusToSupabase,
  saveUserProfileToSupabase,
} from './utils/userProfile';
import styles from './App.module.css';
import type { UserProfilePreferences, UserProfileSetupStatus } from './types';

const THEME_STORAGE_KEY = 'spin-eat-theme';
const USER_GUIDE_SEEN_KEY_PREFIX = 'spin-eat-user-guide-seen';
const MOBILE_LAYOUT_QUERY = '(max-width: 719px)';

function App() {
  type GuideTab = 'spin' | 'kitchen' | 'cook' | 'custom';
  type GuideTarget =
    | 'spin-wheel'
    | 'spin-options'
    | 'spin-history'
    | 'kitchen-shopping'
    | 'kitchen-manage'
    | 'kitchen-inventory'
    | 'cook-ideas'
    | 'cook-wheel'
    | 'custom-wheel'
    | 'custom-options';

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
  const [isPlanOpen, setIsPlanOpen] = useState(true);
  const [showMobileResult, setShowMobileResult] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [shouldPromptProfileSetup, setShouldPromptProfileSetup] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isInstallBannerBusy, setIsInstallBannerBusy] = useState(false);
  const [isApplyingDefaultLists, setIsApplyingDefaultLists] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const spinWheelRef = useRef<HTMLElement | null>(null);
  const spinOptionsRef = useRef<HTMLElement | null>(null);
  const spinHistoryRef = useRef<HTMLElement | null>(null);
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
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const isLoggedIn = Boolean(userName);

  const guideSteps: {
    title: string;
    description: string;
    targetLabel: string;
    tab: GuideTab;
    target: GuideTarget;
  }[] = [
    {
      title: 'Spin: Wheel',
      description:
        'This is the main wheel card where you spin and see the selected result.',
      targetLabel: 'Spin wheel card',
      tab: 'spin',
      target: 'spin-wheel',
    },
    {
      title: 'Spin: Wheel Options',
      description:
        'Choose which options are shown on the wheel and add new ones here.',
      targetLabel: 'Wheel options card',
      tab: 'spin',
      target: 'spin-options',
    },
    {
      title: 'Spin: Recent History',
      description:
        'Check your recent spin results and clear them when needed.',
      targetLabel: 'Recent spins card',
      tab: 'spin',
      target: 'spin-history',
    },
    {
      title: 'Grocery: Shopping Lists',
      description:
        'Generate weekly or monthly list suggestions based on low/out-of-stock items.',
      targetLabel: 'Shopping lists card',
      tab: 'kitchen',
      target: 'kitchen-shopping',
    },
    {
      title: 'Grocery: Manage Inventory',
      description:
        'Add new grocery items, reset defaults, or clear all inventory items.',
      targetLabel: 'Manage inventory card',
      tab: 'kitchen',
      target: 'kitchen-manage',
    },
    {
      title: 'Grocery: Current Inventory',
      description:
        'Search, filter, edit remaining quantity, and delete specific grocery items.',
      targetLabel: 'Current inventory card',
      tab: 'kitchen',
      target: 'kitchen-inventory',
    },
    {
      title: 'Cook: Idea Generator',
      description:
        'Generate cooking ideas from available groceries, then review ingredients and AI-assisted grocery updates.',
      targetLabel: 'Cook ideas card',
      tab: 'cook',
      target: 'cook-ideas',
    },
    {
      title: 'Cook: Decision Wheel',
      description:
        'If you cannot decide between suggestions, spin this wheel to pick one quickly.',
      targetLabel: 'Cook wheel card',
      tab: 'cook',
      target: 'cook-wheel',
    },
    {
      title: 'Custom Wheel: Wheel',
      description:
        'Spin your own personalized wheel once you have added custom options.',
      targetLabel: 'Custom wheel card',
      tab: 'custom',
      target: 'custom-wheel',
    },
    {
      title: 'Custom Wheel: Options',
      description:
        'Add, include/exclude, and clear custom options from your personal wheel.',
      targetLabel: 'Custom options card',
      tab: 'custom',
      target: 'custom-options',
    },
  ];
  const isLastGuideStep = guideStepIndex === guideSteps.length - 1;
  const activeGuideTarget = showUserGuide ? guideSteps[guideStepIndex]?.target : null;

  const getUserGuideSeenKey = useCallback((currentUserId: string) => {
    return `${USER_GUIDE_SEEN_KEY_PREFIX}:${currentUserId}`;
  }, []);

  const hasSeenUserGuide = useCallback(
    (currentUserId: string) => {
      try {
        return localStorage.getItem(getUserGuideSeenKey(currentUserId)) === '1';
      } catch {
        return false;
      }
    },
    [getUserGuideSeenKey]
  );

  const markUserGuideSeen = useCallback(
    (currentUserId: string) => {
      try {
        localStorage.setItem(getUserGuideSeenKey(currentUserId), '1');
      } catch {
        // Ignore storage errors.
      }
    },
    [getUserGuideSeenKey]
  );

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

    const hydrateUserProfile = async (nextUserId: string | null) => {
      if (!nextUserId) {
        setUserProfile(DEFAULT_USER_PROFILE);
        setProfileStatus(null);
        return;
      }

      try {
        const { profile, profileStatus: nextStatus } = await loadUserProfileFromSupabase(nextUserId);
        if (!isMounted) {
          return;
        }
        setUserProfile(profile);
        setProfileStatus(nextStatus);
      } catch {
        if (!isMounted) {
          return;
        }
        setUserProfile(DEFAULT_USER_PROFILE);
        setProfileStatus(null);
      }
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
      setShowSignInPrompt(!nextName);
      void hydrateUserProfile(nextUserId);
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
      void hydrateUserProfile(nextUserId);
      if (nextName) {
        setShowLogin(false);
        setShowSignInPrompt(false);
        setAuthError(null);
        if (event === 'SIGNED_IN') {
          setShouldPromptProfileSetup(true);
        }
      } else {
        setActiveTab('spin');
        setShowSignInPrompt(true);
        setShouldPromptProfileSetup(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!shouldPromptProfileSetup || !userId) {
      return;
    }

    const localProfileStatus = loadUserProfileStatus(userId);
    const resolvedProfileStatus = profileStatus ?? localProfileStatus ?? null;

    if (resolvedProfileStatus === null) {
      setActiveTab('profile');
    }

    setShouldPromptProfileSetup(false);
  }, [profileStatus, shouldPromptProfileSetup, userId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
    if (isLoggedIn && activeTab === 'spin') {
      setIsPlanOpen(true);
    }
  }, [activeTab, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setShowUserGuide(false);
      return;
    }

    const seen = hasSeenUserGuide(userId);
    if (!seen) {
      setGuideStepIndex(0);
      setActiveTab('spin');
      setShowUserGuide(true);
    }
  }, [hasSeenUserGuide, isLoggedIn, userId]);

  useEffect(() => {
    if (!showUserGuide) {
      return;
    }
    const step = guideSteps[guideStepIndex];
    if (step && activeTab !== step.tab) {
      setActiveTab(step.tab);
    }
  }, [activeTab, guideStepIndex, guideSteps, showUserGuide]);

  useEffect(() => {
    if (!showUserGuide || activeTab !== 'spin') {
      return;
    }

    const targetRef =
      activeGuideTarget === 'spin-wheel'
        ? spinWheelRef
        : activeGuideTarget === 'spin-options'
          ? spinOptionsRef
          : activeGuideTarget === 'spin-history'
            ? spinHistoryRef
            : null;

    if (!targetRef?.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [activeGuideTarget, activeTab, showUserGuide]);

  useEffect(() => {
    if (food.activeSource !== 'outside') {
      food.setActiveSource('outside');
    }
  }, [food.activeSource, food.setActiveSource]);

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
    if (isAuthBusy) {
      return;
    }
    setIsAuthBusy(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setAuthError(error.message);
      }
    } finally {
      setIsAuthBusy(false);
    }
  }, [isAuthBusy]);

  const handleLogout = useCallback(async () => {
    if (isAuthBusy) {
      return;
    }
    setIsAuthBusy(true);
    try {
      await supabase.auth.signOut();
      setActiveTab('spin');
      setUserProfile(DEFAULT_USER_PROFILE);
      setProfileStatus(null);
      setUserEmail(null);
    } finally {
      setIsAuthBusy(false);
    }
  }, [isAuthBusy]);

  const handleSaveProfile = useCallback(
    async (profile: UserProfilePreferences) => {
      if (!userId) {
        return;
      }

      await saveUserProfileToSupabase(userId, profile, 'completed');
      setUserProfile(profile);
      setProfileStatus('completed');
    },
    [userId]
  );

  const handleSkipProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    setProfileStatus('skipped');
    await saveUserProfileStatusToSupabase(userId, 'skipped');
  }, [userId]);

  const showAuthPage = !isLoggedIn && (showLogin || activeTab !== 'spin');
  const showSpinSignInPrompt =
    activeTab === 'spin' && !isLoggedIn && !showAuthPage && showSignInPrompt;

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
    if (isApplyingDefaultLists) {
      return;
    }
    setIsApplyingDefaultLists(true);
    saveOnboardingChoice(userId, 'default');
    setShowOnboarding(false);
    try {
      await food.resetToSample();
      await kitchen.resetToSample();
    } finally {
      setIsApplyingDefaultLists(false);
    }
  }, [userId, isApplyingDefaultLists, food.resetToSample, kitchen.resetToSample]);

  const handleStartCustomLists = useCallback(() => {
    if (!userId) return;
    saveOnboardingChoice(userId, 'custom');
    setShowOnboarding(false);
  }, [userId]);

  const handleCloseGuide = useCallback(() => {
    if (userId) {
      markUserGuideSeen(userId);
    }
    setShowUserGuide(false);
    setGuideStepIndex(0);
    setActiveTab('spin');
  }, [markUserGuideSeen, userId]);

  return (
    <AlertDialogProvider>
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
        canInstallApp={canInstall}
        isAppInstalled={isInstalled}
        onInstallApp={promptInstall}
        isAuthBusy={isAuthBusy}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

        <main className={styles.main}>
          {!isOnline ? (
            <section className={styles.offlineNotice} aria-label="Offline notice">
              <p className={styles.noticeTitle}>You are offline</p>
              <p className={styles.noticeText}>
                Browsing the app still works, but login, profile sync, meal suggestions, ingredient
                analysis, WhatsApp sharing, and cloud updates need internet.
              </p>
            </section>
          ) : null}

          {canInstall && showInstallBanner ? (
            <section className={styles.installBanner} aria-label="Install app">
              <div>
                <p className={styles.noticeTitle}>Install Spin &amp; Eat</p>
                <p className={styles.noticeText}>
                  Add this app to your home screen for a faster, full-screen experience.
                </p>
              </div>
              <div className={styles.installActions}>
                <button
                  type="button"
                  className={styles.installPrimary}
                  onClick={async () => {
                    if (isInstallBannerBusy) {
                      return;
                    }
                    setIsInstallBannerBusy(true);
                    try {
                      const installed = await promptInstall();
                      if (installed) {
                        setShowInstallBanner(false);
                      }
                    } finally {
                      setIsInstallBannerBusy(false);
                    }
                  }}
                  disabled={isInstallBannerBusy}
                >
                  {isInstallBannerBusy ? 'Installing...' : 'Install app'}
                </button>
                <button
                  type="button"
                  className={styles.installSecondary}
                  onClick={() => setShowInstallBanner(false)}
                  disabled={isInstallBannerBusy}
                >
                  Not now
                </button>
              </div>
            </section>
          ) : null}

          {showAuthPage ? (
          <LoginScreen
            authError={authError}
            isSubmitting={isAuthBusy}
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
                    disabled={isApplyingDefaultLists}
                  >
                    {isApplyingDefaultLists ? 'Applying...' : 'Use default list'}
                  </button>
                  <button
                    type="button"
                    className={styles.onboardingSecondary}
                    onClick={handleStartCustomLists}
                    disabled={isApplyingDefaultLists}
                  >
                    Create my own
                  </button>
                </div>
              </section>
            ) : null}
            {activeTab === 'spin' ? (
              <div className={styles.spinLayoutShell}>
                {showSpinSignInPrompt ? (
                  <section className={styles.signInOverlay} aria-label="Sign in prompt">
                    <div className={styles.signInPromptCard}>
                      <p className={styles.signInPromptEyebrow}>Unlock more features</p>
                      <h3 className={styles.signInPromptTitle}>Sign in to access everything</h3>
                      <p className={styles.signInPromptText}>
                        Save your spin history, sync kitchen data, and personalize suggestions across devices.
                      </p>
                      <div className={styles.signInPromptActions}>
                        <button
                          type="button"
                          className={styles.signInPromptPrimary}
                          onClick={() => {
                            setShowSignInPrompt(false);
                            setShowLogin(true);
                            setActiveTab('spin');
                          }}
                        >
                          Sign in
                        </button>
                        <button
                          type="button"
                          className={styles.signInPromptSecondary}
                          onClick={() => setShowSignInPrompt(false)}
                        >
                          Maybe later
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}
                <div className={styles.spinLayout}>
                <section
                  ref={spinWheelRef}
                  className={`${styles.spinPanel} ${
                    activeGuideTarget === 'spin-wheel' ? styles.guideSpotlight : ''
                  }`}
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

                <section
                  ref={spinOptionsRef}
                  className={`${styles.controlsPanel} ${
                    activeGuideTarget === 'spin-options' ? styles.guideSpotlight : ''
                  }`}
                  aria-label="Wheel options"
                >
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
                      onToggleIncluded={food.toggleIncluded}
                      onAdd={food.addItem}
                      onClearAll={() => food.clearBySource(food.activeSource)}
                      onReset={() => food.resetSourceToSample(food.activeSource)}
                    />
                  </div>
                </section>

                <section
                  ref={spinHistoryRef}
                  className={`${styles.historyPanel} ${
                    activeGuideTarget === 'spin-history' ? styles.guideSpotlight : ''
                  }`}
                  aria-label="Recent spins"
                >
                  <SpinHistory history={history.history} onClear={history.clearHistory} />
                </section>
                </div>
              </div>
            ) : activeTab === 'kitchen' ? (
              <section className={styles.kitchenPanel} aria-label="Kitchen inventory">
                <Kitchen
                  groceries={kitchen.items}
                  userProfile={userProfile}
                  onAddGrocery={kitchen.addItem}
                  onUpdateGrocery={kitchen.updateItem}
                  onRemoveGrocery={kitchen.removeItem}
                  onClearGroceries={kitchen.clearAll}
                  onResetGrocery={kitchen.resetToSample}
                  guideTarget={
                    activeGuideTarget === 'kitchen-shopping'
                      ? 'shopping'
                      : activeGuideTarget === 'kitchen-manage'
                        ? 'manage'
                        : activeGuideTarget === 'kitchen-inventory'
                          ? 'inventory'
                          : null
                  }
                />
              </section>
            ) : activeTab === 'cook' ? (
              <section className={styles.cookPanel} aria-label="Cook at home">
                <CookAtHome
                  groceries={kitchen.items}
                  onUpdateGrocery={kitchen.updateItem}
                  defaultServings={userProfile.familyMembers}
                  userProfile={userProfile}
                  guideTarget={
                    activeGuideTarget === 'cook-ideas'
                      ? 'ideas'
                      : activeGuideTarget === 'cook-wheel'
                        ? 'wheel'
                        : null
                  }
                />
              </section>
            ) : activeTab === 'custom' ? (
              <section className={styles.cookPanel} aria-label="Make your own wheel">
                <MakeYourOwnWheel
                  userId={userId}
                  guideTarget={
                    activeGuideTarget === 'custom-wheel'
                      ? 'wheel'
                      : activeGuideTarget === 'custom-options'
                        ? 'options'
                        : null
                  }
                />
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

      {showUserGuide && isLoggedIn ? (
        <section className={styles.userGuideOverlay} role="dialog" aria-modal="true" aria-label="First-time user guide">
          <div className={styles.userGuideCard}>
            <p className={styles.userGuideStep}>Step {guideStepIndex + 1} of {guideSteps.length}</p>
            <h3 className={styles.userGuideTitle}>{guideSteps[guideStepIndex].title}</h3>
            <p className={styles.userGuideTarget}>Look here: {guideSteps[guideStepIndex].targetLabel}</p>
            <p className={styles.userGuideText}>{guideSteps[guideStepIndex].description}</p>
            <div className={styles.userGuideActions}>
              <button
                type="button"
                className={styles.userGuideSecondary}
                onClick={handleCloseGuide}
              >
                Skip guide
              </button>
              {guideStepIndex > 0 ? (
                <button
                  type="button"
                  className={styles.userGuideSecondary}
                  onClick={() => setGuideStepIndex((prev) => Math.max(0, prev - 1))}
                >
                  Previous
                </button>
              ) : null}
              <button
                type="button"
                className={styles.userGuidePrimary}
                onClick={() => {
                  if (isLastGuideStep) {
                    handleCloseGuide();
                    return;
                  }
                  setGuideStepIndex((prev) => Math.min(guideSteps.length - 1, prev + 1));
                }}
              >
                {isLastGuideStep ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </AlertDialogProvider>
  );
}

export default App;

