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
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
  const [showSuggestionPicker, setShowSuggestionPicker] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
    () => new Set()
  );
  const [wheelItems, setWheelItems] = useState<FoodItem[]>([]);
  const { rotation, isSpinning, selectedItem, spin } = useWheelSpin(wheelItems);

  const availableGroceries = useMemo(
    () =>
      groceries.filter((item) => item.status !== 'out' && item.remainingQuantity > 0),
    [groceries]
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem('spin-and-eat:meal-suggestions');
      const storedTime = localStorage.getItem('spin-and-eat:meal-suggestions-time');
      if (stored) {
        const parsed = JSON.parse(stored) as MealSuggestion[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMealSuggestions(parsed);
          setSelectedSuggestions(new Set(parsed));
          setWheelItems(buildWheelItems(parsed));
        }
      }
      if (storedTime) {
        const timeValue = Number(storedTime);
        if (!Number.isNaN(timeValue)) {
          setLastGeneratedAt(timeValue);
        }
      }
    } catch {
      // ignore local restore errors
    }
  }, []);

  useEffect(() => {
    if (mealSuggestions.length > 0) {
      setSelectedSuggestions(new Set(mealSuggestions));
      setWheelItems(buildWheelItems(mealSuggestions));
    }
  }, [mealSuggestions]);

  const handleGenerateMeals = async () => {
    if (availableGroceries.length === 0) {
      setMealError('Add groceries marked available to generate cook-at-home options.');
      setMealSuggestions([]);
      setShowSuggestionPicker(false);
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
      setWheelItems(buildWheelItems(suggestions));
      setShowSuggestionPicker(false);
      const now = Date.now();
      setLastGeneratedAt(now);
      try {
        localStorage.setItem('spin-and-eat:meal-suggestions-time', String(now));
      } catch {
        // ignore
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate meal ideas.';
      setMealError(message);
      setMealSuggestions([]);
      setWheelItems([]);
      try {
        localStorage.removeItem('spin-and-eat:meal-suggestions');
        localStorage.removeItem('spin-and-eat:meal-suggestions-time');
      } catch {
        // ignore
      }
      setShowSuggestionPicker(false);
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
      return next;
    });
  };

  const handleToggleAllSuggestions = () => {
    if (selectedSuggestions.size === mealSuggestions.length) {
      setSelectedSuggestions(new Set());
      return;
    }
    setSelectedSuggestions(new Set(mealSuggestions));
  };

  const handleApplySuggestionsToWheel = () => {
    if (selectedSuggestions.size === 0) return;
    setWheelItems(buildWheelItems(Array.from(selectedSuggestions)));
    setShowSuggestionPicker(false);
  };

  const handleSpin = () => {
    spin(() => {
      playSpinCompleteSound();
    });
  };

  return (
    <section className={styles.section} aria-label="Cook at home suggestions">
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Cook at home</h2>
          <p className={styles.sectionSubtitle}>Generate dishes from what is in your kitchen.</p>
        </div>
      </div>

      <div className={styles.card}>
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
            aria-label="Spin the wheel to pick a cook-at-home option"
          />
        </div>
        <ResultDisplay item={selectedItem} isSpinning={isSpinning} />
        <div className={styles.aiHeader}>
          <div>
            <h3 className={styles.listTitle}>Cook-at-home ideas</h3>
            <p className={styles.listMeta}>
              Generated from items marked available in your kitchen.
            </p>
          </div>
          <div className={styles.listActions}>
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
              onClick={() => setShowSuggestionPicker(true)}
              disabled={mealSuggestions.length === 0}
            >
              Show on wheel
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => {
                setMealSuggestions([]);
                setMealError(null);
                setLastGeneratedAt(null);
                setShowSuggestionPicker(false);
                try {
                  localStorage.removeItem('spin-and-eat:meal-suggestions');
                  localStorage.removeItem('spin-and-eat:meal-suggestions-time');
                } catch {
                  // ignore
                }
              }}
              disabled={mealSuggestions.length === 0 && !mealError}
            >
              Clear
            </button>
          </div>
        </div>
        {mealError ? <p className={styles.errorText}>{mealError}</p> : null}
        {lastGeneratedAt ? (
          <p className={styles.subtleMeta}>
            Last generated {new Date(lastGeneratedAt).toLocaleTimeString()}
          </p>
        ) : null}
        {mealSuggestions.length === 0 && !mealError ? (
          <p className={styles.emptyText}>
            Tap generate to get dishes you can cook with your current groceries.
          </p>
        ) : mealSuggestions.length > 0 ? (
          <div className={styles.suggestionGrid}>
            {mealSuggestions.map((suggestion) => (
              <div key={suggestion} className={styles.suggestionCard}>
                <div className={styles.suggestionTitle}>{suggestion}</div>
              </div>
            ))}
          </div>
        ) : null}
        {showSuggestionPicker && mealSuggestions.length > 0 ? (
          <div className={styles.selectorPanel}>
            <div className={styles.selectorHeader}>
              <div>
                <div className={styles.selectorTitle}>Pick dishes for the wheel</div>
                <div className={styles.selectorMeta}>
                  Select one or more suggestions to show on the wheel.
                </div>
              </div>
              <button
                type="button"
                className={styles.linkButton}
                onClick={handleToggleAllSuggestions}
              >
                {selectedSuggestions.size === mealSuggestions.length
                  ? 'Clear all'
                  : 'Select all'}
              </button>
            </div>
            <div className={styles.selectorList}>
              {mealSuggestions.map((suggestion) => (
                <label key={suggestion} className={styles.selectorRow}>
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.has(suggestion)}
                    onChange={() => toggleSuggestion(suggestion)}
                  />
                  <span>{suggestion}</span>
                </label>
              ))}
            </div>
            <div className={styles.selectorFooter}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleApplySuggestionsToWheel}
                disabled={selectedSuggestions.size === 0}
              >
                Apply to wheel
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setShowSuggestionPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
