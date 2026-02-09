import { useCallback, useRef, useEffect } from 'react';
import type { FoodCategory } from './types';
import { useFoodItems } from './hooks/useFoodItems';
import { useSpinHistory } from './hooks/useSpinHistory';
import { useFeelingLucky } from './hooks/useFeelingLucky';
import { useWheelSpin } from './hooks/useWheelSpin';
import { FoodWheel } from './components/FoodWheel';
import { SpinButton } from './components/SpinButton';
import { ResultDisplay } from './components/ResultDisplay';
import { CategoryFilter } from './components/CategoryFilter';
import { FoodManager } from './components/FoodManager';
import { SpinHistory } from './components/SpinHistory';
import { playSpinCompleteSound } from './utils/sound';
import styles from './App.module.css';

function App() {
  const food = useFoodItems();
  const history = useSpinHistory();
  const feelingLucky = useFeelingLucky();
  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(food.filteredItems);
  const hasAutoSpun = useRef(false);

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

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Spin &amp; Eat</h1>
        <p className={styles.tagline}>Let the wheel decide what to eat</p>
      </header>

      <main className={styles.main}>
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
      </main>

      <footer className={styles.footer}>
        <p>Spin &amp; Eat — Decide what to eat with a spin</p>
      </footer>
    </div>
  );
}

export default App;
