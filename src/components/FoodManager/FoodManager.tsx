import { useState, useCallback } from 'react';
import type { FoodItem, FoodCategory } from '../../types';
import { FOOD_CATEGORIES } from '../../types';
import styles from './FoodManager.module.css';

interface FoodManagerProps {
  items: FoodItem[];
  onAdd: (name: string, category: FoodCategory) => void;
  onUpdate: (id: string, updates: Partial<Pick<FoodItem, 'name' | 'category'>>) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}

const CATEGORY_IDS: FoodCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function FoodManager({ items, onAdd, onUpdate, onRemove, onReset }: FoodManagerProps) {
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FoodCategory>('breakfast');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<FoodCategory>('breakfast');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = newName.trim();
      if (!name) return;
      onAdd(name, newCategory);
      setNewName('');
      setNewCategory('breakfast');
    },
    [newName, newCategory, onAdd]
  );

  const startEdit = useCallback((item: FoodItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
  }, []);

  const saveEdit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingId) return;
      const name = editName.trim();
      if (!name) return;
      onUpdate(editingId, { name, category: editCategory });
      setEditingId(null);
    },
    [editingId, editName, editCategory, onUpdate]
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

        <ul className={styles.list} role="list">
          {items.map((item) => (
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
                      onClick={() => onRemove(item.id)}
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

        <button
          type="button"
          onClick={onReset}
          className={styles.resetBtn}
          aria-label="Reset to sample food list"
        >
          Reset to sample list
        </button>
      </div>
    </section>
  );
}
