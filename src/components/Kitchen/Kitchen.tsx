import { useMemo, useState } from 'react';
import type { FoodItem, GroceryItem } from '../../types';
import type { IngredientRequirement } from '../../types';
import { buildCookableStatus } from '../../utils/kitchen';
import styles from './Kitchen.module.css';

type Props = {
  foods: FoodItem[];
  groceries: GroceryItem[];
  ingredientNames: string[];
  mapping: Record<string, IngredientRequirement[]>;
  onAddGrocery: (item: Omit<GroceryItem, 'id'>) => void;
  onUpdateGrocery: (id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => void;
  onRemoveGrocery: (id: string) => void;
  onAddIngredient: (foodId: string) => void;
  onUpdateIngredient: (
    foodId: string,
    ingredientId: string,
    updates: Partial<Omit<IngredientRequirement, 'id'>>
  ) => void;
  onRemoveIngredient: (foodId: string, ingredientId: string) => void;
};

const defaultNewItem = {
  name: '',
  quantity: 1,
  unit: '',
  available: true,
};

export function Kitchen({
  foods,
  groceries,
  ingredientNames,
  mapping,
  onAddGrocery,
  onUpdateGrocery,
  onRemoveGrocery,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
}: Props) {
  const [newItem, setNewItem] = useState(defaultNewItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(defaultNewItem);

  const cookableStatus = useMemo(
    () => buildCookableStatus(foods, groceries, mapping),
    [foods, groceries, mapping]
  );
  const cookableFoods = cookableStatus.filter((item) => item.cookable);
  const missingFoods = cookableStatus.filter((item) => !item.cookable);

  const handleStartEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      available: item.available,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!editDraft.name.trim()) return;
    onUpdateGrocery(editingId, {
      name: editDraft.name.trim(),
      quantity: editDraft.quantity,
      unit: editDraft.unit.trim(),
      available: editDraft.available,
    });
    setEditingId(null);
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    onAddGrocery({
      name: newItem.name.trim(),
      quantity: newItem.quantity,
      unit: newItem.unit.trim(),
      available: newItem.available,
    });
    setNewItem(defaultNewItem);
  };

  return (
    <div className={styles.kitchen}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Grocery Inventory</h2>
            <p className={styles.sectionSubtitle}>Track what is in your kitchen.</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.formRow}>
            <input
              className={styles.input}
              placeholder="Ingredient name"
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.1"
              placeholder="Qty"
              value={Number.isNaN(newItem.quantity) ? '' : newItem.quantity}
              onChange={(event) =>
                setNewItem((prev) => ({ ...prev, quantity: Number(event.target.value) }))
              }
            />
            <input
              className={styles.input}
              placeholder="Unit"
              value={newItem.unit}
              onChange={(event) => setNewItem((prev) => ({ ...prev, unit: event.target.value }))}
            />
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={newItem.available}
                onChange={(event) =>
                  setNewItem((prev) => ({ ...prev, available: event.target.checked }))
                }
              />
              Available
            </label>
            <button type="button" className={styles.primaryButton} onClick={handleAddItem}>
              Add
            </button>
          </div>

          {groceries.length === 0 ? (
            <p className={styles.emptyText}>No groceries yet. Add your first ingredient.</p>
          ) : (
            <div className={styles.list}>
              {groceries.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <div key={item.id} className={styles.listRow}>
                    {isEditing ? (
                      <>
                        <input
                          className={styles.input}
                          value={editDraft.name}
                          onChange={(event) =>
                            setEditDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.1"
                          value={Number.isNaN(editDraft.quantity) ? '' : editDraft.quantity}
                          onChange={(event) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              quantity: Number(event.target.value),
                            }))
                          }
                        />
                        <input
                          className={styles.input}
                          value={editDraft.unit}
                          onChange={(event) =>
                            setEditDraft((prev) => ({ ...prev, unit: event.target.value }))
                          }
                        />
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={editDraft.available}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                available: event.target.checked,
                              }))
                            }
                          />
                          Available
                        </label>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleSaveEdit}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.ghostButton}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{item.name}</div>
                          <div className={styles.itemMeta}>
                            {item.quantity} {item.unit || 'units'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={item.available ? styles.statusOn : styles.statusOff}
                          onClick={() => onUpdateGrocery(item.id, { available: !item.available })}
                        >
                          {item.available ? 'Available' : 'Unavailable'}
                        </button>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.ghostButton}
                            onClick={() => handleStartEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => onRemoveGrocery(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Ingredient Mapping</h2>
            <p className={styles.sectionSubtitle}>Map foods to what you need to cook them.</p>
          </div>
        </div>

        {foods.length === 0 ? (
          <p className={styles.emptyText}>Add foods on the Spin tab to start mapping.</p>
        ) : (
          <div className={styles.mappingList}>
            {foods.map((food) => {
              const ingredients = mapping[food.id] ?? [];
              return (
                <div key={food.id} className={styles.mappingCard}>
                  <div className={styles.mappingHeader}>
                    <h3 className={styles.mappingTitle}>{food.name}</h3>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => onAddIngredient(food.id)}
                    >
                      Add ingredient
                    </button>
                  </div>
                  {ingredients.length === 0 ? (
                    <p className={styles.emptyText}>No ingredients mapped yet.</p>
                  ) : (
                    <div className={styles.ingredientRows}>
                      {ingredients.map((ingredient) => (
                        <div key={ingredient.id} className={styles.ingredientRow}>
                          <input
                            className={styles.input}
                            list="ingredient-options"
                            placeholder="Ingredient"
                            value={ingredient.name}
                            onChange={(event) =>
                              onUpdateIngredient(food.id, ingredient.id, {
                                name: event.target.value,
                              })
                            }
                          />
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Qty"
                            value={Number.isNaN(ingredient.quantity) ? '' : ingredient.quantity}
                            onChange={(event) =>
                              onUpdateIngredient(food.id, ingredient.id, {
                                quantity: Number(event.target.value),
                              })
                            }
                          />
                          <input
                            className={styles.input}
                            placeholder="Unit"
                            value={ingredient.unit}
                            onChange={(event) =>
                              onUpdateIngredient(food.id, ingredient.id, {
                                unit: event.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            className={styles.ghostButton}
                            onClick={() => onRemoveIngredient(food.id, ingredient.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <datalist id="ingredient-options">
          {ingredientNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Cookable Foods</h2>
            <p className={styles.sectionSubtitle}>
              Based on your inventory and ingredient mapping.
            </p>
          </div>
        </div>

        <div className={styles.card}>
          {cookableFoods.length === 0 ? (
            <p className={styles.emptyText}>No cookable foods yet.</p>
          ) : (
            <div className={styles.cookableList}>
              {cookableFoods.map((item) => (
                <div key={item.foodId} className={styles.cookableRow}>
                  <span className={styles.cookableName}>{item.foodName}</span>
                  <span className={styles.statusOn}>Ready</span>
                </div>
              ))}
            </div>
          )}
          {missingFoods.length > 0 ? (
            <div className={styles.missingList}>
              <h3 className={styles.missingTitle}>Needs ingredients</h3>
              {missingFoods.map((item) => (
                <div key={item.foodId} className={styles.missingRow}>
                  <div className={styles.cookableName}>{item.foodName}</div>
                  <ul className={styles.missingReasons}>
                    {item.missing.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
