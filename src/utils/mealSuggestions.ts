import { supabase } from '../lib/supabaseClient';
import type { MealSuggestion } from '../types';

type GroceryInput = {
  name: string;
  remainingQuantity: number;
  unit: string;
  status: string;
};

export async function generateMealSuggestions(
  groceries: GroceryInput[],
  maxSuggestions = 10
): Promise<MealSuggestion[]> {
  const { data, error } = await supabase.functions.invoke('meal-suggestions', {
    body: {
      groceries,
      maxSuggestions,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate meal suggestions.');
  }

  if (!data || !Array.isArray(data.suggestions)) {
    throw new Error('Meal suggestions service returned an unexpected response.');
  }

  return data.suggestions as MealSuggestion[];
}
