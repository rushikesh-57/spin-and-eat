import { useState, useCallback } from 'react';
import type { FoodItem, FoodCategory, FoodSource } from '../../types';
import { FOOD_SOURCES } from '../../types';
import styles from './FoodManager.module.css';

interface FoodManagerProps {
  items: FoodItem[];
  includedFoodIds: string[];
  activeSource: FoodSource;
  onSourceChange: (source: FoodSource) => void;
  onToggleIncluded: (id: string) => void;
  onAdd: (name: string, category: FoodCategory, source: FoodSource) => void;
  onClearAll: () => void;
  onReset: () => void;
}

const DEFAULT_FOOD_CATEGORY: FoodCategory = 'dinner';

export function FoodManager({
  items,
  includedFoodIds,
  activeSource,
  onSourceChange,
  onToggleIncluded,
  onAdd,
  onClearAll,
  onReset,
}: FoodManagerProps) {
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const sourceItems = items.filter((item) => item.source === activeSource);
  const filteredItems = normalizedSearch
    ? sourceItems.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
    : sourceItems;
  const sortedItems = [...filteredItems].sort((left, right) => {
    const leftIncluded = includedFoodIds.includes(left.id);
    const rightIncluded = includedFoodIds.includes(right.id);

    if (leftIncluded !== rightIncluded) {
      return leftIncluded ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = newName.trim();
      if (!name) return;
      onAdd(name, DEFAULT_FOOD_CATEGORY, activeSource);
      setNewName('');
    },
    [newName, activeSource, onAdd]
  );

  return (
    <section className={styles.wrapper} aria-label="Manage food items">
      <div className={styles.content}>
        <div className={styles.menuTabs} role="tablist" aria-label="Food plan">
          {(Object.keys(FOOD_SOURCES) as FoodSource[]).map((source) => (
            <button
              key={source}
              type="button"
              role="tab"
              aria-selected={activeSource === source}
              className={`${styles.menuButton} ${
                activeSource === source ? styles.menuButtonActive : ''
              }`}
              onClick={() => onSourceChange(source)}
            >
              {FOOD_SOURCES[source]}
            </button>
          ))}
        </div>

        <div className={styles.searchRow}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search foods"
            className={styles.input}
            aria-label="Search foods"
          />
        </div>

        <form onSubmit={handleAdd} className={styles.addForm}>
          <label htmlFor="new-food-name" className={styles.srOnly}>
            New food name
          </label>
          <input
            id="new-food-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Pasta"
            className={styles.input}
            aria-label="New food name"
          />
          <button type="submit" className={styles.addBtn} disabled={!newName.trim()}>
            Add Food
          </button>
        </form>

        {filteredItems.length === 0 ? (
          <p className={styles.emptyText}>No foods match your search.</p>
        ) : (
          <ul className={styles.list} role="list">
            {sortedItems.map((item) => {
              const isIncluded = includedFoodIds.includes(item.id);

              return (
                <li key={item.id} className={styles.item}>
                  <button
                    type="button"
                    onClick={() => onToggleIncluded(item.id)}
                    className={`${styles.pillButton} ${
                      isIncluded ? styles.pillButtonActive : styles.pillButtonMuted
                    }`}
                    aria-pressed={isIncluded}
                    aria-label={`${item.name} ${isIncluded ? 'shown on wheel' : 'hidden from wheel'}`}
                  >
                    <span className={styles.itemName}>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.footerActions}>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Remove all foods from your list? This will clear every item.'
                )
              ) {
                onClearAll();
              }
            }}
            className={styles.clearBtn}
            aria-label="Remove all food items"
          >
            Remove all foods
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Reset foods to the default list? This will replace your current items.'
                )
              ) {
                onReset();
              }
            }}
            className={styles.resetBtn}
            aria-label="Reset to sample food list"
          >
            Reset to sample list
          </button>
        </div>
      </div>
    </section>
  );
}
