import type { GroceryFrequency, GroceryItem } from '../types';

const WEEKLY_HINTS = [
  'milk',
  'curd',
  'dahi',
  'paneer',
  'cheese',
  'butter',
  'cream',
  'buttermilk',
  'egg',
  'eggs',
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
  'chicken',
  'mutton',
  'fish',
  'prawn',
];

const ADHOC_HINTS = [
  'chips',
  'namkeen',
  'biscuit',
  'cookie',
  'chocolate',
  'ready-to-eat',
  'dry fruits',
  'makhana',
  'peanuts',
];

const inferFrequency = (name: string): GroceryFrequency => {
  const normalized = name.trim().toLowerCase();
  if (WEEKLY_HINTS.some((hint) => normalized.includes(hint))) return 'weekly';
  if (ADHOC_HINTS.some((hint) => normalized.includes(hint))) return 'adhoc';
  return 'monthly';
};

const BASE_GROCERIES: Omit<GroceryItem, 'frequency'>[] = [
  // 🌾 Staples
  { id: 'g1', name: 'Rice', orderedQuantity: 2, remainingQuantity: 2, unit: 'kg', status: 'available' },
  { id: 'g2', name: 'Atta (wheat flour)', orderedQuantity: 2, remainingQuantity: 2, unit: 'kg', status: 'available' },
  { id: 'g3', name: 'Jowar flour', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g4', name: 'Rava (suji)', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g5', name: 'Besan (gram flour)', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },

  // 🌱 Pulses & Legumes
  { id: 'g6', name: 'Toor dal', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g7', name: 'Moong dal', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g8', name: 'Chana dal', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g9', name: 'Urad dal', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g10', name: 'Masoor dal', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g11', name: 'Kala chana', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g12', name: 'Kabuli chana', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g13', name: 'Matki', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g14', name: 'Rajma', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },

  // 🛢️ Oils & Fats
  { id: 'g15', name: 'Groundnut oil', orderedQuantity: 1, remainingQuantity: 1, unit: 'L', status: 'available' },
  { id: 'g16', name: 'Sunflower oil', orderedQuantity: 1, remainingQuantity: 1, unit: 'L', status: 'available' },
  { id: 'g17', name: 'Ghee', orderedQuantity: 500, remainingQuantity: 500, unit: 'ml', status: 'available' },
  { id: 'g18', name: 'Butter', orderedQuantity: 200, remainingQuantity: 200, unit: 'g', status: 'available' },

  // 🌶️ Spices (Maharashtrian focused)
  { id: 'g19', name: 'Turmeric powder', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g20', name: 'Red chilli powder', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g21', name: 'Coriander powder', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g22', name: 'Cumin seeds', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g23', name: 'Mustard seeds', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g24', name: 'Hing', orderedQuantity: 50, remainingQuantity: 50, unit: 'g', status: 'available' },
  { id: 'g25', name: 'Garam masala', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g26', name: 'Goda masala', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g27', name: 'Whole spices', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },

  // 🧂 Essentials
  { id: 'g28', name: 'Salt', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g29', name: 'Sugar', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g30', name: 'Jaggery (gul)', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },

  // 🥛 Dairy
  { id: 'g31', name: 'Milk', orderedQuantity: 1, remainingQuantity: 1, unit: 'L', status: 'available' },
  { id: 'g32', name: 'Curd (dahi)', orderedQuantity: 500, remainingQuantity: 500, unit: 'g', status: 'available' },
  { id: 'g33', name: 'Buttermilk', orderedQuantity: 1, remainingQuantity: 1, unit: 'L', status: 'available' },
  { id: 'g34', name: 'Paneer', orderedQuantity: 250, remainingQuantity: 250, unit: 'g', status: 'available' },
  { id: 'g35', name: 'Cheese', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
  { id: 'g36', name: 'Cream', orderedQuantity: 200, remainingQuantity: 200, unit: 'ml', status: 'available' },

  // 🌶️ Cooking Base (weekly items)
  { id: 'g37', name: 'Onion', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g38', name: 'Tomato', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g39', name: 'Potato', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g40', name: 'Garlic', orderedQuantity: 0.25, remainingQuantity: 0.25, unit: 'kg', status: 'available' },
  { id: 'g41', name: 'Ginger', orderedQuantity: 0.25, remainingQuantity: 0.25, unit: 'kg', status: 'available' },
  { id: 'g42', name: 'Green chilli', orderedQuantity: 0.1, remainingQuantity: 0.1, unit: 'kg', status: 'available' },
  { id: 'g43', name: 'Coriander leaves', orderedQuantity: 1, remainingQuantity: 1, unit: 'bunch', status: 'available' },
  { id: 'g44', name: 'Curry leaves', orderedQuantity: 1, remainingQuantity: 1, unit: 'bunch', status: 'available' },

  // 🥬 Vegetables (generic buckets for AI flexibility)
  { id: 'g45', name: 'Leafy vegetables', orderedQuantity: 2, remainingQuantity: 2, unit: 'bunch', status: 'available' },
  { id: 'g46', name: 'Seasonal vegetables', orderedQuantity: 2, remainingQuantity: 2, unit: 'kg', status: 'available' },
  { id: 'g47', name: 'Root vegetables', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },

  // 🍎 Fruits
  { id: 'g48', name: 'Banana', orderedQuantity: 6, remainingQuantity: 6, unit: 'pcs', status: 'available' },
  { id: 'g49', name: 'Apple', orderedQuantity: 4, remainingQuantity: 4, unit: 'pcs', status: 'available' },
  { id: 'g50', name: 'Seasonal fruits', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },

  // 🥜 Snacks & Extras
  { id: 'g51', name: 'Namkeen', orderedQuantity: 2, remainingQuantity: 2, unit: 'packs', status: 'available' },
  { id: 'g52', name: 'Biscuits', orderedQuantity: 2, remainingQuantity: 2, unit: 'packs', status: 'available' },
  { id: 'g53', name: 'Chips', orderedQuantity: 2, remainingQuantity: 2, unit: 'packs', status: 'available' },
  { id: 'g54', name: 'Dry fruits', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
  { id: 'g55', name: 'Peanuts', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
  { id: 'g56', name: 'Makhana', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },

  // 🍽️ Maharashtrian Special
  { id: 'g57', name: 'Poha', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g58', name: 'Sabudana', orderedQuantity: 1, remainingQuantity: 1, unit: 'kg', status: 'available' },
  { id: 'g59', name: 'Kokum', orderedQuantity: 100, remainingQuantity: 100, unit: 'g', status: 'available' },
  { id: 'g60', name: 'Dry coconut', orderedQuantity: 1, remainingQuantity: 1, unit: 'pcs', status: 'available' },

  // 🍴 Ready / Misc
  { id: 'g61', name: 'Pickle', orderedQuantity: 1, remainingQuantity: 1, unit: 'jar', status: 'available' },
  { id: 'g62', name: 'Papad', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
  { id: 'g63', name: 'Instant noodles / pasta', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
  { id: 'g64', name: 'Sauces', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
  { id: 'g65', name: 'Ready-to-eat items', orderedQuantity: 1, remainingQuantity: 1, unit: 'packs', status: 'available' },
];

export const SAMPLE_GROCERIES: GroceryItem[] = BASE_GROCERIES.map((item) => ({
  ...item,
  frequency: inferFrequency(item.name),
}));
