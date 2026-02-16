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
import { playSpinCompleteSound } from './utils/sound';
import { supabase } from './lib/supabaseClient';
import styles from './App.module.css';

function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'spin' | 'kitchen'>('spin');
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Spin &amp; Eat</h1>
        <p className={styles.tagline}>Let the wheel decide what to eat</p>
        <div className={styles.authRow}>
          {isLoggedIn ? (
            <>
              <span className={styles.signedInAs}>Welcome {userName}</span>
              <button
                type="button"
                className={styles.ghostAuthButton}
                onClick={() => {
                  setShowProfile((prev) => !prev);
                  setShowLogin(false);
                }}
              >
                Profile
              </button>
              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : !showAuthPage ? (
            <button
              type="button"
              className={styles.loginCtaButton}
              onClick={() => {
                setShowLogin(true);
                setShowProfile(false);
              }}
            >
              Log in
            </button>
          ) : null}
        </div>
      </header>

      <main className={styles.main}>
        {showAuthPage ? (
          <section className={styles.loginSection} aria-label="Login">
            <div className={styles.loginCard}>
              <h2 className={styles.loginTitle}>Sign in to Spin &amp; Eat</h2>
              <p className={styles.loginTagline}>
                Use Google to start spinning and saving history.
              </p>
              <div className={styles.loginForm}>
                <button type="button" className={styles.loginButton} onClick={handleLogin}>
                  Continue with Google
                </button>
              </div>
              <p className={styles.loginNote}>
                {authError
                  ? `Sign-in failed: ${authError}`
                  : 'You will be redirected to Google to complete sign-in.'}
              </p>
              <button
                type="button"
                className={styles.ghostAuthButton}
                onClick={() => {
                  setShowLogin(false);
                  setActiveTab('spin');
                }}
              >
                Back to Spin
              </button>
            </div>
          </section>
        ) : (
          <>
            {activeTab === 'spin' ? (
              <>
                <section
                  className={styles.wheelSection}
                  aria-labelledby="wheel-heading"
                  aria-label="Food wheel"
                >
                  <h2 id="wheel-heading" className={styles.srOnly}>
                    Food wheel
                  </h2>
                  <FoodWheel
                    items={food.filteredItems}
                    rotation={rotation}
                    isSpinning={isSpinning}
                    aria-label={`Wheel with ${food.filteredItems.length} food options`}
                  />
                  <div className={styles.spinRow}>
                    <SpinButton
                      onClick={handleSpin}
                      disabled={isSpinning || food.filteredItems.length === 0}
                      aria-label="Spin the wheel to pick a random food"
                    />
                  </div>
                  <ResultDisplay item={selectedItem} isSpinning={isSpinning} />
                </section>

                <div className={styles.controls}>
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

                  <SpinHistory history={history.history} onClear={history.clearHistory} />
                </div>
              </>
            ) : (
              <Kitchen
                groceries={kitchen.items}
                onAddGrocery={kitchen.addItem}
                onUpdateGrocery={kitchen.updateItem}
                onRemoveGrocery={kitchen.removeItem}
              />
            )}

            {showProfile && isLoggedIn ? (
              <section className={styles.profileSection} aria-label="Profile">
                <div className={styles.loginCard}>
                  <h2 className={styles.loginTitle}>Profile</h2>
                  <p className={styles.loginTagline}>Welcome {userName}</p>
                  <div className={styles.profileActions}>
                    <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                      Log out
                    </button>
                    <button
                      type="button"
                      className={styles.ghostAuthButton}
                      onClick={() => setShowProfile(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Spin &amp; Eat � Decide what to eat with a spin</p>
      </footer>
      {!showAuthPage ? (
        <nav className={styles.tabBar} aria-label="Primary">
          <button
            type="button"
            className={
              activeTab === 'spin' ? `${styles.tabButton} ${styles.tabButtonActive}` : styles.tabButton
            }
            onClick={() => setActiveTab('spin')}
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
            className={
              activeTab === 'kitchen'
                ? `${styles.tabButton} ${styles.tabButtonActive}`
                : styles.tabButton
            }
            onClick={() => {
              setActiveTab('kitchen');
              if (!isLoggedIn) {
                setShowLogin(true);
              }
            }}
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
        </nav>
      ) : null}
    </div>
  );
}

export default App;
