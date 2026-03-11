import { useCallback, useEffect, useState } from 'react';
import type { FoodCategory, FoodItem } from './types';
import { FOOD_CATEGORIES } from './types';
import { useFoodItems } from './hooks/useFoodItems';
import { useSpinHistory } from './hooks/useSpinHistory';
import { useWheelSpin } from './hooks/useWheelSpin';
import { useGroceryInventory } from './hooks/useGroceryInventory';
import { FoodWheel } from './components/FoodWheel';
import { SpinButton } from './components/SpinButton';
import { ResultDisplay } from './components/ResultDisplay';
import { CategoryFilter } from './components/CategoryFilter';
import { FoodManager } from './components/FoodManager';
import { SpinHistory } from './components/SpinHistory';
import { Kitchen } from './components/Kitchen/Kitchen';
import { CookAtHome } from './components/CookAtHome/CookAtHome';
import { AppHeader } from './components/layout/AppHeader';
import { TabBar } from './components/layout/TabBar';
import { LoginScreen } from './components/layout/LoginScreen';
import { ProfilePanel } from './components/layout/ProfilePanel';
import { playSpinCompleteSound } from './utils/sound';
import { generateId } from './utils/id';
import {
  loadOnboardingChoice,
  loadWheelOverride,
  saveOnboardingChoice,
  saveWheelOverride,
} from './utils/storage';
import { supabase } from './lib/supabaseClient';
import styles from './App.module.css';

const THEME_STORAGE_KEY = 'spin-eat-theme';

function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'spin' | 'kitchen' | 'cook' | 'profile'>('spin');
  const [showLogin, setShowLogin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [wheelOverride, setWheelOverride] = useState<FoodItem[] | null>(null);
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
  const wheelItems = wheelOverride ?? food.filteredItems;
  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(wheelItems);
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

  const handleCategoryToggle = useCallback(
    (category: FoodCategory) => {
      const next = food.activeCategories.includes(category)
        ? food.activeCategories.filter((c) => c !== category)
        : [...food.activeCategories, category];
      food.setActiveCategories(next);
    },
    [food.activeCategories, food.setActiveCategories]
  );

  const handleSelectAllCategories = useCallback(() => {
    const allCategories = Object.keys(FOOD_CATEGORIES) as FoodCategory[];
    food.setActiveCategories(allCategories);
  }, [food.setActiveCategories]);

  const buildWheelItems = useCallback(
    (suggestions: string[]) =>
      suggestions.map((name) => ({
        id: generateId(),
        name,
        category: 'dinner',
        source: 'home',
      })),
    []
  );

  const handleUseSuggestionsOnWheel = useCallback(
    (suggestions: string[]) => {
      const items: FoodItem[] = buildWheelItems(suggestions);
      setWheelOverride(items);
      if (userId) {
        saveWheelOverride(userId, suggestions);
      }
      setActiveTab('spin');
    },
    [buildWheelItems, userId]
  );

  const handleClearWheelOverride = useCallback(() => {
    setWheelOverride(null);
    if (userId) {
      saveWheelOverride(userId, null);
    }
  }, [userId]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      const user = data.session?.user;
      const nextName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        null;
      setUserName(nextName);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const nextName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        null;
      setUserName(nextName);
      setUserId(user?.id ?? null);
      setUserId(user?.id ?? null);
      if (nextName) {
        setShowLogin(false);
        setAuthError(null);
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
  }, []);

  const showAuthPage = !isLoggedIn && (showLogin || activeTab !== 'spin');

  const handleTabChange = useCallback(
    (tab: 'spin' | 'kitchen' | 'cook' | 'profile') => {
      setActiveTab(tab);
      if ((tab === 'kitchen' || tab === 'cook' || tab === 'profile') && !isLoggedIn) {
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
      setWheelOverride(null);
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

  useEffect(() => {
    if (!userId) return;
    const saved = loadWheelOverride(userId);
    if (saved && saved.length > 0) {
      setWheelOverride(buildWheelItems(saved));
    }
  }, [userId, buildWheelItems]);

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
                      items={wheelItems}
                      rotation={rotation}
                      aria-label={`Wheel with ${wheelItems.length} food options`}
                    />
                  </div>
                  {wheelOverride ? (
                    <div className={styles.wheelNotice}>
                      <span className={styles.wheelNoticeText}>
                        Showing meal suggestions on the wheel.
                      </span>
                      <button
                        type="button"
                        className={styles.wheelNoticeButton}
                        onClick={handleClearWheelOverride}
                      >
                        Use my foods
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.spinRow}>
                    <SpinButton
                      onClick={handleSpin}
                      disabled={isSpinning || wheelItems.length === 0}
                      aria-label="Spin the wheel to pick a random food"
                    />
                  </div>
                  <ResultDisplay item={selectedItem} isSpinning={isSpinning} />
                </section>

                <section className={styles.controlsPanel} aria-label="Filters and food list">
                  <h2 className={styles.panelTitle}>Plan your options</h2>
                  <CategoryFilter
                    activeCategories={food.activeCategories}
                    onToggle={handleCategoryToggle}
                    onSelectAll={handleSelectAllCategories}
                    aria-label="Filter wheel by category"
                  />

                  <FoodManager
                    items={food.items}
                    activeSource={food.activeSource}
                    onSourceChange={food.setActiveSource}
                    onAdd={food.addItem}
                    onUpdate={food.updateItem}
                    onRemove={food.removeItem}
                    onClearAll={food.clearAll}
                    onReset={food.resetToSample}
                  />
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
                <CookAtHome
                  groceries={kitchen.items}
                  onUseSuggestionsOnWheel={handleUseSuggestionsOnWheel}
                />
              </section>
            ) : (
              <ProfilePanel
                userName={userName}
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
          onProfileClick={handleProfileClick}
        />
      ) : null}
    </div>
  );
}

export default App;
