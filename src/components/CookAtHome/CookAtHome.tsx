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
import { CATEGORY_SECTIONS } from '../../utils/groceryCategories';
import { playSpinCompleteSound } from '../../utils/sound';
import styles from './CookAtHome.module.css';

type Props = {
  groceries: GroceryItem[];
  onUpdateGrocery: (id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => Promise<void> | void;
  defaultServings: number;
  userProfile: UserProfilePreferences;
};

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

type EditableIngredientRequirement = DishIngredientRequirement & {
  localId: string;
  quantityInput?: string;
};

type AddIngredientDraft = {
  name: string;
  quantity: string;
  unit: string;
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
  requirements: DishIngredientRequirement[],
  groceries: GroceryItem[]
): {
  requirements: RequirementPreview[];
  inventoryUpdates: InventoryUpdatePreview[];
} => {
  const inventoryUsage = new Map<string, { item: GroceryItem; usedQuantity: number }>();

  const requirementPreviews: RequirementPreview[] = requirements.map(
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
          ? ''
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

  return { requirements: requirementPreviews, inventoryUpdates };
};

export function CookAtHome({
  groceries,
  onUpdateGrocery,
  defaultServings,
  userProfile,
}: Props) {
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
  const [editableRequirements, setEditableRequirements] = useState<EditableIngredientRequirement[]>(
    []
  );
  const [addIngredientDraft, setAddIngredientDraft] = useState<AddIngredientDraft>({
    name: '',
    quantity: '',
    unit: 'pcs',
  });
  const [dishError, setDishError] = useState<string | null>(null);
  const [dishSuccess, setDishSuccess] = useState<string | null>(null);
  const [isAnalyzingDish, setIsAnalyzingDish] = useState(false);
  const [isApplyingDishUpdate, setIsApplyingDishUpdate] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
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

    return buildRequirementPreview(editableRequirements, groceries);
  }, [dishAnalysis, editableRequirements, groceries]);

  const canApplyDishUpdate =
    preview !== null &&
    preview.inventoryUpdates.some((entry) => entry.enoughStock && entry.usedQuantity > 0);

  const handleCookSelectedDish = (dishName: string) => {
    setShowMobileResult(false);
    setDishInput(dishName);
    setSelectedDish(dishName);
    setDishAnalysis(null);
    setEditableRequirements([]);
    setAnalysisServings(null);
    setShowUpdateConfirmation(false);
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
      setEditableRequirements(
        analysis.ingredients.map((ingredient) => ({
          ...ingredient,
          localId: generateId(),
          quantityInput: formatQuantity(ingredient.quantity),
        }))
      );
      setAddIngredientDraft({
        name: '',
        quantity: '',
        unit: 'pcs',
      });
      setShowUpdateConfirmation(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze the dish.';
      setDishError(message);
      setDishAnalysis(null);
      setEditableRequirements([]);
      setShowUpdateConfirmation(false);
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

  const updateEditableRequirement = (
    localId: string,
    updates: Partial<EditableIngredientRequirement>
  ) => {
    setEditableRequirements((prev) =>
      prev.map((requirement) =>
        requirement.localId === localId
          ? {
              ...requirement,
              ...updates,
              ...(updates.quantity !== undefined || updates.unit !== undefined
                ? {
                    inventoryQuantity: undefined,
                    inventoryUnit: undefined,
                  }
                : {}),
            }
          : requirement
      )
    );
  };

  const handleQuantityInputChange = (localId: string, rawValue: string) => {
    const parsedQuantity = Number(rawValue);
    updateEditableRequirement(localId, {
      quantityInput: rawValue,
      ...(rawValue.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0
        ? { quantity: parsedQuantity }
        : {}),
    });
  };

  const handleQuantityInputBlur = (localId: string) => {
    setEditableRequirements((prev) =>
      prev.map((requirement) => {
        if (requirement.localId !== localId) {
          return requirement;
        }

        const rawValue = requirement.quantityInput ?? '';
        const parsedQuantity = Number(rawValue);
        if (rawValue.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0) {
          return {
            ...requirement,
            quantity: parsedQuantity,
            quantityInput: formatQuantity(parsedQuantity),
            inventoryQuantity: undefined,
            inventoryUnit: undefined,
          };
        }

        return {
          ...requirement,
          quantityInput: formatQuantity(requirement.quantity),
        };
      })
    );
  };

  const removeEditableRequirement = (localId: string) => {
    setEditableRequirements((prev) =>
      prev.filter((requirement) => requirement.localId !== localId)
    );
  };

  const handleAddIngredient = () => {
    const trimmedName = addIngredientDraft.name.trim();
    const parsedQuantity = Number(addIngredientDraft.quantity);
    const trimmedUnit = addIngredientDraft.unit.trim();

    if (!trimmedName || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !trimmedUnit) {
      setDishError('Enter a valid ingredient name, quantity, and unit before adding.');
      return;
    }

    setEditableRequirements((prev) => [
      ...prev,
      {
        localId: generateId(),
        name: trimmedName,
        quantity: parsedQuantity,
        quantityInput: formatQuantity(parsedQuantity),
        unit: trimmedUnit,
        importance: 'essential',
      },
    ]);
    setDishError(null);
    setAddIngredientDraft({
      name: '',
      quantity: '',
      unit: 'pcs',
    });
    setShowUpdateConfirmation(false);
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
      setEditableRequirements([]);
      setShowUpdateConfirmation(false);
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
            <span className={styles.panelSectionSubtitle}>Generate ideas or enter a dish directly.</span>
          </span>
          <span className={styles.panelToggleIcon} aria-hidden="true">
            {openSections.ideas ? 'Hide' : 'Show'}
          </span>
        </button>
        {openSections.ideas ? (
          <div id="cook-ideas-content" className={styles.panelContent}>
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
                      setEditableRequirements([]);
                      setAnalysisServings(null);
                      setShowUpdateConfirmation(false);
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
                        setEditableRequirements([]);
                        setAnalysisServings(null);
                        setShowUpdateConfirmation(false);
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
                        setEditableRequirements([]);
                        setAnalysisServings(null);
                        setShowUpdateConfirmation(false);
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
              </>
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
                  setEditableRequirements([]);
                  setAnalysisServings(null);
                  setShowUpdateConfirmation(false);
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
                      key={(entry.requirement as EditableIngredientRequirement).localId}
                      className={styles.ingredientRow}
                    >
                      <div className={styles.ingredientMain}>
                        <div className={styles.ingredientTextBlock}>
                          <div className={styles.ingredientTitleRow}>
                            <span className={styles.ingredientName}>{entry.requirement.name}</span>
                            {entry.status !== 'ready' ? (
                              <span className={styles.ingredientHint}>
                                {entry.status === 'missing' ? 'Need item' : 'Check stock'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className={styles.ingredientControls}>
                          <input
                            className={styles.ingredientQuantityInput}
                            type="text"
                            inputMode="decimal"
                            value={
                              (entry.requirement as EditableIngredientRequirement).quantityInput ??
                              formatQuantity(entry.requirement.quantity)
                            }
                            onChange={(event) =>
                              handleQuantityInputChange(
                                (entry.requirement as EditableIngredientRequirement).localId,
                                event.target.value
                              )
                            }
                            onBlur={() =>
                              handleQuantityInputBlur(
                                (entry.requirement as EditableIngredientRequirement).localId
                              )
                            }
                            aria-label={`Quantity for ${entry.requirement.name}`}
                          />
                          <span className={styles.ingredientUnitLabel}>
                            {entry.requirement.unit}
                          </span>
                        </div>
                      </div>
                      <div className={styles.ingredientSide}>
                        <button
                          type="button"
                          className={styles.removeIngredientButton}
                          onClick={() =>
                            removeEditableRequirement(
                              (entry.requirement as EditableIngredientRequirement).localId
                            )
                          }
                          aria-label={`Remove ${entry.requirement.name}`}
                          title="Remove ingredient"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className={styles.deleteIcon}
                          >
                            <path
                              d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11V8h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.addIngredientCard}>
                  <h4 className={styles.summaryTitle}>Add missing ingredient</h4>
                  <div className={styles.addIngredientRow}>
                    <input
                      className={styles.textInput}
                      type="text"
                      placeholder="Ingredient name"
                      value={addIngredientDraft.name}
                      onChange={(event) =>
                        setAddIngredientDraft((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <input
                      className={styles.ingredientQuantityInput}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      value={addIngredientDraft.quantity}
                      onChange={(event) =>
                        setAddIngredientDraft((prev) => ({
                          ...prev,
                          quantity: event.target.value,
                        }))
                      }
                    />
                    <input
                      className={styles.ingredientUnitInput}
                      type="text"
                      placeholder="Unit"
                      value={addIngredientDraft.unit}
                      onChange={(event) =>
                        setAddIngredientDraft((prev) => ({ ...prev, unit: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={handleAddIngredient}
                    >
                      Add
                    </button>
                  </div>
                  <p className={styles.ingredientMeta}>
                    Common grocery categories: {CATEGORY_SECTIONS.slice(0, 4).map((category) => category.title).join(', ')}.
                  </p>
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
                  onClick={() => setShowUpdateConfirmation(true)}
                  disabled={!canApplyDishUpdate || isApplyingDishUpdate}
                >
                  Review update
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setDishAnalysis(null);
                    setEditableRequirements([]);
                    setAnalysisServings(null);
                    setShowUpdateConfirmation(false);
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

      {showUpdateConfirmation && preview ? (
        <div
          className={styles.reviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm grocery update"
        >
          <div className={styles.reviewDialog}>
            <div className={styles.reviewCard}>
              <button
                type="button"
                className={styles.reviewCloseButton}
                onClick={() => setShowUpdateConfirmation(false)}
                aria-label="Close update review"
              >
                x
              </button>
              <div className={styles.reviewHeader}>
                <div>
                  <h3 className={styles.reviewTitle}>Confirm grocery update</h3>
                  <p className={styles.reviewMeta}>
                    Review how your saved inventory will change before confirming.
                  </p>
                </div>
              </div>

              <div className={styles.reviewScrollArea}>
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
                  {isApplyingDishUpdate ? 'Updating...' : 'Confirm update'}
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setShowUpdateConfirmation(false)}
                  disabled={isApplyingDishUpdate}
                >
                  Back
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

