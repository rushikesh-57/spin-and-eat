import { FOOD_CATEGORIES } from '../../types';
import type { FoodCategory } from '../../types';
import styles from './CategoryFilter.module.css';

const CATEGORY_IDS = ['veg', 'non-veg', 'healthy', 'cheat-meal'] as const;

interface CategoryFilterProps {
  activeCategories: string[];
  onToggle: (category: FoodCategory) => void;
  'aria-label'?: string;
}

export function CategoryFilter({
  activeCategories,
  onToggle,
  'aria-label': ariaLabel,
}: CategoryFilterProps) {
  return (
    <div
      className={styles.wrapper}
      role="group"
      aria-label={ariaLabel ?? 'Filter wheel by category'}
    >
      <span className={styles.legend}>Show on wheel</span>
      <div className={styles.chips}>
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
