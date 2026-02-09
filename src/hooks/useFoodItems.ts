import { useState, useEffect, useCallback } from 'react';
import type { FoodItem, FoodCategory } from '../types';
import { SAMPLE_FOODS } from '../data/sampleFoods';
import { loadFoodItems, saveFoodItems } from '../utils/storage';
import { loadActiveCategories, saveActiveCategories } from '../utils/storage';
import { generateId } from '../utils/id';

export function useFoodItems() {
  const [items, setItems] = useState<FoodItem[]>(() => loadFoodItems(SAMPLE_FOODS));
  const [activeCategories, setActiveCategoriesState] = useState<string[] | null>(
    () => loadActiveCategories()
  );

  useEffect(() => {
    saveFoodItems(items);
  }, [items]);

  const activeCategoriesList = activeCategories ?? ['veg', 'non-veg', 'healthy', 'cheat-meal'];
  const filteredItems = items.filter((item) => activeCategoriesList.includes(item.category));

  const setActiveCategories = useCallback((categories: string[]) => {
    setActiveCategoriesState(categories);
    saveActiveCategories(categories);
  }, []);

  const addItem = useCallback((name: string, category: FoodCategory) => {
    setItems((prev) => [...prev, { id: generateId(), name: name.trim(), category }]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Pick<FoodItem, 'name' | 'category'>>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const resetToSample = useCallback(() => {
    setItems(SAMPLE_FOODS);
  }, []);

  return {
    items,
    filteredItems,
    activeCategories: activeCategoriesList,
    setActiveCategories,
    addItem,
    updateItem,
    removeItem,
    resetToSample,
  };
}
