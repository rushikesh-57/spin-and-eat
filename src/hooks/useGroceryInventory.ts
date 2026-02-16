import { useCallback, useEffect, useState } from 'react';
import type { GroceryItem } from '../types';
import { SAMPLE_GROCERIES } from '../data/sampleGroceries';
import { generateId } from '../utils/id';
import { loadGroceries, saveGroceries } from '../utils/storage';

export function useGroceryInventory() {
  const [items, setItems] = useState<GroceryItem[]>(() => loadGroceries(SAMPLE_GROCERIES));

  useEffect(() => {
    saveGroceries(items);
  }, [items]);

  const addItem = useCallback((item: Omit<GroceryItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: generateId() }]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    addItem,
    updateItem,
    removeItem,
  };
}
