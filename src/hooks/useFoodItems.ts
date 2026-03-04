import { useState, useEffect, useCallback } from 'react';
import type { FoodItem, FoodCategory } from '../types';
import { FOOD_CATEGORIES } from '../types';
import { SAMPLE_FOODS } from '../data/sampleFoods';
import { loadFoodItems, saveFoodItems } from '../utils/storage';
import { loadActiveCategories, saveActiveCategories } from '../utils/storage';
import { generateId } from '../utils/id';
import { supabase } from '../lib/supabaseClient';

const CATEGORY_IDS = Object.keys(FOOD_CATEGORIES) as FoodCategory[];

const sanitizeCategories = (categories: string[] | null): FoodCategory[] | null => {
  if (!categories) return null;
  const filtered = categories.filter((category): category is FoodCategory =>
    CATEGORY_IDS.includes(category as FoodCategory)
  );
  return filtered.length > 0 ? filtered : null;
};

const sanitizeItems = (items: FoodItem[]): FoodItem[] =>
  items.filter((item) => CATEGORY_IDS.includes(item.category));

export function useFoodItems(userId: string | null) {
  const [items, setItems] = useState<FoodItem[]>(() =>
    sanitizeItems(loadFoodItems(SAMPLE_FOODS))
  );
  const [activeCategories, setActiveCategoriesState] = useState<FoodCategory[] | null>(() =>
    sanitizeCategories(loadActiveCategories())
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      return;
    }
    saveFoodItems(items);
  }, [items, userId]);

  useEffect(() => {
    let isMounted = true;

    const loadUserFoods = async () => {
      if (!userId) {
        setItems(sanitizeItems(loadFoodItems(SAMPLE_FOODS)));
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('foods')
        .select('id, food_name, category')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      const mapped =
        data
          ?.map((row) => ({
            id: String(row.id),
            name: row.food_name as string,
            category: row.category as FoodCategory,
          }))
          .filter((item) => CATEGORY_IDS.includes(item.category)) ?? [];

      setItems(mapped);
      setIsLoading(false);
    };

    void loadUserFoods();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const activeCategoriesList = activeCategories ?? CATEGORY_IDS;
  const filteredItems = items.filter((item) => activeCategoriesList.includes(item.category));

  const setActiveCategories = useCallback((categories: FoodCategory[]) => {
    setActiveCategoriesState(categories);
    saveActiveCategories(categories);
  }, []);

  const addItem = useCallback(
    async (name: string, category: FoodCategory) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      if (!userId) {
        setItems((prev) => [...prev, { id: generateId(), name: trimmed, category }]);
        return;
      }

      setError(null);
      const { data, error: insertError } = await supabase
        .from('foods')
        .insert({ user_id: userId, food_name: trimmed, category })
        .select('id, food_name, category')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        setItems((prev) => [
          ...prev,
          { id: String(data.id), name: data.food_name as string, category: data.category as FoodCategory },
        ]);
      }
    },
    [userId]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Pick<FoodItem, 'name' | 'category'>>) => {
      if (!userId) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
        return;
      }

      const payload: { food_name?: string; category?: FoodCategory } = {};
      if (typeof updates.name === 'string') {
        const trimmed = updates.name.trim();
        if (!trimmed) return;
        payload.food_name = trimmed;
      }
      if (updates.category) {
        payload.category = updates.category;
      }
      if (Object.keys(payload).length === 0) return;

      setError(null);
      const { data, error: updateError } = await supabase
        .from('foods')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, food_name, category')
        .single();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (data) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { id: String(data.id), name: data.food_name as string, category: data.category as FoodCategory }
              : item
          )
        );
      }
    },
    [userId]
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!userId) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        return;
      }

      setError(null);
      const { error: deleteError } = await supabase
        .from('foods')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [userId]
  );

  const resetToSample = useCallback(async () => {
    if (!userId) {
      setItems(SAMPLE_FOODS);
      return;
    }

    setError(null);
    const { error: deleteError } = await supabase.from('foods').delete().eq('user_id', userId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const payload = SAMPLE_FOODS.map((item) => ({
      user_id: userId,
      food_name: item.name,
      category: item.category,
    }));

    const { data, error: insertError } = await supabase
      .from('foods')
      .insert(payload)
      .select('id, food_name, category');

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const mapped =
      data
        ?.map((row) => ({
          id: String(row.id),
          name: row.food_name as string,
          category: row.category as FoodCategory,
        }))
        .filter((item) => CATEGORY_IDS.includes(item.category)) ?? [];

    setItems(mapped);
  }, [userId]);

  return {
    items,
    filteredItems,
    activeCategories: activeCategoriesList,
    setActiveCategories,
    addItem,
    updateItem,
    removeItem,
    resetToSample,
    isLoading,
    error,
  };
}
