import type { FoodItem, GroceryItem, IngredientMapping } from '../types';

export interface CookableStatus {
  foodId: string;
  foodName: string;
  cookable: boolean;
  missing: string[];
}

const normalize = (value: string) => value.trim().toLowerCase();

export function buildCookableStatus(
  foods: FoodItem[],
  groceries: GroceryItem[],
  mapping: IngredientMapping
): CookableStatus[] {
  const inventory = new Map<string, GroceryItem>();
  groceries.forEach((item) => {
    inventory.set(normalize(item.name), item);
  });

  return foods.map((food) => {
    const requirements = mapping[food.id] ?? [];
    if (requirements.length === 0) {
      return {
        foodId: food.id,
        foodName: food.name,
        cookable: false,
        missing: ['No ingredients mapped'],
      };
    }

    const missing: string[] = [];
    requirements.forEach((req) => {
      const entry = inventory.get(normalize(req.name));
      if (!entry) {
        missing.push(`Missing ${req.name || 'ingredient'}`);
        return;
      }
      if (!entry.available) {
        missing.push(`${entry.name} unavailable`);
        return;
      }
      if (req.quantity > entry.quantity) {
        const unit = req.unit || entry.unit;
        missing.push(`Need ${req.quantity} ${unit}, have ${entry.quantity} ${unit}`);
      }
    });

    return {
      foodId: food.id,
      foodName: food.name,
      cookable: missing.length === 0,
      missing,
    };
  });
}
