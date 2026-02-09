import type { FoodItem, SpinHistoryEntry, GroceryItem, IngredientMapping } from '../types';

const STORAGE_KEYS = {
  FOOD_ITEMS: 'spin-and-eat:food-items',
  SPIN_HISTORY: 'spin-and-eat:spin-history',
  FEELING_LUCKY: 'spin-and-eat:feeling-lucky',
  ACTIVE_CATEGORIES: 'spin-and-eat:active-categories',
  GROCERIES: 'spin-and-eat:groceries',
  INGREDIENT_MAPPING: 'spin-and-eat:ingredient-mapping',
} as const;

export function loadFoodItems(fallback: FoodItem[]): FoodItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOOD_ITEMS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as FoodItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveFoodItems(items: FoodItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FOOD_ITEMS, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function loadSpinHistory(): SpinHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SPIN_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpinHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function saveSpinHistory(history: SpinHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SPIN_HISTORY, JSON.stringify(history.slice(0, 5)));
  } catch {
    // ignore
  }
}

export function loadFeelingLucky(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FEELING_LUCKY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export function saveFeelingLucky(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FEELING_LUCKY, String(enabled));
  } catch {
    // ignore
  }
}

export function loadActiveCategories(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_CATEGORIES);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveActiveCategories(categories: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CATEGORIES, JSON.stringify(categories));
  } catch {
    // ignore
  }
}

export function loadGroceries(fallback: GroceryItem[]): GroceryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROCERIES);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as GroceryItem[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveGroceries(items: GroceryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function loadIngredientMapping(): IngredientMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INGREDIENT_MAPPING);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as IngredientMapping;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveIngredientMapping(mapping: IngredientMapping): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INGREDIENT_MAPPING, JSON.stringify(mapping));
  } catch {
    // ignore
  }
}
