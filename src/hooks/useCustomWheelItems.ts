import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FoodItem } from '../types';
import { generateId } from '../utils/id';
import {
  loadCustomWheelIncludedIds,
  loadCustomWheelItems,
  saveCustomWheelIncludedIds,
  saveCustomWheelItems,
} from '../utils/storage';

const CUSTOM_WHEEL_CATEGORY = 'dinner' as const;
const CUSTOM_WHEEL_SOURCE = 'home' as const;
const storageScope = (userId: string | null) => userId ?? 'guest';

const sanitizeItems = (items: FoodItem[]) =>
  items.filter(
    (item) =>
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      item.name.trim().length > 0
  );

export function useCustomWheelItems(userId: string | null) {
  const scope = storageScope(userId);
  const [items, setItems] = useState<FoodItem[]>(() =>
    sanitizeItems(loadCustomWheelItems(userId))
  );
  const [includedIds, setIncludedIds] = useState<string[]>(() => {
    const loadedItems = sanitizeItems(loadCustomWheelItems(userId));
    const loadedIds = loadCustomWheelIncludedIds(userId);
    if (!loadedIds) {
      return loadedItems.map((item) => item.id);
    }
    const validIds = new Set(loadedItems.map((item) => item.id));
    const normalized = loadedIds.filter((id) => validIds.has(id));
    return normalized.length > 0 ? normalized : loadedItems.map((item) => item.id);
  });
  const [hydratedScope, setHydratedScope] = useState(scope);

  useEffect(() => {
    const nextItems = sanitizeItems(loadCustomWheelItems(userId));
    const nextIds = loadCustomWheelIncludedIds(userId);
    const validIds = new Set(nextItems.map((item) => item.id));

    setItems(nextItems);
    setIncludedIds(
      nextIds?.filter((id) => validIds.has(id)) ?? nextItems.map((item) => item.id)
    );
    setHydratedScope(scope);
  }, [scope, userId]);

  useEffect(() => {
    if (hydratedScope !== scope) {
      return;
    }
    saveCustomWheelItems(userId, items);
  }, [hydratedScope, items, scope, userId]);

  useEffect(() => {
    if (hydratedScope !== scope) {
      return;
    }
    const validIds = new Set(items.map((item) => item.id));
    const normalized = includedIds.filter((id) => validIds.has(id));
    const nextIds = normalized.length > 0 || items.length === 0 ? normalized : items.map((item) => item.id);
    if (nextIds.length !== includedIds.length || nextIds.some((id, index) => id !== includedIds[index])) {
      setIncludedIds(nextIds);
      return;
    }
    saveCustomWheelIncludedIds(userId, nextIds);
  }, [hydratedScope, includedIds, items, scope, userId]);

  const filteredItems = useMemo(() => {
    const includedSet = new Set(includedIds);
    return items.filter((item) => includedSet.has(item.id));
  }, [includedIds, items]);

  const addItem = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const id = generateId();
    setItems((prev) => [
      ...prev,
      {
        id,
        name: trimmed,
        category: CUSTOM_WHEEL_CATEGORY,
        source: CUSTOM_WHEEL_SOURCE,
      },
    ]);
    setIncludedIds((prev) => [...prev, id]);
  }, []);

  const toggleIncluded = useCallback((id: string) => {
    setIncludedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((currentId) => currentId !== id);
        return next.length > 0 ? next : prev;
      }

      return [...prev, id];
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setIncludedIds([]);
  }, []);

  return {
    items,
    filteredItems,
    includedIds,
    addItem,
    toggleIncluded,
    clearAll,
  };
}
