import { useEffect, useMemo, useState } from 'react';
import type { FoodItem, GroceryItem, MealSuggestion } from '../../types';
import { useWheelSpin } from '../../hooks/useWheelSpin';
import { FoodWheel } from '../FoodWheel';
import { SpinButton } from '../SpinButton';
import { ResultDisplay } from '../ResultDisplay';
import { generateMealSuggestions } from '../../utils/mealSuggestions';
import { generateId } from '../../utils/id';
import { playSpinCompleteSound } from '../../utils/sound';
import styles from './CookAtHome.module.css';

type Props = {
  groceries: GroceryItem[];
};

const buildWheelItems = (suggestions: string[]): FoodItem[] =>
  suggestions.map((name) => ({
    id: generateId(),
    name,
    category: 'dinner' as const,
    source: 'home' as const,
  }));

export function CookAtHome({ groceries }: Props) {
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(() => new Set());
  const [wheelItems, setWheelItems] = useState<FoodItem[]>([]);
  const [openSections, setOpenSections] = useState({
    wheel: true,
    ideas: true,
  });
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    window.matchMedia('(max-width: 719px)').matches
  );
  const [showMobileResult, setShowMobileResult] = useState(false);
  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(wheelItems);

  const availableGroceries = useMemo(
    () => groceries.filter((item) => item.status !== 'out' && item.remainingQuantity > 0),
    [groceries]
  );

  const suggestionRows = useMemo(
    () => [
      mealSuggestions.filter((_, index) => index % 2 === 0),
      mealSuggestions.filter((_, index) => index % 2 === 1),
    ],
    [mealSuggestions]
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem('spin-and-eat:meal-suggestions');
      if (stored) {
        const parsed = JSON.parse(stored) as MealSuggestion[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMealSuggestions(parsed);
          setSelectedSuggestions(new Set(parsed));
          setWheelItems(buildWheelItems(parsed));
        }
      }
    } catch {
      // ignore local restore errors
    }
  }, []);

  useEffect(() => {
    if (mealSuggestions.length > 0) {
      const nextSelected = new Set(mealSuggestions);
      setSelectedSuggestions(nextSelected);
      setWheelItems(buildWheelItems(Array.from(nextSelected)));
    }
  }, [mealSuggestions]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 719px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    setIsMobileLayout(mediaQuery.matches);
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

  const handleGenerateMeals = async () => {
    if (availableGroceries.length === 0) {
      setMealError('Add groceries marked available to generate cook-at-home options.');
      setMealSuggestions([]);
      setSelectedSuggestions(new Set());
      setWheelItems([]);
      return;
    }

    setIsGeneratingMeals(true);
    setMealError(null);
    try {
      const suggestions = await generateMealSuggestions(
        availableGroceries.map((item) => ({
          name: item.name,
          remainingQuantity: item.remainingQuantity,
          unit: item.unit,
          status: item.status,
        }))
      );
      setMealSuggestions(suggestions);
      try {
        localStorage.setItem('spin-and-eat:meal-suggestions', JSON.stringify(suggestions));
      } catch {
        // ignore
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate meal ideas.';
      setMealError(message);
      setMealSuggestions([]);
      setSelectedSuggestions(new Set());
      setWheelItems([]);
      try {
        localStorage.removeItem('spin-and-eat:meal-suggestions');
      } catch {
        // ignore
      }
    } finally {
      setIsGeneratingMeals(false);
    }
  };

  const toggleSuggestion = (name: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      setWheelItems(buildWheelItems(Array.from(next)));
      return next;
    });
  };

  const handleSpin = () => {
    spin(() => {
      playSpinCompleteSound();
    });
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <section className={styles.section} aria-label="Cook at home suggestions">
      <section className={styles.panelCard}>
        <button
          type="button"
          className={styles.panelToggle}
          onClick={() => toggleSection('ideas')}
          aria-expanded={openSections.ideas}
          aria-controls="cook-ideas-content"
        >
          <span className={styles.panelToggleText}>
            <span className={styles.panelSectionTitle}>Cook-at-home ideas</span>
            <span className={styles.panelSectionSubtitle}>
              Generate dishes from items marked available in your kitchen.
            </span>
          </span>
          <span className={styles.panelToggleIcon} aria-hidden="true">
            {openSections.ideas ? 'Hide' : 'Show'}
          </span>
        </button>
        {openSections.ideas ? (
          <div id="cook-ideas-content" className={styles.panelContent}>
            <div className={styles.actionButtons}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleGenerateMeals}
                disabled={isGeneratingMeals}
              >
                {isGeneratingMeals
                  ? 'Generating...'
                  : mealSuggestions.length > 0
                    ? 'Regenerate ideas'
                    : 'Generate ideas'}
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => {
                  setMealSuggestions([]);
                  setMealError(null);
                  setSelectedSuggestions(new Set());
                  setWheelItems([]);
                  try {
                    localStorage.removeItem('spin-and-eat:meal-suggestions');
                  } catch {
                    // ignore
                  }
                }}
                disabled={mealSuggestions.length === 0 && !mealError}
              >
                Clear
              </button>
            </div>

            {mealError ? <p className={styles.errorText}>{mealError}</p> : null}
            {mealSuggestions.length === 0 && !mealError ? (
              <p className={styles.emptyText}>
                Tap generate to get dishes you can cook with your current groceries.
              </p>
            ) : mealSuggestions.length > 0 ? (
              <div className={styles.suggestionSection}>
                <div className={styles.suggestionShelf}>
                  {suggestionRows.map((row, rowIndex) => (
                    <div key={rowIndex} className={styles.suggestionRow} role="list">
                      {row.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`${styles.pillButton} ${
                            selectedSuggestions.has(suggestion)
                              ? styles.pillButtonActive
                              : styles.pillButtonMuted
                          }`}
                          onClick={() => toggleSuggestion(suggestion)}
                          aria-pressed={selectedSuggestions.has(suggestion)}
                        >
                          <span className={styles.suggestionTitle}>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={styles.panelCard}>
        <button
          type="button"
          className={styles.panelToggle}
          onClick={() => toggleSection('wheel')}
          aria-expanded={openSections.wheel}
          aria-controls="cook-wheel-content"
        >
          <span className={styles.panelToggleText}>
            <span className={styles.panelSectionTitle}>Cook wheel</span>
            <span className={styles.panelSectionSubtitle}>
              Spin a dish from your available home-cooking ideas.
            </span>
          </span>
          <span className={styles.panelToggleIcon} aria-hidden="true">
            {openSections.wheel ? 'Hide' : 'Show'}
          </span>
        </button>
        {openSections.wheel ? (
          <div id="cook-wheel-content" className={styles.panelContent}>
            <div className={styles.wheelWrap}>
              <FoodWheel
                items={wheelItems}
                rotation={rotation}
                aria-label={`Wheel with ${wheelItems.length} cook-at-home options`}
              />
            </div>
            <div className={styles.spinRow}>
              <SpinButton
                onClick={handleSpin}
                disabled={isSpinning || wheelItems.length === 0}
                isSpinning={isSpinning}
                aria-label="Spin the wheel to pick a cook-at-home option"
              />
            </div>
            <ResultDisplay
              item={isMobileLayout ? null : selectedItem}
              isSpinning={isSpinning}
              showHintWhenEmpty={!isMobileLayout}
            />
          </div>
        ) : null}
      </section>

      {openSections.wheel && isMobileLayout && showMobileResult ? (
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
    </section>
  );
}
