import { FOOD_CATEGORIES } from '../../types';
import type { FoodCategory } from '../../types';
import styles from './CategoryFilter.module.css';

const CATEGORY_IDS: FoodCategory[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

interface CategoryFilterProps {
  activeCategories: FoodCategory[];
  onToggle: (category: FoodCategory) => void;
  onSelectAll: () => void;
  'aria-label'?: string;
}

export function CategoryFilter({
  activeCategories,
  onToggle,
  onSelectAll,
  'aria-label': ariaLabel,
}: CategoryFilterProps) {
  const isAllActive = activeCategories.length === CATEGORY_IDS.length;

  return (
    <div
      className={styles.wrapper}
      role="group"
      aria-label={ariaLabel ?? 'Filter wheel by category'}
    >
      <span className={styles.legend}>Show on wheel</span>
      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip} ${isAllActive ? styles.chipActive : ''}`}
          onClick={onSelectAll}
          aria-pressed={isAllActive}
          aria-label={`All: ${isAllActive ? 'included' : 'excluded'}`}
        >
          All
        </button>
        {CATEGORY_IDS.map((id) => {
          const isActive = activeCategories.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
              onClick={() => onToggle(id)}
              aria-pressed={isActive}
              aria-label={`${FOOD_CATEGORIES[id]}: ${isActive ? 'included' : 'excluded'}`}
            >
              {FOOD_CATEGORIES[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
