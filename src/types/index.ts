export type FoodCategory = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type FoodSource = 'home' | 'outside';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  source: FoodSource;
}

export type DietPreference =
  | 'no-preference'
  | 'vegetarian'
  | 'eggetarian'
  | 'non-vegetarian'
  | 'vegan';

export type SpicePreference = 'mild' | 'medium' | 'spicy';
export type HomeCookingStyle =
  | 'mixed-indian'
  | 'maharashtrian'
  | 'gujarati'
  | 'punjabi'
  | 'south-indian'
  | 'north-indian'
  | 'bengali'
  | 'rajasthani'
  | 'hyderabadi'
  | 'other';

export interface UserProfilePreferences {
  preferredName: string;
  homeCookingStyle: HomeCookingStyle;
  dietPreference: DietPreference;
  spicePreference: SpicePreference;
  familyMembers: number;
  whatsappNumber: string;
}

export type UserProfileSetupStatus = 'skipped' | 'completed';

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

export type MealSuggestion = string;

export type DishIngredientImportance = 'essential' | 'recommended';

export interface DishIngredientRequirement {
  name: string;
  quantity: number;
  unit: string;
  importance: DishIngredientImportance;
  inventoryQuantity?: number;
  inventoryUnit?: string;
}

export interface DishIngredientAnalysis {
  dish: string;
  ingredients: DishIngredientRequirement[];
}

export type GroceryStatus = 'available' | 'low' | 'out';
export type GroceryFrequency = 'daily' | 'weekly' | 'monthly';

export const FOOD_CATEGORIES: Record<FoodCategory, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
} as const;

export const FOOD_SOURCES: Record<FoodSource, string> = {
  outside: 'Order',
  home: 'Cook at home',
} as const;
