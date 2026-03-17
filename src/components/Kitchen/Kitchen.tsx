import { useMemo, useState } from 'react';
import type { GroceryFrequency, GroceryItem, GroceryStatus } from '../../types';
import { CATEGORY_SECTIONS, getCategoryId } from '../../utils/groceryCategories';
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

const deriveStatusFromQuantities = (
  orderedQuantity: number,
  remainingQuantity: number
): GroceryStatus => {
  if (remainingQuantity <= 0 || orderedQuantity <= 0) return 'out';
  if (remainingQuantity <= orderedQuantity * 0.2) return 'low';
  return 'available';
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
  onClearGroceries,
  onResetGrocery,
}: Props) {
  const [newItem, setNewItem] = useState(defaultNewItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(defaultNewItem);
  const [activePanel, setActivePanel] = useState<'weekly' | 'monthly' | 'reset' | 'clear' | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<GroceryStatus | 'all'>('all');
  const [openSections, setOpenSections] = useState({
    shopping: true,
    manage: false,
    inventory: true,
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORY_SECTIONS.map((category) => [category.id, false]))
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
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

  const generatedList = useMemo(() => {
    if (activePanel !== 'weekly' && activePanel !== 'monthly') return [];
    return groceries.filter(
      (item) =>
        item.frequency === activePanel && (item.status === 'low' || item.status === 'out')
    );
  }, [groceries, activePanel]);

  const isFiltering = Boolean(normalizedSearch) || statusFilter !== 'all';
  const categoriesToRender = isFiltering
    ? CATEGORY_SECTIONS.filter(
        (category) => (groupedGroceries.get(category.id) ?? []).length > 0
      )
    : CATEGORY_SECTIONS;

  const toggleAccordion = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleSection = (categoryId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

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
    const nextStatus = deriveStatusFromQuantities(
      newItem.orderedQuantity,
      newItem.remainingQuantity
    );
    onAddGrocery({
      name: newItem.name.trim(),
      orderedQuantity: newItem.orderedQuantity,
      remainingQuantity: applyStatusToRemaining(
        nextStatus,
        newItem.orderedQuantity,
        newItem.remainingQuantity
      ),
      unit: newItem.unit.trim(),
      status: nextStatus,
      frequency: newItem.frequency,
      categoryId: newItem.categoryId,
    });
    setNewItem(defaultNewItem);
  };

  const closeActionPanel = () => {
    setActivePanel(null);
  };

  return (
    <div className={styles.kitchen}>
      <section className={styles.section}>
        <section className={styles.panelCard}>
          <button
            type="button"
            className={styles.panelToggle}
            onClick={() => toggleAccordion('shopping')}
            aria-expanded={openSections.shopping}
            aria-controls="kitchen-shopping-content"
          >
            <span className={styles.panelToggleText}>
              <span className={styles.panelSectionTitle}>Shopping lists</span>
              <span className={styles.panelSectionSubtitle}>
                Open weekly or monthly restock suggestions.
              </span>
            </span>
            <span className={styles.panelToggleIcon} aria-hidden="true">
              {openSections.shopping ? 'Hide' : 'Show'}
            </span>
          </button>
          {openSections.shopping ? (
            <div id="kitchen-shopping-content" className={styles.panelContent}>
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setActivePanel('weekly')}
                >
                  Weekly list
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setActivePanel('monthly')}
                >
                  Monthly list
                </button>
              </div>

              {activePanel === 'weekly' || activePanel === 'monthly' ? (
                <div className={styles.resultCard}>
                  <div className={styles.listPanelHeader}>
                    <div>
                      <h3 className={styles.listTitle}>
                        {activePanel === 'weekly' ? 'Weekly restock list' : 'Monthly restock list'}
                      </h3>
                      <p className={styles.listMeta}>Items currently marked low or out of stock.</p>
                    </div>
                    <button
                      type="button"
                      className={styles.closeButton}
                      onClick={closeActionPanel}
                      aria-label={`Close ${activePanel} panel`}
                    >
                      x
                    </button>
                  </div>
                  <span className={styles.listBadge}>
                    {activePanel === 'weekly' ? 'Weekly' : 'Monthly'} restock
                  </span>
                  {generatedList.length === 0 ? (
                    <p className={styles.emptyText}>You are all set for this list.</p>
                  ) : (
                    <div className={styles.generatedList}>
                      {generatedList.map((item) => (
                        <div key={item.id} className={styles.generatedItem}>
                          <div>
                            <div className={styles.itemName}>{item.name}</div>
                            <div className={styles.itemMeta}>
                              {item.remainingQuantity} / {item.orderedQuantity} {item.unit || 'units'}
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
            </div>
          ) : null}
        </section>

        <section className={styles.panelCard}>
          <button
            type="button"
            className={styles.panelToggle}
            onClick={() => toggleAccordion('manage')}
            aria-expanded={openSections.manage}
            aria-controls="kitchen-manage-content"
          >
            <span className={styles.panelToggleText}>
              <span className={styles.panelSectionTitle}>Manage inventory</span>
              <span className={styles.panelSectionSubtitle}>
                Reset defaults, clear all items, or add a new grocery entry.
              </span>
            </span>
            <span className={styles.panelToggleIcon} aria-hidden="true">
              {openSections.manage ? 'Hide' : 'Show'}
            </span>
          </button>
          {openSections.manage ? (
            <div id="kitchen-manage-content" className={styles.panelContent}>
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setActivePanel('reset')}
                >
                  Reset defaults
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => setActivePanel('clear')}
                >
                  Remove all
                </button>
              </div>

              {activePanel === 'reset' || activePanel === 'clear' ? (
                <div className={styles.resultCard}>
                  <div className={styles.listPanelHeader}>
                    <div>
                      <h3 className={styles.listTitle}>
                        {activePanel === 'reset' ? 'Reset defaults' : 'Remove all groceries'}
                      </h3>
                      <p className={styles.listMeta}>
                        {activePanel === 'reset'
                          ? 'Replace your current items with the default grocery set.'
                          : 'Clear every grocery item from your current inventory.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.closeButton}
                      onClick={closeActionPanel}
                      aria-label={`Close ${activePanel} panel`}
                    >
                      x
                    </button>
                  </div>
                  <div className={styles.confirmPanel}>
                    <p className={styles.confirmText}>
                      {activePanel === 'reset'
                        ? 'This will replace your current groceries with the default starter list.'
                        : 'This will remove all grocery items from your inventory.'}
                    </p>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={
                          activePanel === 'clear' ? styles.dangerButton : styles.primaryButton
                        }
                        onClick={() => {
                          if (activePanel === 'reset') {
                            onResetGrocery();
                          } else {
                            onClearGroceries();
                          }
                          closeActionPanel();
                        }}
                      >
                        {activePanel === 'reset' ? 'Confirm reset' : 'Confirm remove all'}
                      </button>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={closeActionPanel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={styles.formRow}>
                <label className={`${styles.field} ${styles.fieldItem}`}>
                  <span className={styles.fieldLabel}>Item</span>
                  <input
                    className={styles.input}
                    placeholder="Atta, Milk"
                    value={newItem.name}
                    onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldUnit}`}>
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
                <label className={`${styles.field} ${styles.fieldRemaining}`}>
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
                <label className={`${styles.field} ${styles.fieldOrdered}`}>
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
                <label className={`${styles.field} ${styles.fieldCategory}`}>
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
                <label className={`${styles.field} ${styles.fieldFrequency}`}>
                  <span className={styles.fieldLabel}>Bought / ordered</span>
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
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.formSubmitButton}`}
                  onClick={handleAddItem}
                >
                  Add
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.panelCard}>
          <button
            type="button"
            className={styles.panelToggle}
            onClick={() => toggleAccordion('inventory')}
            aria-expanded={openSections.inventory}
            aria-controls="kitchen-inventory-content"
          >
            <span className={styles.panelToggleText}>
              <span className={styles.panelSectionTitle}>Current inventory</span>
              <span className={styles.panelSectionSubtitle}>
                Search, filter, and update what you have on hand.
              </span>
            </span>
            <span className={styles.panelToggleIcon} aria-hidden="true">
              {openSections.inventory ? 'Hide' : 'Show'}
            </span>
          </button>
          {openSections.inventory ? (
            <div id="kitchen-inventory-content" className={styles.panelContent}>
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
                        <button
                          type="button"
                          className={styles.groupHeader}
                          onClick={() => toggleSection(category.id)}
                          aria-expanded={!isCollapsed}
                          aria-controls={`group-${category.id}`}
                        >
                          <span className={styles.groupHeaderText}>
                            <span className={styles.groupTitle}>{category.title}</span>
                            <span className={styles.groupMeta}>{items.length} items</span>
                          </span>
                          <span className={styles.groupToggle} aria-hidden="true">
                            {isCollapsed ? 'Show' : 'Hide'}
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div id={`group-${category.id}`} className={styles.groupContent}>
                            {items.length === 0 ? (
                              <p className={styles.emptyText}>No items in this section yet.</p>
                            ) : (
                              <div className={styles.list}>
                                {items.map((item) => {
                                  const isEditing = editingId === item.id;
                                  return (
                                    <div
                                      key={item.id}
                                      className={`${styles.listRow} ${
                                        isEditing ? styles.listRowEditing : styles.listRowCompact
                                      }`}
                                    >
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
          ) : null}
        </section>
      </section>
    </div>
  );
}
