import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GroceryItem, IngredientMapping, IngredientRequirement } from '../types';
import { SAMPLE_GROCERIES } from '../data/sampleGroceries';
import { generateId } from '../utils/id';
import { loadGroceries, loadIngredientMapping, saveGroceries, saveIngredientMapping } from '../utils/storage';

const emptyRequirement = (): IngredientRequirement => ({
  id: generateId(),
  name: '',
  quantity: 1,
  unit: '',
});

export function useGroceryInventory() {
  const [items, setItems] = useState<GroceryItem[]>(() => loadGroceries(SAMPLE_GROCERIES));
  const [mapping, setMapping] = useState<IngredientMapping>(() => loadIngredientMapping());

  useEffect(() => {
    saveGroceries(items);
  }, [items]);

  useEffect(() => {
    saveIngredientMapping(mapping);
  }, [mapping]);

  const addItem = useCallback((item: Omit<GroceryItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: generateId() }]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addIngredient = useCallback((foodId: string) => {
    setMapping((prev) => ({
      ...prev,
      [foodId]: [...(prev[foodId] ?? []), emptyRequirement()],
    }));
  }, []);

  const updateIngredient = useCallback(
    (foodId: string, ingredientId: string, updates: Partial<Omit<IngredientRequirement, 'id'>>) => {
      setMapping((prev) => ({
        ...prev,
        [foodId]: (prev[foodId] ?? []).map((ingredient) =>
          ingredient.id === ingredientId ? { ...ingredient, ...updates } : ingredient
        ),
      }));
    },
    []
  );

  const removeIngredient = useCallback((foodId: string, ingredientId: string) => {
    setMapping((prev) => ({
      ...prev,
      [foodId]: (prev[foodId] ?? []).filter((ingredient) => ingredient.id !== ingredientId),
    }));
  }, []);

  const setIngredientsForFood = useCallback((foodId: string, ingredients: IngredientRequirement[]) => {
    setMapping((prev) => ({ ...prev, [foodId]: ingredients }));
  }, []);

  const ingredientNames = useMemo(
    () => items.map((item) => item.name).filter((name) => name.trim().length > 0),
    [items]
  );

  return {
    items,
    mapping,
    addItem,
    updateItem,
    removeItem,
    addIngredient,
    updateIngredient,
    removeIngredient,
    setIngredientsForFood,
    ingredientNames,
  };
}
