import { supabase } from '../lib/supabaseClient';
import type { MealSuggestion } from '../types';

type GroceryInput = {
  name: string;
  remainingQuantity: number;
  unit: string;
  status: string;
};

type GenerateMealSuggestionsOptions = {
  maxSuggestions?: number;
  excludeSuggestions?: string[];
};

export async function generateMealSuggestions(
  groceries: GroceryInput[],
  options: GenerateMealSuggestionsOptions = {}
): Promise<MealSuggestion[]> {
  const { maxSuggestions = 10, excludeSuggestions = [] } = options;
  const { data, error } = await supabase.functions.invoke('meal-suggestions', {
    body: {
      groceries,
      maxSuggestions,
      excludeSuggestions,
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
