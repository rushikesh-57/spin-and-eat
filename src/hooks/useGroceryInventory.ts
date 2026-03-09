import { useCallback, useEffect, useState } from 'react';
import type { GroceryItem } from '../types';
import { SAMPLE_GROCERIES } from '../data/sampleGroceries';
import { generateId } from '../utils/id';
import { loadGroceries, saveGroceries } from '../utils/storage';
import { supabase } from '../lib/supabaseClient';
import { getCategoryId } from '../utils/groceryCategories';

type GroceryRow = {
  id: string;
  name: string;
  ordered_quantity: number | string;
  remaining_quantity: number | string;
  unit: string;
  status: GroceryItem['status'];
  frequency?: GroceryItem['frequency'] | null;
  category_id?: string | null;
};

const mapRowToItem = (row: GroceryRow): GroceryItem => ({
  id: String(row.id),
  name: row.name,
  orderedQuantity: Number(row.ordered_quantity) || 0,
  remainingQuantity: Number(row.remaining_quantity) || 0,
  unit: row.unit,
  status: row.status,
  frequency: row.frequency ?? 'monthly',
  categoryId: row.category_id ?? undefined,
});

const applyStatusToRemaining = (
  status: GroceryItem['status'],
  orderedQuantity: number,
  currentRemaining: number
) => {
  if (status === 'low') return Number((orderedQuantity * 0.2).toFixed(2));
  if (status === 'out') return 0;
  return currentRemaining;
};

export function useGroceryInventory(userId: string | null) {
  const [items, setItems] = useState<GroceryItem[]>(() => loadGroceries(SAMPLE_GROCERIES));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      return;
    }
    saveGroceries(items);
  }, [items, userId]);

  useEffect(() => {
    let isMounted = true;

    const loadUserGroceries = async () => {
      if (!userId) {
        setItems(loadGroceries(SAMPLE_GROCERIES));
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('groceries')
        .select(
          'id, name, ordered_quantity, remaining_quantity, unit, status, frequency, category_id'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      const hasRows = Array.isArray(data) && data.length > 0;
      const isLegacyZero =
        hasRows &&
        data.every(
          (row) =>
            Number(row.ordered_quantity) === 0 && Number(row.remaining_quantity) === 0
        );

      if (!hasRows) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      if (isLegacyZero) {
        const { error: clearError } = await supabase
          .from('groceries')
          .delete()
          .eq('user_id', userId);

        if (!isMounted) return;

        if (clearError) {
          setError(clearError.message);
          setIsLoading(false);
          return;
        }

        const payload = SAMPLE_GROCERIES.map((item) => ({
          user_id: userId,
          name: item.name,
          ordered_quantity: item.orderedQuantity,
          remaining_quantity: item.remainingQuantity,
          unit: item.unit,
          status: item.status,
          frequency: item.frequency,
          category_id: item.categoryId ?? getCategoryId(item.name),
        }));

        const { data: seeded, error: seedError } = await supabase
          .from('groceries')
          .insert(payload)
          .select(
            'id, name, ordered_quantity, remaining_quantity, unit, status, frequency, category_id'
          );

        if (!isMounted) return;

        if (seedError) {
          setError(seedError.message);
          setIsLoading(false);
          return;
        }

        const mapped = (seeded ?? []).map(mapRowToItem);
        setItems(mapped);
        setIsLoading(false);
        return;
      }

      const mapped = data.map(mapRowToItem);
      setItems(mapped);
      setIsLoading(false);

      try {
        const backfillKey = `spin-and-eat:groceries-category-backfill:${userId}`;
        const alreadyBackfilled = localStorage.getItem(backfillKey) === 'true';
        if (!alreadyBackfilled) {
          const missing = data.filter((row) => !row.category_id);
          if (missing.length > 0) {
            await Promise.all(
              missing.map((row) =>
                supabase
                  .from('groceries')
                  .update({ category_id: getCategoryId(row.name) })
                  .eq('id', row.id)
                  .eq('user_id', userId)
              )
            );
          }
          localStorage.setItem(backfillKey, 'true');
        }
      } catch {
        // ignore backfill errors
      }
    };

    void loadUserGroceries();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const addItem = useCallback(
    async (item: Omit<GroceryItem, 'id'>) => {
      if (!userId) {
        setItems((prev) => [...prev, { ...item, id: generateId() }]);
        return;
      }

      const trimmedName = item.name.trim();
      if (!trimmedName) return;

      setError(null);
      const { data, error: insertError } = await supabase
        .from('groceries')
        .insert({
          user_id: userId,
          name: trimmedName,
          ordered_quantity: item.orderedQuantity,
          remaining_quantity: applyStatusToRemaining(
            item.status,
            item.orderedQuantity,
            item.remainingQuantity
          ),
          unit: item.unit,
          status: item.status,
          frequency: item.frequency,
          category_id: item.categoryId ?? getCategoryId(trimmedName),
        })
        .select(
          'id, name, ordered_quantity, remaining_quantity, unit, status, frequency, category_id'
        )
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        setItems((prev) => [...prev, { ...mapRowToItem(data), categoryId: item.categoryId }]);
      }
    },
    [userId]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => {
      if (!userId) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const nextOrdered =
              typeof updates.orderedQuantity === 'number'
                ? updates.orderedQuantity
                : item.orderedQuantity;
            const nextStatus = updates.status ?? item.status;
            const nextRemaining =
              typeof updates.remainingQuantity === 'number'
                ? updates.remainingQuantity
                : item.remainingQuantity;
            return {
              ...item,
              ...updates,
              remainingQuantity: applyStatusToRemaining(
                nextStatus,
                nextOrdered,
                nextRemaining
              ),
            };
          })
        );
        return;
      }

      const payload: Record<string, string | number> = {};
      if (typeof updates.name === 'string') {
        const trimmed = updates.name.trim();
        if (!trimmed) return;
        payload.name = trimmed;
      }
      if (typeof updates.orderedQuantity === 'number') payload.ordered_quantity = updates.orderedQuantity;
      if (typeof updates.remainingQuantity === 'number') payload.remaining_quantity = updates.remainingQuantity;
      if (typeof updates.unit === 'string') payload.unit = updates.unit;
      if (updates.status) payload.status = updates.status;
      if (updates.frequency) payload.frequency = updates.frequency;
      if (typeof updates.categoryId === 'string' || updates.categoryId === undefined) {
        payload.category_id = updates.categoryId ?? null;
      }

      if (Object.keys(payload).length === 0) return;

      const orderedForAuto =
        typeof updates.orderedQuantity === 'number'
          ? updates.orderedQuantity
          : items.find((item) => item.id === id)?.orderedQuantity ?? 0;
      const remainingForAuto =
        typeof updates.remainingQuantity === 'number'
          ? updates.remainingQuantity
          : items.find((item) => item.id === id)?.remainingQuantity ?? 0;
      const statusForAuto =
        updates.status ?? items.find((item) => item.id === id)?.status ?? 'available';

      if (payload.status) {
        payload.remaining_quantity = applyStatusToRemaining(
          statusForAuto,
          orderedForAuto,
          remainingForAuto
        );
      }

      setError(null);
      const { data, error: updateError } = await supabase
        .from('groceries')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select(
          'id, name, ordered_quantity, remaining_quantity, unit, status, frequency, category_id'
        )
        .single();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (data) {
        const existingCategory = items.find((item) => item.id === id)?.categoryId;
        const mapped = {
          ...mapRowToItem(data),
          categoryId: updates.categoryId ?? existingCategory,
        };
        setItems((prev) => prev.map((item) => (item.id === id ? mapped : item)));
      }
      return;
    },
    [userId, items]
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!userId) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        return;
      }

      setError(null);
      const { error: deleteError } = await supabase
        .from('groceries')
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

  const clearAll = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    setError(null);
    const { error: deleteError } = await supabase
      .from('groceries')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems([]);
  }, [userId]);

  const resetToSample = useCallback(async () => {
    if (!userId) {
      setItems(SAMPLE_GROCERIES);
      return;
    }

    setError(null);
    const { error: deleteError } = await supabase
      .from('groceries')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const payload = SAMPLE_GROCERIES.map((item) => ({
      user_id: userId,
      name: item.name,
      ordered_quantity: item.orderedQuantity,
      remaining_quantity: item.remainingQuantity,
      unit: item.unit,
      status: item.status,
      frequency: item.frequency,
      category_id: item.categoryId ?? getCategoryId(item.name),
    }));

    const { data, error: insertError } = await supabase
      .from('groceries')
      .insert(payload)
      .select(
        'id, name, ordered_quantity, remaining_quantity, unit, status, frequency, category_id'
      );

    if (insertError) {
      setError(insertError.message);
      return;
    }

    const mapped = (data ?? []).map(mapRowToItem);
    setItems(mapped);
  }, [userId]);

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    clearAll,
    resetToSample,
    isLoading,
    error,
  };
}
