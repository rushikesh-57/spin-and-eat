import { useMemo, useState } from 'react';
import type { GroceryFrequency, GroceryItem, GroceryStatus, MealSuggestion } from '../../types';
import { CATEGORY_SECTIONS, getCategoryId } from '../../utils/groceryCategories';
import { generateMealSuggestions } from '../../utils/mealSuggestions';
import styles from './Kitchen.module.css';

type Props = {
  groceries: GroceryItem[];
  onAddGrocery: (item: Omit<GroceryItem, 'id'>) => void;
  onUpdateGrocery: (id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => void;
  onRemoveGrocery: (id: string) => void;
  onClearGroceries: () => void;
  onResetGrocery: () => void;
};

const defaultNewItem = {
  name: '',
  orderedQuantity: 1,
  remainingQuantity: 1,
  unit: 'kg',
  status: 'available' as GroceryStatus,
  frequency: 'weekly' as GroceryFrequency,
  categoryId: undefined as string | undefined,
};

const STATUS_LABELS: Record<GroceryStatus, string> = {
  available: 'Available',
  low: 'Low',
  out: 'Out of stock',
};

const STATUS_ORDER: GroceryStatus[] = ['available', 'low', 'out'];
const FREQUENCY_ORDER: GroceryFrequency[] = ['weekly', 'monthly', 'adhoc'];
const FREQUENCY_LABELS: Record<GroceryFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  adhoc: 'Ad hoc',
};
const UNIT_OPTIONS = ['kg', 'g', 'ml', 'L', 'pcs', 'packs', 'jar', 'bunch', 'units'] as const;

const applyStatusToRemaining = (
  status: GroceryStatus,
  orderedQuantity: number,
  currentRemaining: number
) => {
  if (status === 'low') return Number((orderedQuantity * 0.2).toFixed(2));
  if (status === 'out') return 0;
  return currentRemaining;
};

export function Kitchen({
  groceries,
  onAddGrocery,
  onUpdateGrocery,
  onRemoveGrocery,
  onClearGroceries,
  onResetGrocery,
}: Props) {
  const [newItem, setNewItem] = useState(defaultNewItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(defaultNewItem);
  const [listMode, setListMode] = useState<'weekly' | 'monthly' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GroceryStatus | 'all'>('all');
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [isGeneratingMeals, setIsGeneratingMeals] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORY_SECTIONS.map((category) => [category.id, false]))
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const availableGroceries = useMemo(
    () =>
      groceries.filter((item) => item.status !== 'out' && item.remainingQuantity > 0),
    [groceries]
  );
  const filteredGroceries = groceries.filter((item) => {
    const matchesSearch = normalizedSearch
      ? item.name.toLowerCase().includes(normalizedSearch)
      : true;
    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const groupedGroceries = useMemo(() => {
    const groups = new Map<string, GroceryItem[]>();
    filteredGroceries.forEach((item) => {
      const categoryId = item.categoryId ?? getCategoryId(item.name);
      const next = groups.get(categoryId) ?? [];
      next.push(item);
      groups.set(categoryId, next);
    });
    return groups;
  }, [filteredGroceries]);

  const handleStartEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      orderedQuantity: item.orderedQuantity,
      remainingQuantity: item.remainingQuantity,
      unit: item.unit,
      status: item.status,
      frequency: item.frequency,
      categoryId: item.categoryId,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!editDraft.name.trim()) return;
    if (!window.confirm(`Save changes to ${editDraft.name.trim()}?`)) return;
    const nextRemaining = applyStatusToRemaining(
      editDraft.status,
      editDraft.orderedQuantity,
      editDraft.remainingQuantity
    );
    onUpdateGrocery(editingId, {
      name: editDraft.name.trim(),
      orderedQuantity: editDraft.orderedQuantity,
      remainingQuantity: nextRemaining,
      unit: editDraft.unit.trim(),
      status: editDraft.status,
      frequency: editDraft.frequency,
      categoryId: editDraft.categoryId,
    });
    setEditingId(null);
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    onAddGrocery({
      name: newItem.name.trim(),
      orderedQuantity: newItem.orderedQuantity,
      remainingQuantity: applyStatusToRemaining(
        newItem.status,
        newItem.orderedQuantity,
        newItem.remainingQuantity
      ),
      unit: newItem.unit.trim(),
      status: newItem.status,
      frequency: newItem.frequency,
      categoryId: newItem.categoryId,
    });
    setNewItem(defaultNewItem);
  };

  const toggleSection = (categoryId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const generatedList = useMemo(() => {
    if (!listMode) return [];
    return groceries.filter(
      (item) =>
        item.frequency === listMode && (item.status === 'low' || item.status === 'out')
    );
  }, [groceries, listMode]);

  const handleGenerateMeals = async () => {
    if (availableGroceries.length === 0) {
      setMealError('Add groceries marked available to generate cook-at-home options.');
      setMealSuggestions([]);
      return;
    }

    setIsGeneratingMeals(true);
    setMealError(null);
    try {
      const suggestions = await generateMealSuggestions(
        availableGroceries.map((item) => ({
          name: item.name,
          remainingQuantity: item.remainingQuantity,
          unit: item.unit,
          status: item.status,
        }))
      );
      setMealSuggestions(suggestions);
      setLastGeneratedAt(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate meal ideas.';
      setMealError(message);
      setMealSuggestions([]);
    } finally {
      setIsGeneratingMeals(false);
    }
  };

  const isFiltering = Boolean(normalizedSearch) || statusFilter !== 'all';
  const categoriesToRender = isFiltering
    ? CATEGORY_SECTIONS.filter(
        (category) => (groupedGroceries.get(category.id) ?? []).length > 0
      )
    : CATEGORY_SECTIONS;

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
          <div className={styles.listHeader}>
            <div>
              <h3 className={styles.listTitle}>Auto-generate grocery list</h3>
              <p className={styles.listMeta}>Based on items marked low or out of stock.</p>
            </div>
            <div className={styles.listActions}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setListMode('weekly')}
              >
                Weekly list
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setListMode('monthly')}
              >
                Monthly list
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => {
                  if (
                    window.confirm(
                      'Remove all grocery items from your inventory? This will clear the entire list.'
                    )
                  ) {
                    onClearGroceries();
                  }
                }}
              >
                Remove all
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => {
                  if (
                    window.confirm(
                      'Reset groceries to the default list? This will replace your current items.'
                    )
                  ) {
                    onResetGrocery();
                  }
                }}
              >
                Reset defaults
              </button>
            </div>
          </div>
          {listMode ? (
            <div className={styles.listPanel}>
              <div className={styles.listPanelHeader}>
                <span className={styles.listBadge}>
                  {listMode === 'weekly' ? 'Weekly' : 'Monthly'} restock
                </span>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => setListMode(null)}
                  aria-label={`Close ${listMode === 'weekly' ? 'weekly' : 'monthly'} restock list`}
                >
                  x
                </button>
              </div>
              {generatedList.length === 0 ? (
                <p className={styles.emptyText}>You are all set for this list.</p>
              ) : (
                <div className={styles.generatedList}>
                  {generatedList.map((item) => (
                    <div key={item.id} className={styles.generatedItem}>
                      <div>
                        <div className={styles.itemName}>{item.name}</div>
                        <div className={styles.itemMeta}>
                          {item.remainingQuantity} / {item.orderedQuantity}{' '}
                          {item.unit || 'units'}
                        </div>
                      </div>
                      <span className={`${styles.statusPill} ${styles[`status${item.status}`]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className={styles.listPanel}>
            <div className={styles.aiHeader}>
              <div>
                <h3 className={styles.listTitle}>Cook-at-home ideas</h3>
                <p className={styles.listMeta}>
                  Generated from items marked available in your kitchen.
                </p>
              </div>
              <div className={styles.listActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleGenerateMeals}
                  disabled={isGeneratingMeals}
                >
                  {isGeneratingMeals ? 'Generating...' : 'Generate ideas'}
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setMealSuggestions([]);
                    setMealError(null);
                    setLastGeneratedAt(null);
                  }}
                  disabled={mealSuggestions.length === 0 && !mealError}
                >
                  Clear
                </button>
              </div>
            </div>
            {mealError ? <p className={styles.errorText}>{mealError}</p> : null}
            {lastGeneratedAt ? (
              <p className={styles.subtleMeta}>
                Last generated {new Date(lastGeneratedAt).toLocaleTimeString()}
              </p>
            ) : null}
            {mealSuggestions.length === 0 && !mealError ? (
              <p className={styles.emptyText}>
                Tap generate to get dishes you can cook with your current groceries.
              </p>
            ) : mealSuggestions.length > 0 ? (
              <div className={styles.suggestionGrid}>
                {mealSuggestions.map((suggestion) => (
                  <div key={suggestion.name} className={styles.suggestionCard}>
                    <div className={styles.suggestionTitle}>{suggestion.name}</div>
                    <p className={styles.suggestionWhy}>{suggestion.why}</p>
                    <div className={styles.suggestionSection}>
                      <span className={styles.suggestionLabel}>Key ingredients</span>
                      <div className={styles.chipRow}>
                        {suggestion.keyIngredients.map((item) => (
                          <span key={item} className={styles.chip}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    {suggestion.missingIngredients.length > 0 ? (
                      <div className={styles.suggestionSection}>
                        <span className={styles.suggestionLabel}>Optional add-ons</span>
                        <div className={styles.chipRow}>
                          {suggestion.missingIngredients.map((item) => (
                            <span key={item} className={styles.chipAlt}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Item</span>
              <input
                className={styles.input}
                placeholder="Atta, Milk"
                value={newItem.name}
                onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ordered qty</span>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 2"
                value={Number.isNaN(newItem.orderedQuantity) ? '' : newItem.orderedQuantity}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setNewItem((prev) => ({
                    ...prev,
                    orderedQuantity: nextValue,
                    remainingQuantity:
                      prev.remainingQuantity > nextValue ? nextValue : prev.remainingQuantity,
                  }));
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Remaining qty</span>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 1.5"
                value={Number.isNaN(newItem.remainingQuantity) ? '' : newItem.remainingQuantity}
                onChange={(event) =>
                  setNewItem((prev) => ({
                    ...prev,
                    remainingQuantity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Unit</span>
              <select
                className={styles.select}
                value={newItem.unit}
                onChange={(event) => setNewItem((prev) => ({ ...prev, unit: event.target.value }))}
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Status</span>
              <select
                className={styles.select}
                value={newItem.status}
                onChange={(event) =>
                  setNewItem((prev) => ({ ...prev, status: event.target.value as GroceryStatus }))
                }
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Frequency</span>
              <select
                className={styles.select}
                value={newItem.frequency}
                onChange={(event) =>
                  setNewItem((prev) => ({
                    ...prev,
                    frequency: event.target.value as GroceryFrequency,
                  }))
                }
              >
                {FREQUENCY_ORDER.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {FREQUENCY_LABELS[frequency]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Category</span>
              <select
                className={styles.select}
                value={newItem.categoryId ?? 'auto'}
                onChange={(event) =>
                  setNewItem((prev) => ({
                    ...prev,
                    categoryId: event.target.value === 'auto' ? undefined : event.target.value,
                  }))
                }
              >
                <option value="auto">Auto</option>
                {CATEGORY_SECTIONS.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.primaryButton} onClick={handleAddItem}>
              Add
            </button>
          </div>

          <div className={styles.searchRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Search</span>
              <input
                className={styles.input}
                placeholder="Search groceries"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Status filter</span>
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as GroceryStatus | 'all')}
              >
                <option value="all">All status</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {groceries.length === 0 ? (
            <p className={styles.emptyText}>No groceries yet. Add your first item.</p>
          ) : filteredGroceries.length === 0 ? (
            <p className={styles.emptyText}>No groceries match your search.</p>
          ) : (
            <div className={styles.groupList}>
              {categoriesToRender.map((category) => {
                const items = groupedGroceries.get(category.id) ?? [];
                const isCollapsed = collapsedSections[category.id] ?? false;
                return (
                  <div key={category.id} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div>
                        <h3 className={styles.groupTitle}>{category.title}</h3>
                        <p className={styles.groupMeta}>{items.length} items</p>
                      </div>
                      <button
                        type="button"
                        className={styles.groupToggle}
                        onClick={() => toggleSection(category.id)}
                        aria-expanded={!isCollapsed}
                        aria-controls={`group-${category.id}`}
                      >
                        {isCollapsed ? 'Show' : 'Hide'}
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div id={`group-${category.id}`} className={styles.groupContent}>
                        {items.length === 0 ? (
                          <p className={styles.emptyText}>No items in this section yet.</p>
                        ) : (
                          <div className={styles.list}>
                            {items.map((item) => {
                              const isEditing = editingId === item.id;
                              return (
                                <div key={item.id} className={styles.listRow}>
                                  {isEditing ? (
                                    <>
                                      <input
                                        className={styles.input}
                                        value={editDraft.name}
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            name: event.target.value,
                                          }))
                                        }
                                      />
                                      <input
                                        className={styles.input}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="Ordered qty"
                                        value={
                                          Number.isNaN(editDraft.orderedQuantity)
                                            ? ''
                                            : editDraft.orderedQuantity
                                        }
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            orderedQuantity: Number(event.target.value),
                                            remainingQuantity:
                                              prev.remainingQuantity > Number(event.target.value)
                                                ? Number(event.target.value)
                                                : prev.remainingQuantity,
                                          }))
                                        }
                                      />
                                      <input
                                        className={styles.input}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="Remaining qty"
                                        value={
                                          Number.isNaN(editDraft.remainingQuantity)
                                            ? ''
                                            : editDraft.remainingQuantity
                                        }
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            remainingQuantity: Number(event.target.value),
                                          }))
                                        }
                                      />
                                      <select
                                        className={styles.select}
                                        value={editDraft.unit}
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            unit: event.target.value,
                                          }))
                                        }
                                      >
                                        {UNIT_OPTIONS.map((unit) => (
                                          <option key={unit} value={unit}>
                                            {unit}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className={styles.select}
                                        value={editDraft.status}
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            status: event.target.value as GroceryStatus,
                                          }))
                                        }
                                      >
                                        {STATUS_ORDER.map((status) => (
                                          <option key={status} value={status}>
                                            {STATUS_LABELS[status]}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className={styles.select}
                                        value={editDraft.frequency}
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            frequency: event.target.value as GroceryFrequency,
                                          }))
                                        }
                                      >
                                        {FREQUENCY_ORDER.map((frequency) => (
                                          <option key={frequency} value={frequency}>
                                            {FREQUENCY_LABELS[frequency]}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className={styles.select}
                                        value={editDraft.categoryId ?? 'auto'}
                                        onChange={(event) =>
                                          setEditDraft((prev) => ({
                                            ...prev,
                                            categoryId:
                                              event.target.value === 'auto'
                                                ? undefined
                                                : event.target.value,
                                          }))
                                        }
                                      >
                                        <option value="auto">Auto</option>
                                        {CATEGORY_SECTIONS.map((category) => (
                                          <option key={category.id} value={category.id}>
                                            {category.title}
                                          </option>
                                        ))}
                                      </select>
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
                                          {item.remainingQuantity} / {item.orderedQuantity}{' '}
                                          {item.unit || 'units'}
                                        </div>
                                        <div className={styles.itemMeta}>
                                          {FREQUENCY_LABELS[item.frequency]}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        className={`${styles.statusPill} ${styles[`status${item.status}`]}`}
                                        disabled
                                        aria-disabled="true"
                                      >
                                        {STATUS_LABELS[item.status]}
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
                                          onClick={() => {
                                            if (window.confirm(`Remove ${item.name}?`)) {
                                              onRemoveGrocery(item.id);
                                            }
                                          }}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
