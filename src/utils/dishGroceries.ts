import { supabase } from '../lib/supabaseClient';
import type {
  DishIngredientAnalysis,
  DishIngredientRequirement,
  UserProfilePreferences,
} from '../types';

type GroceryInput = {
  name: string;
  remainingQuantity: number;
  unit: string;
  status: string;
  categoryId?: string;
  categoryTitle?: string;
};

const sanitizeRequirement = (value: unknown): DishIngredientRequirement | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const unit = typeof candidate.unit === 'string' ? candidate.unit.trim() : '';
  const quantity =
    typeof candidate.quantity === 'number'
      ? candidate.quantity
      : typeof candidate.quantity === 'string'
        ? Number(candidate.quantity)
        : NaN;
  const importance =
    candidate.importance === 'recommended' ? 'recommended' : 'essential';
  const inventoryUnit =
    typeof candidate.inventoryUnit === 'string' ? candidate.inventoryUnit.trim() : '';
  const inventoryQuantity =
    typeof candidate.inventoryQuantity === 'number'
      ? candidate.inventoryQuantity
      : typeof candidate.inventoryQuantity === 'string'
        ? Number(candidate.inventoryQuantity)
        : NaN;

  if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  return {
    name,
    unit,
    quantity,
    importance,
    ...(inventoryUnit && Number.isFinite(inventoryQuantity) && inventoryQuantity > 0
      ? {
          inventoryUnit,
          inventoryQuantity,
        }
      : {}),
  };
};

export async function analyzeDishGroceries(
  dish: string,
  groceries: GroceryInput[],
  servings: number,
  profile: UserProfilePreferences,
  options: {
    selectedCategoryIds?: string[];
    selectedCategoryTitles?: string[];
  } = {}
): Promise<DishIngredientAnalysis> {
  const trimmedDish = dish.trim();
  if (!trimmedDish) {
    throw new Error('Enter a dish name to check required groceries.');
  }

  const normalizedServings = Math.max(1, Math.round(servings || 1));
  const { selectedCategoryIds = [], selectedCategoryTitles = [] } = options;

  const { data, error } = await supabase.functions.invoke('dish-grocery-requirements', {
    body: {
      dish: trimmedDish,
      groceries,
      servings: normalizedServings,
      profile,
      selectedCategoryIds,
      selectedCategoryTitles,
    },
  });

  if (error) {
    throw new Error(
      'We could not get the ingredients for this dish right now. Please try again.'
    );
  }

  const ingredients = Array.isArray(data?.ingredients)
    ? data.ingredients.map(sanitizeRequirement).filter(Boolean)
    : [];

  if (ingredients.length === 0) {
    throw new Error(
      'We could not get the ingredients for this dish right now. Please try again.'
    );
  }

  return {
    dish: typeof data?.dish === 'string' && data.dish.trim() ? data.dish.trim() : trimmedDish,
    ingredients: ingredients as DishIngredientRequirement[],
  };
}
