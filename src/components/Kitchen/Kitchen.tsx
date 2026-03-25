import { useMemo, useState } from 'react';
import type { GroceryFrequency, GroceryItem, GroceryStatus, UserProfilePreferences } from '../../types';
import { CATEGORY_SECTIONS, getCategoryId } from '../../utils/groceryCategories';
import { useAlertDialog } from '../layout/AlertDialogProvider';
import styles from './Kitchen.module.css';

type Props = {
  groceries: GroceryItem[];
  userProfile: UserProfilePreferences;
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
  userProfile,
  onAddGrocery,
  onUpdateGrocery,
  onRemoveGrocery,
  onClearGroceries,
  onResetGrocery,
}: Props) {
  const { confirm, notify } = useAlertDialog();
  const [newItem, setNewItem] = useState(defaultNewItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(defaultNewItem);
  const [activePanel, setActivePanel] = useState<'weekly' | 'monthly' | null>(null);
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

  const normalizedWhatsappNumber = userProfile.whatsappNumber.replace(/[^\d]/g, '');

  const handleShareListToWhatsapp = async () => {
    if (activePanel !== 'weekly' && activePanel !== 'monthly') return;
    if (!normalizedWhatsappNumber || normalizedWhatsappNumber.length < 8) {
      await notify({
        title: 'Add your WhatsApp number',
        message: 'Please add a valid WhatsApp number in Profile, then try sharing the list again.',
      });
      return;
    }

    const title = activePanel === 'weekly' ? 'Weekly grocery list' : 'Monthly grocery list';
    const lines =
      generatedList.length === 0
        ? ['All items are stocked right now.']
        : generatedList.map(
            (item) =>
              `- ${item.name}: ${item.remainingQuantity} / ${item.orderedQuantity} ${item.unit || 'units'} (${STATUS_LABELS[item.status]})`
          );
    const text = [title, '', ...lines].join('\n');
    const whatsappUrl = `https://wa.me/${normalizedWhatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

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

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editDraft.name.trim()) return;
    const confirmed = await confirm({
      title: 'Save grocery update?',
      message: `This will update the remaining quantity for ${editDraft.name.trim()}.`,
      confirmLabel: 'Save changes',
    });
    if (!confirmed) return;
    const nextStatus = deriveStatusFromQuantities(
      editDraft.orderedQuantity,
      editDraft.remainingQuantity
    );
    const nextRemaining = applyStatusToRemaining(
      nextStatus,
      editDraft.orderedQuantity,
      editDraft.remainingQuantity
    );
    onUpdateGrocery(editingId, {
      remainingQuantity: nextRemaining,
      status: nextStatus,
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

  const handleResetGroceries = async () => {
    const confirmed = await confirm({
      title: 'Reset grocery defaults?',
      message: 'This will replace your current grocery inventory with the default starter list.',
      confirmLabel: 'Reset defaults',
      tone: 'danger',
    });

    if (confirmed) {
      onResetGrocery();
      closeActionPanel();
    }
  };

  const handleClearGroceries = async () => {
    const confirmed = await confirm({
      title: 'Remove all groceries?',
      message: 'This will delete every grocery item from your inventory.',
      confirmLabel: 'Remove all',
      tone: 'danger',
    });

    if (confirmed) {
      onClearGroceries();
      closeActionPanel();
    }
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
                  className={`${styles.primaryButton} ${styles.actionButtonHighlight}`}
                  onClick={() => setActivePanel('weekly')}
                >
                  Weekly list
                </button>
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.actionButtonHighlight}`}
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
                  <div className={styles.listShareRow}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={handleShareListToWhatsapp}
                    >
                      Send to WhatsApp
                    </button>
                    {!normalizedWhatsappNumber ? (
                      <p className={styles.listMeta}>Add your WhatsApp number in Profile to use this.</p>
                    ) : null}
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
                  className={`${styles.primaryButton} ${styles.actionButtonHighlight}`}
                  onClick={handleResetGroceries}
                >
                  Reset defaults
                </button>
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.actionButtonHighlight}`}
                  onClick={handleClearGroceries}
                >
                  Remove all
                </button>
              </div>

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
                                          <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{item.name}</div>
                                            <div className={styles.itemMeta}>
                                              Ordered: {item.orderedQuantity} {item.unit || 'units'}
                                            </div>
                                          </div>
                                          <div className={styles.editRowInline}>
                                            <label className={styles.editField}>
                                              <span className={styles.editFieldLabel}>Remaining qty</span>
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
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{item.name}</div>
                                            <div className={styles.itemMeta}>
                                              <span
                                                className={`${styles.quantitySummary} ${
                                                  styles[`quantity${item.status}`]
                                                }`}
                                              >
                                                {item.remainingQuantity} / {item.orderedQuantity}{' '}
                                                {item.unit || 'units'}
                                              </span>
                                            </div>
                                          </div>
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
                                              className={styles.deleteActionButton}
                                              onClick={async () => {
                                                const confirmed = await confirm({
                                                  title: 'Delete grocery item?',
                                                  message: `This will remove ${item.name} from your grocery inventory.`,
                                                  confirmLabel: 'Delete item',
                                                  tone: 'danger',
                                                });

                                                if (confirmed) {
                                                  onRemoveGrocery(item.id);
                                                }
                                              }}
                                              aria-label={`Delete ${item.name}`}
                                              title="Delete grocery"
                                            >
                                              <svg
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                                className={styles.deleteIcon}
                                              >
                                                <path
                                                  d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11V8h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"
                                                  fill="currentColor"
                                                />
                                              </svg>
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
