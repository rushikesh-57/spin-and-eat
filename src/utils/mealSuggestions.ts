import { supabase } from '../lib/supabaseClient';
import type { MealSuggestion, UserProfilePreferences } from '../types';

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
  profile: UserProfilePreferences,
  options: GenerateMealSuggestionsOptions = {}
): Promise<MealSuggestion[]> {
  const { maxSuggestions = 10, excludeSuggestions = [] } = options;
  const { data, error } = await supabase.functions.invoke('meal-suggestions', {
    body: {
      groceries,
      profile,
      maxSuggestions,
      excludeSuggestions,
    },
  });

  if (error) {
    throw new Error(
      'We could not generate meal ideas right now. Please try again in a moment.'
    );
  }

  if (!data || !Array.isArray(data.suggestions)) {
    throw new Error(
      'We could not generate meal ideas right now. Please try again in a moment.'
    );
  }

  return data.suggestions as MealSuggestion[];
}
