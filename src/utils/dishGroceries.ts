import { supabase } from '../lib/supabaseClient';
import type { DishIngredientAnalysis, DishIngredientRequirement } from '../types';

type GroceryInput = {
  name: string;
  remainingQuantity: number;
  unit: string;
  status: string;
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

  if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  return {
    name,
    unit,
    quantity,
    importance,
  };
};

export async function analyzeDishGroceries(
  dish: string,
  groceries: GroceryInput[]
): Promise<DishIngredientAnalysis> {
  const trimmedDish = dish.trim();
  if (!trimmedDish) {
    throw new Error('Enter a dish name to check required groceries.');
  }

  const { data, error } = await supabase.functions.invoke('dish-grocery-requirements', {
    body: {
      dish: trimmedDish,
      groceries,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to analyze dish groceries.');
  }

  const ingredients = Array.isArray(data?.ingredients)
    ? data.ingredients.map(sanitizeRequirement).filter(Boolean)
    : [];

  if (ingredients.length === 0) {
    throw new Error('No grocery requirements were returned for this dish.');
  }

  return {
    dish: typeof data?.dish === 'string' && data.dish.trim() ? data.dish.trim() : trimmedDish,
    ingredients: ingredients as DishIngredientRequirement[],
  };
}
