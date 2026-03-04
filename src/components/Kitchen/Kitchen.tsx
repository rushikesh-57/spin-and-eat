import { useMemo, useState } from 'react';
import type { GroceryItem, GroceryStatus } from '../../types';
import styles from './Kitchen.module.css';

type Props = {
  groceries: GroceryItem[];
  onAddGrocery: (item: Omit<GroceryItem, 'id'>) => void;
  onUpdateGrocery: (id: string, updates: Partial<Omit<GroceryItem, 'id'>>) => void;
  onRemoveGrocery: (id: string) => void;
};

const defaultNewItem = {
  name: '',
  orderedQuantity: 1,
  remainingQuantity: 1,
  unit: 'kg',
  status: 'available' as GroceryStatus,
};

const STATUS_LABELS: Record<GroceryStatus, string> = {
  available: 'Available',
  low: 'Low',
  out: 'Out of stock',
};

const STATUS_ORDER: GroceryStatus[] = ['available', 'low', 'out'];
const UNIT_OPTIONS = ['kg', 'g', 'ml', 'L', 'pcs', 'packs', 'jar', 'bunch', 'units'] as const;

const CATEGORY_DEFINITIONS = [
  {
    id: 'fresh',
    title: 'Fruits & Vegetables',
    keywords: [
      'tomato',
      'onion',
      'potato',
      'banana',
      'apple',
      'mango',
      'orange',
      'pomegranate',
      'papaya',
      'grapes',
      'guava',
      'spinach',
      'palak',
      'methi',
      'garlic',
      'ginger',
      'green chilli',
      'coriander leaves',
      'curry leaves',
      'cauliflower',
      'brinjal',
      'cabbage',
      'capsicum',
      'beans',
      'carrot',
    ],
  },
  {
    id: 'atta',
    title: 'Atta, Rice & Dal',
    keywords: [
      'atta',
      'flour',
      'maida',
      'suji',
      'rava',
      'besan',
      'multigrain',
      'rice',
      'basmati',
      'sona',
      'kolam',
      'brown rice',
      'idli rice',
      'broken rice',
      'jowar',
      'bajra',
      'ragi',
      'millet',
      'dal',
      'lentil',
      'toor',
      'urad',
      'moong',
      'masoor',
      'chana',
      'rajma',
      'kabuli',
      'kala',
      'lobia',
      'matki',
    ],
  },
  {
    id: 'dairy',
    title: 'Dairy & Breakfast',
    keywords: [
      'milk',
      'curd',
      'dahi',
      'paneer',
      'cheese',
      'butter',
      'cream',
      'buttermilk',
      'bread',
      'egg',
      'eggs',
    ],
  },
  {
    id: 'masala',
    title: 'Masala, Oil & Pantry',
    keywords: [
      'masala',
      'spice',
      'whole spices',
      'mirchi',
      'chilli',
      'turmeric',
      'haldi',
      'cumin',
      'jeera',
      'coriander powder',
      'bay leaf',
      'cinnamon',
      'clove',
      'cardamom',
      'pepper',
      'fennel',
      'fenugreek',
      'hing',
      'mustard seeds',
      'oil',
      'ghee',
      'salt',
      'sugar',
      'jaggery',
    ],
  },
  {
    id: 'snacks',
    title: 'Snacks & Beverages',
    keywords: [
      'namkeen',
      'chips',
      'biscuit',
      'cookie',
      'noodles',
      'maggi',
      'pasta',
      'vermicelli',
      'pickles',
      'papad',
      'sauce',
      'ready-to-eat',
      'oats',
      'cornflakes',
      'dry fruits',
      'peanuts',
      'makhana',
      'chocolate',
      'tea',
      'coffee',
      'juice',
      'soda',
    ],
  },
  {
    id: 'meat',
    title: 'Meat, Fish & Eggs',
    keywords: ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'eggs'],
  },
  {
    id: 'home',
    title: 'Household Essentials',
    keywords: ['detergent', 'soap', 'shampoo', 'cleaner', 'tissue', 'foil'],
  },
] as const;

const OTHER_CATEGORY = {
  id: 'other',
  title: 'Other Essentials',
  keywords: [] as string[],
};

const CATEGORY_SECTIONS = [...CATEGORY_DEFINITIONS, OTHER_CATEGORY];

const normalize = (value: string) => value.trim().toLowerCase();

const getCategoryId = (name: string) => {
  const normalized = normalize(name);
  const match = CATEGORY_DEFINITIONS.find((category) =>
    category.keywords.some((keyword) => normalized.includes(keyword))
  );
  return match?.id ?? OTHER_CATEGORY.id;
};

const getNextStatus = (status: GroceryStatus) => {
  const index = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
};

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
}: Props) {
  const [newItem, setNewItem] = useState(defaultNewItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(defaultNewItem);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORY_SECTIONS.map((category) => [category.id, false]))
  );
  const groupedGroceries = useMemo(() => {
    const groups = new Map<string, GroceryItem[]>();
    groceries.forEach((item) => {
      const categoryId = getCategoryId(item.name);
      const next = groups.get(categoryId) ?? [];
      next.push(item);
      groups.set(categoryId, next);
    });
    return groups;
  }, [groceries]);

  const handleStartEdit = (item: GroceryItem) => {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      orderedQuantity: item.orderedQuantity,
      remainingQuantity: item.remainingQuantity,
      unit: item.unit,
      status: item.status,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!editDraft.name.trim()) return;
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
    });
    setNewItem(defaultNewItem);
  };

  const toggleSection = (categoryId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
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
              placeholder="Item name (Atta, Milk)"
              value={newItem.name}
              onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.1"
              placeholder="Ordered"
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
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.1"
              placeholder="Remaining"
              value={Number.isNaN(newItem.remainingQuantity) ? '' : newItem.remainingQuantity}
              onChange={(event) =>
                setNewItem((prev) => ({
                  ...prev,
                  remainingQuantity: Number(event.target.value),
                }))
              }
            />
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
            <button type="button" className={styles.primaryButton} onClick={handleAddItem}>
              Add
            </button>
          </div>

          {groceries.length === 0 ? (
            <p className={styles.emptyText}>No groceries yet. Add your first item.</p>
          ) : (
            <div className={styles.groupList}>
              {CATEGORY_SECTIONS.map((category) => {
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
                                      </div>
                                      <button
                                        type="button"
                                        className={`${styles.statusPill} ${styles[`status${item.status}`]}`}
                                        onClick={() => {
                                          const nextStatus = getNextStatus(item.status);
                                          onUpdateGrocery(item.id, {
                                            status: nextStatus,
                                            remainingQuantity: applyStatusToRemaining(
                                              nextStatus,
                                              item.orderedQuantity,
                                              item.remainingQuantity
                                            ),
                                          });
                                        }}
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
