import type {
  FoodItem,
  SpinHistoryEntry,
  GroceryItem,
  GroceryStatus,
  GroceryFrequency,
} from '../types';

const STORAGE_KEYS = {
  FOOD_ITEMS: 'spin-and-eat:food-items',
  SPIN_HISTORY: 'spin-and-eat:spin-history',
  FEELING_LUCKY: 'spin-and-eat:feeling-lucky',
  ACTIVE_CATEGORIES: 'spin-and-eat:active-categories',
  ACTIVE_SOURCE: 'spin-and-eat:active-source',
  GROCERIES: 'spin-and-eat:groceries',
  ONBOARDING_CHOICE: 'spin-and-eat:onboarding-choice',
} as const;

export type OnboardingChoice = 'default' | 'custom' | 'done';

const onboardingKey = (userId: string) => `${STORAGE_KEYS.ONBOARDING_CHOICE}:${userId}`;

export function loadOnboardingChoice(userId: string): OnboardingChoice | null {
  try {
    const raw = localStorage.getItem(onboardingKey(userId));
    if (raw === 'default' || raw === 'custom' || raw === 'done') return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveOnboardingChoice(userId: string, choice: OnboardingChoice): void {
  try {
    localStorage.setItem(onboardingKey(userId), choice);
  } catch {
    // ignore
  }
}

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
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((item) => ({
      ...item,
      status: normalizeStatus((item as GroceryItem & { available?: boolean }).status, item),
      frequency: normalizeFrequency(
        (item as GroceryItem & { frequency?: GroceryFrequency }).frequency,
        (item as GroceryItem).name
      ),
      orderedQuantity:
        typeof (item as GroceryItem & { orderedQuantity?: number }).orderedQuantity === 'number'
          ? (item as GroceryItem).orderedQuantity
          : typeof (item as GroceryItem & { quantity?: number }).quantity === 'number'
            ? (item as GroceryItem & { quantity: number }).quantity
            : 0,
      remainingQuantity:
        typeof (item as GroceryItem & { remainingQuantity?: number }).remainingQuantity === 'number'
          ? (item as GroceryItem).remainingQuantity
          : typeof (item as GroceryItem & { quantity?: number }).quantity === 'number'
            ? (item as GroceryItem & { quantity: number }).quantity
            : 0,
    }));
  } catch {
    return fallback;
  }
}

export function loadActiveSource(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SOURCE);
  } catch {
    return null;
  }
}

export function saveActiveSource(source: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SOURCE, source);
  } catch {
    // ignore
  }
}

export function saveGroceries(items: GroceryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(items));
  } catch {
    // ignore
  }
}

const normalizeStatus = (status: GroceryStatus | undefined, item: GroceryItem & { available?: boolean }) => {
  if (status === 'available' || status === 'low' || status === 'out') return status;
  if (typeof item.available === 'boolean') return item.available ? 'available' : 'out';
  return 'available';
};

const normalizeFrequency = (frequency: GroceryFrequency | undefined, name: string) => {
  if (frequency === 'weekly' || frequency === 'monthly' || frequency === 'adhoc') return frequency;
  const normalized = name.trim().toLowerCase();
  const weeklyHints = [
    'milk',
    'curd',
    'dahi',
    'paneer',
    'cheese',
    'butter',
    'cream',
    'buttermilk',
    'egg',
    'eggs',
    'tomato',
    'onion',
    'potato',
    'banana',
    'apple',
    'mango',
    'orange',
    'pomegranate',
    'papaya',
    'grapes',
    'guava',
    'spinach',
    'palak',
    'methi',
    'garlic',
    'ginger',
    'green chilli',
    'coriander leaves',
    'curry leaves',
    'cauliflower',
    'brinjal',
    'cabbage',
    'capsicum',
    'beans',
    'carrot',
    'chicken',
    'mutton',
    'fish',
    'prawn',
  ];
  const adhocHints = [
    'chips',
    'namkeen',
    'biscuit',
    'cookies',
    'chocolate',
    'ready-to-eat',
    'dry fruits',
    'makhana',
    'peanuts',
  ];
  if (weeklyHints.some((hint) => normalized.includes(hint))) return 'weekly';
  if (adhocHints.some((hint) => normalized.includes(hint))) return 'adhoc';
  return 'monthly';
};
