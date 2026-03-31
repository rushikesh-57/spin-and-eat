import type {
  FoodItem,
  HomeCookingStyle,
  SpinHistoryEntry,
  GroceryItem,
  GroceryStatus,
  GroceryFrequency,
  UserProfilePreferences,
  UserProfileSetupStatus,
} from '../types';

const STORAGE_KEYS = {
  FOOD_ITEMS: 'spin-and-eat:food-items',
  CUSTOM_WHEEL_ITEMS: 'spin-and-eat:custom-wheel-items',
  CUSTOM_WHEEL_INCLUDED_IDS: 'spin-and-eat:custom-wheel-included-ids',
  SPIN_HISTORY: 'spin-and-eat:spin-history',
  FEELING_LUCKY: 'spin-and-eat:feeling-lucky',
  ACTIVE_CATEGORIES: 'spin-and-eat:active-categories',
  ACTIVE_SOURCE: 'spin-and-eat:active-source',
  INCLUDED_FOOD_IDS: 'spin-and-eat:included-food-ids',
  GROCERIES: 'spin-and-eat:groceries',
  ONBOARDING_CHOICE: 'spin-and-eat:onboarding-choice',
  WHEEL_OVERRIDE: 'spin-and-eat:wheel-override',
  USER_PROFILE: 'spin-and-eat:user-profile',
  USER_PROFILE_STATUS: 'spin-and-eat:user-profile-status',
} as const;

export type OnboardingChoice = 'default' | 'custom' | 'done';

const onboardingKey = (userId: string) => `${STORAGE_KEYS.ONBOARDING_CHOICE}:${userId}`;
const wheelOverrideKey = (userId: string) => `${STORAGE_KEYS.WHEEL_OVERRIDE}:${userId}`;
const includedFoodIdsKey = (userId: string | null) =>
  `${STORAGE_KEYS.INCLUDED_FOOD_IDS}:${userId ?? 'guest'}`;
const activeSourceKey = (userId: string | null) =>
  `${STORAGE_KEYS.ACTIVE_SOURCE}:${userId ?? 'guest'}`;
const customWheelItemsKey = (userId: string | null) =>
  `${STORAGE_KEYS.CUSTOM_WHEEL_ITEMS}:${userId ?? 'guest'}`;
const customWheelIncludedIdsKey = (userId: string | null) =>
  `${STORAGE_KEYS.CUSTOM_WHEEL_INCLUDED_IDS}:${userId ?? 'guest'}`;
const userProfileKey = (userId: string) => `${STORAGE_KEYS.USER_PROFILE}:${userId}`;
const userProfileStatusKey = (userId: string) => `${STORAGE_KEYS.USER_PROFILE_STATUS}:${userId}`;

export const DEFAULT_USER_PROFILE: UserProfilePreferences = {
  preferredName: '',
  homeCookingStyle: 'mixed-indian',
  dietPreference: 'no-preference',
  spicePreference: 'medium',
  familyMembers: 2,
  whatsappNumber: '',
};

const isKnownHomeCookingStyle = (value: unknown): value is HomeCookingStyle =>
  value === 'mixed-indian' ||
  value === 'maharashtrian' ||
  value === 'gujarati' ||
  value === 'punjabi' ||
  value === 'south-indian' ||
  value === 'north-indian' ||
  value === 'bengali' ||
  value === 'rajasthani' ||
  value === 'hyderabadi' ||
  value === 'other';

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

export function loadWheelOverride(userId: string): string[] | null {
  try {
    const raw = localStorage.getItem(wheelOverrideKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWheelOverride(userId: string, suggestions: string[] | null): void {
  try {
    if (!suggestions || suggestions.length === 0) {
      localStorage.removeItem(wheelOverrideKey(userId));
      return;
    }
    localStorage.setItem(wheelOverrideKey(userId), JSON.stringify(suggestions));
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

export function loadCustomWheelItems(userId: string | null): FoodItem[] {
  try {
    const raw = localStorage.getItem(customWheelItemsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FoodItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomWheelItems(userId: string | null, items: FoodItem[]): void {
  try {
    localStorage.setItem(customWheelItemsKey(userId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function loadCustomWheelIncludedIds(userId: string | null): string[] | null {
  try {
    const raw = localStorage.getItem(customWheelIncludedIdsKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCustomWheelIncludedIds(userId: string | null, ids: string[]): void {
  try {
    localStorage.setItem(customWheelIncludedIdsKey(userId), JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function loadUserProfile(userId: string): UserProfilePreferences {
  try {
    const raw = localStorage.getItem(userProfileKey(userId));
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfilePreferences>;
    return {
      preferredName:
        typeof parsed.preferredName === 'string' ? parsed.preferredName : DEFAULT_USER_PROFILE.preferredName,
      homeCookingStyle: isKnownHomeCookingStyle(parsed.homeCookingStyle)
        ? parsed.homeCookingStyle
        : DEFAULT_USER_PROFILE.homeCookingStyle,
      dietPreference:
        parsed.dietPreference === 'vegetarian' ||
        parsed.dietPreference === 'eggetarian' ||
        parsed.dietPreference === 'non-vegetarian' ||
        parsed.dietPreference === 'vegan' ||
        parsed.dietPreference === 'no-preference'
          ? parsed.dietPreference
          : DEFAULT_USER_PROFILE.dietPreference,
      spicePreference:
        parsed.spicePreference === 'mild' ||
        parsed.spicePreference === 'medium' ||
        parsed.spicePreference === 'spicy'
          ? parsed.spicePreference
          : DEFAULT_USER_PROFILE.spicePreference,
      familyMembers:
        typeof parsed.familyMembers === 'number' &&
        Number.isFinite(parsed.familyMembers) &&
        parsed.familyMembers > 0
          ? Math.max(1, Math.round(parsed.familyMembers))
          : DEFAULT_USER_PROFILE.familyMembers,
      whatsappNumber:
        typeof parsed.whatsappNumber === 'string'
          ? parsed.whatsappNumber
          : DEFAULT_USER_PROFILE.whatsappNumber,
    };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(userId: string, profile: UserProfilePreferences): void {
  try {
    localStorage.setItem(userProfileKey(userId), JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function loadUserProfileStatus(userId: string): UserProfileSetupStatus | null {
  try {
    const raw = localStorage.getItem(userProfileStatusKey(userId));
    if (raw === 'skipped' || raw === 'completed') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveUserProfileStatus(userId: string, status: UserProfileSetupStatus): void {
  try {
    localStorage.setItem(userProfileStatusKey(userId), status);
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

export function loadIncludedFoodIds(userId: string | null): string[] | null {
  try {
    const raw = localStorage.getItem(includedFoodIdsKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIncludedFoodIds(userId: string | null, ids: string[]): void {
  try {
    localStorage.setItem(includedFoodIdsKey(userId), JSON.stringify(ids));
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

export function loadActiveSource(userId: string | null): string | null {
  try {
    return localStorage.getItem(activeSourceKey(userId));
  } catch {
    return null;
  }
}

export function saveActiveSource(userId: string | null, source: string): void {
  try {
    localStorage.setItem(activeSourceKey(userId), source);
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
  if (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') return frequency;
  const normalized = name.trim().toLowerCase();
  const dailyHints = [
    'milk',
    'curd',
    'dahi',
    'buttermilk',
    'paneer',
    'butter',
    'cheese',
    'egg',
    'eggs',
    'chicken',
  ];
  const weeklyHints = [
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
  if (dailyHints.some((hint) => normalized.includes(hint))) return 'daily';
  if (weeklyHints.some((hint) => normalized.includes(hint))) return 'weekly';
  return 'monthly';
};
