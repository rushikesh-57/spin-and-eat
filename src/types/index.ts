export type FoodCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type FoodSource = 'home' | 'outside';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  source: FoodSource;
}

export interface SpinHistoryEntry {
  foodName: string;
  category: FoodCategory;
  timestamp: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  orderedQuantity: number;
  remainingQuantity: number;
  unit: string;
  status: GroceryStatus;
  frequency: GroceryFrequency;
  categoryId?: string;
}

export interface MealSuggestion {
  name: string;
  why: string;
  keyIngredients: string[];
  missingIngredients: string[];
}

export type GroceryStatus = 'available' | 'low' | 'out';
export type GroceryFrequency = 'weekly' | 'monthly' | 'adhoc';

export const FOOD_CATEGORIES: Record<FoodCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
} as const;

export const FOOD_SOURCES: Record<FoodSource, string> = {
  home: 'Cook at home',
  outside: 'Eat outside / order',
} as const;
