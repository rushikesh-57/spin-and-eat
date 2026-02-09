import type { GroceryItem } from '../types';

export const SAMPLE_GROCERIES: GroceryItem[] = [
  { id: 'g1', name: 'Flour', quantity: 1, unit: 'kg', available: true },
  { id: 'g2', name: 'Tomato', quantity: 4, unit: 'pcs', available: true },
  { id: 'g3', name: 'Cheese', quantity: 200, unit: 'g', available: true },
  { id: 'g4', name: 'Chicken', quantity: 500, unit: 'g', available: false },
  { id: 'g5', name: 'Rice', quantity: 1.5, unit: 'kg', available: true },
];
