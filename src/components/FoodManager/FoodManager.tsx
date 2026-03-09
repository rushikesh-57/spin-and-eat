import { useState, useCallback } from 'react';
import type { FoodItem, FoodCategory, FoodSource } from '../../types';
import { FOOD_CATEGORIES, FOOD_SOURCES } from '../../types';
import styles from './FoodManager.module.css';

interface FoodManagerProps {
  items: FoodItem[];
  activeSource: FoodSource;
  onSourceChange: (source: FoodSource) => void;
  onAdd: (name: string, category: FoodCategory, source: FoodSource) => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<FoodItem, 'name' | 'category' | 'source'>>
  ) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onReset: () => void;
}

const CATEGORY_IDS: FoodCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function FoodManager({
  items,
  activeSource,
  onSourceChange,
  onAdd,
  onUpdate,
  onRemove,
  onClearAll,
  onReset,
}: FoodManagerProps) {
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FoodCategory>('breakfast');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<FoodCategory>('breakfast');
  const [editSource, setEditSource] = useState<FoodSource>('home');
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const sourceItems = items.filter((item) => item.source === activeSource);
  const filteredItems = normalizedSearch
    ? sourceItems.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
    : sourceItems;

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = newName.trim();
      if (!name) return;
      onAdd(name, newCategory, activeSource);
      setNewName('');
      setNewCategory('breakfast');
    },
    [newName, newCategory, activeSource, onAdd]
  );

  const startEdit = useCallback((item: FoodItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditSource(item.source);
  }, []);

  const saveEdit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingId) return;
      const name = editName.trim();
      if (!name) return;
      if (window.confirm(`Save changes to ${name}?`)) {
        onUpdate(editingId, { name, category: editCategory, source: editSource });
      } else {
        return;
      }
      setEditingId(null);
    },
    [editingId, editName, editCategory, editSource, onUpdate]
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <section
      className={styles.wrapper}
      aria-labelledby="food-manager-heading"
      aria-label="Manage food items"
    >
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="food-manager-content"
        id="food-manager-heading"
      >
        My Foods
        <span className={styles.toggleIcon} aria-hidden="true">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      <div id="food-manager-content" className={isExpanded ? styles.content : styles.contentHidden}>
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
            aria-describedby="new-food-category"
          />
          <label id="new-food-category" className={styles.srOnly}>
            Category
          </label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as FoodCategory)}
            className={styles.select}
            aria-label="Category for new food"
          >
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {FOOD_CATEGORIES[id]}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.addBtn} disabled={!newName.trim()}>
            Add Food
          </button>
        </form>

        <div className={styles.searchRow}>
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
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search foods"
            className={styles.input}
            aria-label="Search foods"
          />
        </div>

        {filteredItems.length === 0 ? (
          <p className={styles.emptyText}>No foods match your search.</p>
        ) : (
          <ul className={styles.list} role="list">
            {filteredItems.map((item) => (
            <li key={item.id} className={styles.item}>
              {editingId === item.id ? (
                <form onSubmit={saveEdit} className={styles.editForm}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={styles.input}
                    aria-label="Edit food name"
                    autoFocus
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as FoodCategory)}
                    className={styles.select}
                    aria-label="Edit category"
                  >
                    {CATEGORY_IDS.map((id) => (
                      <option key={id} value={id}>
                        {FOOD_CATEGORIES[id]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value as FoodSource)}
                    className={styles.select}
                    aria-label="Edit plan"
                  >
                    {(Object.keys(FOOD_SOURCES) as FoodSource[]).map((source) => (
                      <option key={source} value={source}>
                        {FOOD_SOURCES[source]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={styles.saveBtn}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEdit} className={styles.cancelBtn}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemCategory}>{FOOD_CATEGORIES[item.category]}</span>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className={styles.iconBtn}
                      aria-label={`Edit ${item.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${item.name}?`)) {
                          onRemove(item.id);
                        }
                      }}
                      className={styles.iconBtnDanger}
                      aria-label={`Remove ${item.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
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
