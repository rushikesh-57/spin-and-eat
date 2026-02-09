import { useCallback, useRef, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { FoodCategory } from './types';
import { useFoodItems } from './hooks/useFoodItems';
import { useSpinHistory } from './hooks/useSpinHistory';
import { useFeelingLucky } from './hooks/useFeelingLucky';
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
import styles from './App.module.css';

function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [activeTab, setActiveTab] = useState<'spin' | 'kitchen'>('spin');
  const food = useFoodItems();
  const kitchen = useGroceryInventory();
  const history = useSpinHistory();
  const feelingLucky = useFeelingLucky();
  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(food.filteredItems);
  const hasAutoSpun = useRef(false);
  const isLoggedIn = Boolean(userEmail);

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
    if (
      !feelingLucky.feelingLuckyEnabled ||
      hasAutoSpun.current ||
      food.filteredItems.length === 0
    ) {
      return;
    }
    hasAutoSpun.current = true;
    const t = setTimeout(handleSpin, 800);
    return () => clearTimeout(t);
  }, [feelingLucky.feelingLuckyEnabled, food.filteredItems.length, handleSpin]);

  const handleLogin = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = emailInput.trim();
      if (!trimmed || !trimmed.includes('@')) {
        return;
      }
      setUserEmail(trimmed);
      setEmailInput('');
    },
    [emailInput]
  );

  const handleLogout = useCallback(() => {
    setUserEmail(null);
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Spin &amp; Eat</h1>
        <p className={styles.tagline}>Let the wheel decide what to eat</p>
        {isLoggedIn ? (
          <div className={styles.authRow}>
            <span className={styles.signedInAs}>Signed in as {userEmail}</span>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : null}
      </header>

      {isLoggedIn ? (
        <main className={styles.main}>
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

                <label className={styles.feelingLucky}>
                  <input
                    type="checkbox"
                    checked={feelingLucky.feelingLuckyEnabled}
                    onChange={(e) => feelingLucky.setFeelingLucky(e.target.checked)}
                    aria-describedby="feeling-lucky-desc"
                  />
                  <span id="feeling-lucky-desc">Feeling Lucky (auto-spin on load)</span>
                </label>

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
              foods={food.items}
              groceries={kitchen.items}
              ingredientNames={kitchen.ingredientNames}
              mapping={kitchen.mapping}
              onAddGrocery={kitchen.addItem}
              onUpdateGrocery={kitchen.updateItem}
              onRemoveGrocery={kitchen.removeItem}
              onAddIngredient={kitchen.addIngredient}
              onUpdateIngredient={kitchen.updateIngredient}
              onRemoveIngredient={kitchen.removeIngredient}
            />
          )}
        </main>
      ) : (
        <main className={styles.main}>
          <section className={styles.loginSection} aria-label="Login">
            <div className={styles.loginCard}>
              <h2 className={styles.loginTitle}>Sign in to Spin &amp; Eat</h2>
              <p className={styles.loginTagline}>
                Use your Google email to start spinning and saving history.
              </p>
              <form className={styles.loginForm} onSubmit={handleLogin}>
                <label className={styles.loginLabel} htmlFor="google-email">
                  Google email
                </label>
                <input
                  id="google-email"
                  className={styles.loginInput}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@gmail.com"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  required
                />
                <button type="submit" className={styles.loginButton}>
                  Continue with Google
                </button>
              </form>
              <p className={styles.loginNote}>
                This is a demo login to keep the layout consistent.
              </p>
            </div>
          </section>
        </main>
      )}

      <footer className={styles.footer}>
        <p>Spin &amp; Eat — Decide what to eat with a spin</p>
      </footer>
      {isLoggedIn ? (
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
            onClick={() => setActiveTab('kitchen')}
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
