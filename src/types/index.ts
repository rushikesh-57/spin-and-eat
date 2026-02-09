export type FoodCategory = 'veg' | 'non-veg' | 'healthy' | 'cheat-meal';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
}

export interface SpinHistoryEntry {
  foodName: string;
  category: FoodCategory;
  timestamp: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  available: boolean;
}

export interface IngredientRequirement {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export type IngredientMapping = Record<string, IngredientRequirement[]>;

export const FOOD_CATEGORIES: Record<FoodCategory, string> = {
  veg: 'Veg',
  'non-veg': 'Non-Veg',
  healthy: 'Healthy',
  'cheat-meal': 'Cheat Meal',
} as const;
