import { useCallback, useEffect, useState } from 'react';
import type { FoodCategory } from './types';
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
import { AppHeader } from './components/layout/AppHeader';
import { TabBar } from './components/layout/TabBar';
import { LoginScreen } from './components/layout/LoginScreen';
import { ProfilePanel } from './components/layout/ProfilePanel';
import { playSpinCompleteSound } from './utils/sound';
import { supabase } from './lib/supabaseClient';
import styles from './App.module.css';

const THEME_STORAGE_KEY = 'spin-eat-theme';

function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'spin' | 'kitchen' | 'profile'>('spin');
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const food = useFoodItems();
  const kitchen = useGroceryInventory();
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

  const handleCategoryToggle = useCallback(
    (category: FoodCategory) => {
      const next = food.activeCategories.includes(category)
        ? food.activeCategories.filter((c) => c !== category)
        : [...food.activeCategories, category];
      food.setActiveCategories(next);
    },
    [food.activeCategories, food.setActiveCategories]
  );

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
      if (nextName) {
        setShowLogin(false);
        setShowProfile(false);
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
    setShowProfile(false);
    setActiveTab('spin');
  }, []);

  const showAuthPage = !isLoggedIn && (showLogin || activeTab !== 'spin');

  const handleTabChange = useCallback(
    (tab: 'spin' | 'kitchen' | 'profile') => {
      setActiveTab(tab);
      setShowProfile(false);
      if ((tab === 'kitchen' || tab === 'profile') && !isLoggedIn) {
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
      setShowProfile(true);
      setShowLogin(false);
      return;
    }
    setShowLogin(true);
    setActiveTab('spin');
  }, [isLoggedIn]);

  return (
    <div className={styles.app}>
      <AppHeader
        isLoggedIn={isLoggedIn}
        userName={userName}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLoginClick={() => {
          setShowLogin(true);
          setShowProfile(false);
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
                    aria-label="Filter wheel by category"
                  />

                  <FoodManager
                    items={food.items}
                    onAdd={food.addItem}
                    onUpdate={food.updateItem}
                    onRemove={food.removeItem}
                    onReset={food.resetToSample}
                  />
                </section>

                <section className={styles.historyPanel} aria-label="Recent spins">
                  <SpinHistory history={history.history} onClear={history.clearHistory} />
                </section>
              </div>
            ) : activeTab === 'kitchen' ? (
              <section className={styles.kitchenPanel} aria-label="Kitchen inventory">
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Kitchen inventory</h2>
                    <p className={styles.panelSubtitle}>Track what you already have at home.</p>
                  </div>
                </div>
                <Kitchen
                  groceries={kitchen.items}
                  onAddGrocery={kitchen.addItem}
                  onUpdateGrocery={kitchen.updateItem}
                  onRemoveGrocery={kitchen.removeItem}
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
