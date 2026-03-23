import { useEffect, useMemo, useState } from 'react';
import type {
  DishIngredientAnalysis,
  DishIngredientRequirement,
  FoodItem,
  GroceryItem,
  GroceryStatus,
  MealSuggestion,
  UserProfilePreferences,
} from '../../types';
import { useWheelSpin } from '../../hooks/useWheelSpin';
import { FoodWheel } from '../FoodWheel';
import { SpinButton } from '../SpinButton';
import { ResultDisplay } from '../ResultDisplay';
import { generateMealSuggestions } from '../../utils/mealSuggestions';
import { analyzeDishGroceries } from '../../utils/dishGroceries';
import { generateId } from '../../utils/id';
import { formatQuantity, resolveRequirementQuantityForInventory } from '../../utils/ingredientUnits';
import { playSpinCompleteSound } from '../../utils/sound';
import styles from './CookAtHome.module.css';

type Props = {
  groceries: GroceryItem[];
  onUpdateGrocery: (id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => Promise<void> | void;
  defaultServings: number;
  userProfile: UserProfilePreferences;
};

type Mode = 'ideas' | 'manual';

type RequirementPreview = {
  requirement: DishIngredientRequirement;
  matchedItem: GroceryItem | null;
  matchedQuantity: number | null;
  enoughStock: boolean;
  status: 'ready' | 'low' | 'missing';
  note: string;
};

type InventoryUpdatePreview = {
  item: GroceryItem;
  usedQuantity: number;
  nextRemainingQuantity: number;
  nextStatus: GroceryStatus;
  enoughStock: boolean;
};

const buildWheelItems = (suggestions: string[]): FoodItem[] =>
  suggestions.map((name) => ({
    id: generateId(),
    name,
    category: 'dinner' as const,
    source: 'home' as const,
  }));

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const toTokens = (value: string) =>
  normalizeName(value)
    .split(' ')
    .filter((token) => token.length > 1);

const getIngredientAliases = (value: string) => {
  const aliases = new Set<string>();
  const normalized = normalizeName(value);
  if (normalized) {
    aliases.add(normalized);
  }

  value
    .split(/[,/]/)
    .map((part) => normalizeName(part))
    .filter(Boolean)
    .forEach((part) => aliases.add(part));

  const bracketParts = Array.from(value.matchAll(/\(([^)]+)\)/g))
    .map((match) => normalizeName(match[1]))
    .filter(Boolean);
  bracketParts.forEach((part) => aliases.add(part));

  return Array.from(aliases);
};

const scoreIngredientMatch = (requirementName: string, groceryName: string) => {
  const requirement = normalizeName(requirementName);
  const aliases = getIngredientAliases(groceryName);
  const requirementTokens = toTokens(requirementName);

  let bestScore = 0;
  aliases.forEach((alias) => {
    if (!alias) return;
    if (alias === requirement) {
      bestScore = Math.max(bestScore, 100);
      return;
    }

    if (alias.includes(requirement) || requirement.includes(alias)) {
      bestScore = Math.max(bestScore, 78);
    }

    const aliasTokens = toTokens(alias);
    const overlap = requirementTokens.filter((token) => aliasTokens.includes(token)).length;
    if (overlap > 0) {
      const score = Math.round(
        (overlap / Math.max(requirementTokens.length, aliasTokens.length)) * 65
      );
      bestScore = Math.max(bestScore, score);
    }
  });

  return bestScore;
};

const findBestInventoryMatch = (
  requirement: DishIngredientRequirement,
  groceries: GroceryItem[]
) => {
  const ranked = groceries
    .map((item) => ({
      item,
      score: scoreIngredientMatch(requirement.name, item.name),
    }))
    .filter((entry) => entry.score >= 36)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.item ?? null;
};

const deriveStatusFromRemaining = (
  orderedQuantity: number,
  remainingQuantity: number
): GroceryStatus => {
  if (remainingQuantity <= 0 || orderedQuantity <= 0) return 'out';
  if (remainingQuantity <= orderedQuantity * 0.2) return 'low';
  return 'available';
};

const buildRequirementPreview = (
  analysis: DishIngredientAnalysis,
  groceries: GroceryItem[]
): {
  requirements: RequirementPreview[];
  inventoryUpdates: InventoryUpdatePreview[];
} => {
  const inventoryUsage = new Map<string, { item: GroceryItem; usedQuantity: number }>();

  const requirements: RequirementPreview[] = analysis.ingredients.map(
    (requirement): RequirementPreview => {
      const matchedItem = findBestInventoryMatch(requirement, groceries);
      if (!matchedItem) {
        return {
          requirement,
          matchedItem: null,
          matchedQuantity: null,
          enoughStock: false,
          status: 'missing',
          note: 'Not in inventory.',
        };
      }

      const resolvedQuantity = resolveRequirementQuantityForInventory(requirement, matchedItem);
      if (resolvedQuantity === null) {
        return {
          requirement,
          matchedItem,
          matchedQuantity: null,
          enoughStock: false,
          status: 'missing',
          note: `${requirement.unit} vs ${matchedItem.unit}`,
        };
      }

      const matchedQuantity = resolvedQuantity.quantity;
      const enoughStock = matchedItem.remainingQuantity >= matchedQuantity;
      const status: RequirementPreview['status'] = enoughStock ? 'ready' : 'low';

      const existingUsage = inventoryUsage.get(matchedItem.id);
      if (existingUsage) {
        existingUsage.usedQuantity += matchedQuantity;
      } else {
        inventoryUsage.set(matchedItem.id, {
          item: matchedItem,
          usedQuantity: matchedQuantity,
        });
      }

      return {
        requirement,
        matchedItem,
        matchedQuantity,
        enoughStock,
        status,
        note: enoughStock
          ? `${formatQuantity(matchedQuantity)} ${matchedItem.unit}${resolvedQuantity.estimated ? ' est.' : ''} from ${resolvedQuantity.note}`
          : `Only ${formatQuantity(matchedItem.remainingQuantity)} ${matchedItem.unit} left`,
      };
    }
  );

  const inventoryUpdates = Array.from(inventoryUsage.values()).map(({ item, usedQuantity }) => {
    const roundedUsage = Number(usedQuantity.toFixed(2));
    const enoughStock = item.remainingQuantity >= roundedUsage;
    const nextRemainingQuantity = enoughStock
      ? Number((item.remainingQuantity - roundedUsage).toFixed(2))
      : Number(item.remainingQuantity.toFixed(2));

    return {
      item,
      usedQuantity: roundedUsage,
      nextRemainingQuantity,
      nextStatus: deriveStatusFromRemaining(item.orderedQuantity, nextRemainingQuantity),
      enoughStock,
    };
  });

  return { requirements, inventoryUpdates };
};

export function CookAtHome({
  groceries,
  onUpdateGrocery,
  defaultServings,
  userProfile,
}: Props) {
  const [mode, setMode] = useState<Mode>('ideas');
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(() => new Set());
  const [wheelItems, setWheelItems] = useState<FoodItem[]>([]);
  const [dishInput, setDishInput] = useState('');
  const [servings, setServings] = useState(() => Math.max(1, Math.round(defaultServings || 1)));
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [analysisServings, setAnalysisServings] = useState<number | null>(null);
  const [dishAnalysis, setDishAnalysis] = useState<DishIngredientAnalysis | null>(null);
  const [dishError, setDishError] = useState<string | null>(null);
  const [dishSuccess, setDishSuccess] = useState<string | null>(null);
  const [isAnalyzingDish, setIsAnalyzingDish] = useState(false);
  const [isApplyingDishUpdate, setIsApplyingDishUpdate] = useState(false);
  const [openSections, setOpenSections] = useState({ wheel: true, ideas: true });
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

  const preview = useMemo(() => {
    if (!dishAnalysis) {
      return null;
    }

    return buildRequirementPreview(dishAnalysis, groceries);
  }, [dishAnalysis, groceries]);

  const canApplyDishUpdate =
    preview !== null &&
    preview.inventoryUpdates.some((entry) => entry.enoughStock && entry.usedQuantity > 0);

  const handleCookSelectedDish = (dishName: string) => {
    setShowMobileResult(false);
    setMode('manual');
    setDishInput(dishName);
    setSelectedDish(dishName);
    setDishAnalysis(null);
    setAnalysisServings(null);
    setDishError(null);
    setDishSuccess(null);
  };

  useEffect(() => {
    setServings(Math.max(1, Math.round(defaultServings || 1)));
  }, [defaultServings]);

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
      setMealError('Add groceries first.');
      setMealSuggestions([]);
      setSelectedSuggestions(new Set());
      setWheelItems([]);
      return;
    }

    setIsGeneratingMeals(true);
    setMealError(null);
    try {
      const excludeSuggestions = mealSuggestions;
      const suggestions = await generateMealSuggestions(
        availableGroceries.map((item) => ({
          name: item.name,
          remainingQuantity: item.remainingQuantity,
          unit: item.unit,
          status: item.status,
        })),
        userProfile,
        {
          maxSuggestions: 10,
          excludeSuggestions,
        }
      );
      setMealSuggestions((prev) => {
        const merged = [...prev];
        suggestions.forEach((suggestion) => {
          if (!merged.some((item) => item.toLowerCase() === suggestion.toLowerCase())) {
            merged.push(suggestion);
          }
        });
        return merged;
      });
      try {
        const merged = [...mealSuggestions];
        suggestions.forEach((suggestion) => {
          if (!merged.some((item) => item.toLowerCase() === suggestion.toLowerCase())) {
            merged.push(suggestion);
          }
        });
        localStorage.setItem('spin-and-eat:meal-suggestions', JSON.stringify(merged));
      } catch {
        // ignore
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate ideas.';
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

  const handleReviewDish = async () => {
    const dishName = dishInput;
    const trimmedDish = dishName.trim();
    if (!trimmedDish) {
      setDishError('Enter a dish.');
      setDishSuccess(null);
      setSelectedDish(null);
      setDishAnalysis(null);
      return;
    }

    const normalizedServings = Math.max(1, Math.round(servings || 1));

    setIsAnalyzingDish(true);
    setDishError(null);
    setDishSuccess(null);
    setSelectedDish(trimmedDish);
    setAnalysisServings(normalizedServings);

    try {
      const analysis = await analyzeDishGroceries(
        trimmedDish,
        groceries.map((item) => ({
          name: item.name,
          remainingQuantity: item.remainingQuantity,
          unit: item.unit,
          status: item.status,
        })),
        normalizedServings,
        userProfile
      );
      setDishAnalysis(analysis);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze the dish.';
      setDishError(message);
      setDishAnalysis(null);
    } finally {
      setIsAnalyzingDish(false);
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

  const handleApplyDishUpdate = async () => {
    if (!preview || !selectedDish) {
      return;
    }

    const updates = preview.inventoryUpdates.filter(
      (entry) => entry.enoughStock && entry.usedQuantity > 0
    );
    if (updates.length === 0) {
      setDishError('Nothing to update.');
      return;
    }

    setIsApplyingDishUpdate(true);
    setDishError(null);
    setDishSuccess(null);

    try {
      await Promise.all(
        updates.map((entry) =>
          Promise.resolve(
            onUpdateGrocery(entry.item.id, {
              remainingQuantity: entry.nextRemainingQuantity,
              status: entry.nextStatus,
            })
          )
        )
      );
      setDishSuccess(
        `Updated for ${selectedDish} (${analysisServings ?? servings} ${
          (analysisServings ?? servings) === 1 ? 'person' : 'people'
        }).`
      );
      setDishAnalysis(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update grocery inventory.';
      setDishError(message);
    } finally {
      setIsApplyingDishUpdate(false);
    }
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
            <span className={styles.panelSectionTitle}>Cook</span>
            <span className={styles.panelSectionSubtitle}>Pick a path.</span>
          </span>
          <span className={styles.panelToggleIcon} aria-hidden="true">
            {openSections.ideas ? 'Hide' : 'Show'}
          </span>
        </button>
        {openSections.ideas ? (
          <div id="cook-ideas-content" className={styles.panelContent}>
            <div className={styles.modeSwitch} role="tablist" aria-label="Cook mode">
              <button
                type="button"
                className={`${styles.modeButton} ${mode === 'ideas' ? styles.modeButtonActive : ''}`}
                onClick={() => setMode('ideas')}
                aria-pressed={mode === 'ideas'}
              >
                Generate ideas
              </button>
              <button
                type="button"
                className={`${styles.modeButton} ${mode === 'manual' ? styles.modeButtonActive : ''}`}
                onClick={() => setMode('manual')}
                aria-pressed={mode === 'manual'}
              >
                I know the dish
              </button>
            </div>

            {mode === 'ideas' ? (
              <>
                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className={`${styles.primaryButton} ${styles.actionGrow}`}
                    onClick={handleGenerateMeals}
                    disabled={isGeneratingMeals}
                  >
                    {isGeneratingMeals
                      ? 'Generating...'
                      : mealSuggestions.length > 0
                        ? 'Generate more'
                        : 'Generate'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.ghostButton} ${styles.actionGrow}`}
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
                  <p className={styles.emptyText}>Generate ideas from your inventory.</p>
                ) : (
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
                )}

              </>
            ) : (
              <div className={styles.composeCard}>
                <div className={styles.inputRow}>
                  <input
                    className={styles.textInput}
                    placeholder="Dish name"
                    value={dishInput}
                    onChange={(event) => {
                      setDishInput(event.target.value);
                      setSelectedDish(event.target.value.trim() || null);
                      setDishAnalysis(null);
                      setAnalysisServings(null);
                      setDishError(null);
                      setDishSuccess(null);
                    }}
                  />
                  <div className={styles.servingsControl} aria-label="Number of people">
                    <button
                      type="button"
                      className={styles.servingsButton}
                      onClick={() => {
                        setServings((prev) => Math.max(1, prev - 1));
                        setDishAnalysis(null);
                        setAnalysisServings(null);
                        setDishError(null);
                        setDishSuccess(null);
                      }}
                      disabled={servings <= 1}
                      aria-label="Decrease number of people"
                    >
                      -
                    </button>
                    <span className={styles.servingsValue}>
                      {servings} {servings === 1 ? 'person' : 'people'}
                    </span>
                    <button
                      type="button"
                      className={styles.servingsButton}
                      onClick={() => {
                        setServings((prev) => prev + 1);
                        setDishAnalysis(null);
                        setAnalysisServings(null);
                        setDishError(null);
                        setDishSuccess(null);
                      }}
                      aria-label="Increase number of people"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleReviewDish()}
                    disabled={isAnalyzingDish}
                  >
                    {isAnalyzingDish ? 'Getting...' : 'Get ingredients'}
                  </button>
                </div>
                <p className={styles.emptyText}>
                  Quantities will be calculated for {servings} {servings === 1 ? 'person' : 'people'}.
                </p>
              </div>
            )}
            {dishError ? <p className={styles.errorText}>{dishError}</p> : null}
            {dishSuccess ? <p className={styles.successText}>{dishSuccess}</p> : null}

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
            <span className={styles.panelSectionSubtitle}>Spin from selected ideas.</span>
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
              actionLabel={selectedItem ? `Use ${selectedItem.name}` : undefined}
              onAction={selectedItem ? () => handleCookSelectedDish(selectedItem.name) : undefined}
            />
          </div>
        ) : null}
      </section>

      {preview ? (
        <div
          className={styles.reviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={selectedDish ? `Ingredients for ${selectedDish}` : 'Ingredients review'}
        >
          <div className={styles.reviewDialog}>
            <div className={styles.reviewCard}>
              <button
                type="button"
                className={styles.reviewCloseButton}
                onClick={() => {
                  setDishAnalysis(null);
                  setAnalysisServings(null);
                  setDishError(null);
                }}
                aria-label="Close ingredient review"
              >
                x
              </button>
              <div className={styles.reviewHeader}>
                <div>
                  <h3 className={styles.reviewTitle}>{selectedDish ?? 'Dish'} ingredients</h3>
                  <p className={styles.reviewMeta}>
                    {preview.requirements.length} items for {analysisServings ?? servings}{' '}
                    {((analysisServings ?? servings) === 1) ? 'person' : 'people'}
                  </p>
                </div>
              </div>

              <div className={styles.reviewScrollArea}>
                <div className={styles.ingredientList}>
                  {preview.requirements.map((entry) => (
                    <div
                      key={`${entry.requirement.name}-${entry.requirement.unit}`}
                      className={styles.ingredientRow}
                    >
                      <div className={styles.ingredientMain}>
                        <span className={styles.ingredientName}>{entry.requirement.name}</span>
                        <span className={styles.ingredientMeta}>
                          {formatQuantity(entry.requirement.quantity)} {entry.requirement.unit}
                          {entry.requirement.inventoryQuantity && entry.requirement.inventoryUnit
                            ? ` • ${formatQuantity(entry.requirement.inventoryQuantity)} ${entry.requirement.inventoryUnit} for inventory`
                            : ''}
                        </span>
                      </div>
                      <div className={styles.ingredientSide}>
                        <span
                          className={`${styles.matchPill} ${
                            entry.status === 'ready'
                              ? styles.matchReady
                              : entry.status === 'low'
                                ? styles.matchLow
                                : styles.matchMissing
                          }`}
                        >
                          {entry.status === 'ready'
                            ? 'Ready'
                            : entry.status === 'low'
                              ? 'Low'
                              : 'Missing'}
                        </span>
                        <span className={styles.ingredientNote}>{entry.note}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.updateSummary}>
                  <h4 className={styles.summaryTitle}>After update</h4>
                  {preview.inventoryUpdates.length === 0 ? (
                    <p className={styles.emptyText}>No matched groceries yet.</p>
                  ) : (
                    <div className={styles.summaryList}>
                      {preview.inventoryUpdates.map((entry) => (
                        <div key={entry.item.id} className={styles.summaryRow}>
                          <div className={styles.ingredientMain}>
                            <span className={styles.summaryItemName}>{entry.item.name}</span>
                            <span className={styles.summaryItemMeta}>
                              {formatQuantity(entry.usedQuantity)} {entry.item.unit}
                            </span>
                          </div>
                          <div className={styles.ingredientSide}>
                            <span className={styles.summaryDelta}>
                              {entry.enoughStock
                                ? `${formatQuantity(entry.item.remainingQuantity)} -> ${formatQuantity(entry.nextRemainingQuantity)} ${entry.item.unit}`
                                : `Only ${formatQuantity(entry.item.remainingQuantity)} ${entry.item.unit} left`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!canApplyDishUpdate ? (
                  <p className={styles.warningText}>Not enough matched stock to update.</p>
                ) : preview.requirements.some((entry) => entry.status !== 'ready') ? (
                  <p className={styles.warningText}>Only matched in-stock items will be updated.</p>
                ) : null}
              </div>

              <div className={styles.reviewFooter}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => void handleApplyDishUpdate()}
                  disabled={!canApplyDishUpdate || isApplyingDishUpdate}
                >
                  {isApplyingDishUpdate ? 'Updating...' : 'Update ingredients'}
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setDishAnalysis(null);
                    setAnalysisServings(null);
                    setDishError(null);
                  }}
                  disabled={isApplyingDishUpdate}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {openSections.wheel && isMobileLayout && showMobileResult ? (
        <ResultDisplay
          item={selectedItem}
          isSpinning={false}
          asDialog
          actionLabel={selectedItem ? `Use ${selectedItem.name}` : undefined}
          onAction={selectedItem ? () => handleCookSelectedDish(selectedItem.name) : undefined}
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

