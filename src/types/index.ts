export type FoodCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

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
  orderedQuantity: number;
  remainingQuantity: number;
  unit: string;
  status: GroceryStatus;
}

export type GroceryStatus = 'available' | 'low' | 'out';

export const FOOD_CATEGORIES: Record<FoodCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
} as const;
