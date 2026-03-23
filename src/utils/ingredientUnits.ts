import type { DishIngredientRequirement, GroceryItem } from '../types';

const UNIT_ALIASES: Record<string, string> = {
  kilogram: 'kg',
  kilograms: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kg: 'kg',
  gram: 'g',
  grams: 'g',
  g: 'g',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  l: 'l',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  piece: 'pcs',
  pieces: 'pcs',
  pc: 'pcs',
  pcs: 'pcs',
  clove: 'clove',
  cloves: 'clove',
  unit: 'pcs',
  units: 'pcs',
  pack: 'packs',
  packs: 'packs',
  packet: 'packs',
  packets: 'packs',
  jar: 'jar',
  jars: 'jar',
  bunch: 'bunch',
  bunches: 'bunch',
};

type IngredientProfile = {
  gramsPerPiece?: number;
  gramsPerClove?: number;
  gramsPerTeaspoon?: number;
  gramsPerTablespoon?: number;
  millilitersPerTeaspoon?: number;
  millilitersPerTablespoon?: number;
  millilitersPerCup?: number;
};

const INGREDIENT_PROFILES: Record<string, IngredientProfile> = {
  onion: { gramsPerPiece: 110 },
  tomato: { gramsPerPiece: 100 },
  potato: { gramsPerPiece: 150 },
  garlic: { gramsPerClove: 5, gramsPerTeaspoon: 5, gramsPerTablespoon: 15 },
  ginger: { gramsPerTeaspoon: 5, gramsPerTablespoon: 15 },
  'green chilli': { gramsPerPiece: 5 },
  chilli: { gramsPerPiece: 5, gramsPerTeaspoon: 3, gramsPerTablespoon: 9 },
  capsicum: { gramsPerPiece: 120 },
  brinjal: { gramsPerPiece: 180 },
  cabbage: { gramsPerPiece: 900 },
  cauliflower: { gramsPerPiece: 700 },
  egg: { gramsPerPiece: 1 },
  eggs: { gramsPerPiece: 1 },
  oil: { millilitersPerTeaspoon: 5, millilitersPerTablespoon: 15, millilitersPerCup: 240 },
  ghee: { millilitersPerTeaspoon: 5, millilitersPerTablespoon: 15, millilitersPerCup: 240 },
  milk: { millilitersPerTeaspoon: 5, millilitersPerTablespoon: 15, millilitersPerCup: 240 },
  curd: { gramsPerTeaspoon: 5, gramsPerTablespoon: 15, millilitersPerCup: 240 },
  yoghurt: { gramsPerTeaspoon: 5, gramsPerTablespoon: 15, millilitersPerCup: 240 },
  dahi: { gramsPerTeaspoon: 5, gramsPerTablespoon: 15, millilitersPerCup: 240 },
  salt: { gramsPerTeaspoon: 6, gramsPerTablespoon: 18 },
  sugar: { gramsPerTeaspoon: 4, gramsPerTablespoon: 12 },
  turmeric: { gramsPerTeaspoon: 3, gramsPerTablespoon: 9 },
  haldi: { gramsPerTeaspoon: 3, gramsPerTablespoon: 9 },
  'red chilli powder': { gramsPerTeaspoon: 3, gramsPerTablespoon: 9 },
  'coriander powder': { gramsPerTeaspoon: 2, gramsPerTablespoon: 6 },
  'cumin powder': { gramsPerTeaspoon: 2, gramsPerTablespoon: 6 },
  'garam masala': { gramsPerTeaspoon: 2, gramsPerTablespoon: 6 },
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeUnit = (value: string) => UNIT_ALIASES[value.trim().toLowerCase()] ?? value.trim().toLowerCase();

const getIngredientProfile = (ingredientName: string, groceryName?: string) => {
  const candidates = [ingredientName, groceryName ?? '']
    .map(normalizeName)
    .filter(Boolean);

  for (const candidate of candidates) {
    const direct = INGREDIENT_PROFILES[candidate];
    if (direct) return direct;

    for (const [key, profile] of Object.entries(INGREDIENT_PROFILES)) {
      if (candidate.includes(key) || key.includes(candidate)) {
        return profile;
      }
    }
  }

  return null;
};

const convertSimpleQuantity = (quantity: number, fromUnit: string, toUnit: string) => {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return quantity;
  if (from === 'kg' && to === 'g') return quantity * 1000;
  if (from === 'g' && to === 'kg') return quantity / 1000;
  if (from === 'l' && to === 'ml') return quantity * 1000;
  if (from === 'ml' && to === 'l') return quantity / 1000;

  return null;
};

const convertWithProfile = (
  quantity: number,
  fromUnit: string,
  toUnit: string,
  profile: IngredientProfile | null
) => {
  if (!profile) return null;

  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  const massInGrams = (() => {
    if (from === 'g') return quantity;
    if (from === 'kg') return quantity * 1000;
    if (from === 'pcs' && profile.gramsPerPiece) return quantity * profile.gramsPerPiece;
    if (from === 'clove' && profile.gramsPerClove) return quantity * profile.gramsPerClove;
    if (from === 'tsp' && profile.gramsPerTeaspoon) return quantity * profile.gramsPerTeaspoon;
    if (from === 'tbsp' && profile.gramsPerTablespoon) return quantity * profile.gramsPerTablespoon;
    return null;
  })();

  if (massInGrams !== null) {
    if (to === 'g') return massInGrams;
    if (to === 'kg') return massInGrams / 1000;
    if (to === 'pcs' && profile.gramsPerPiece) return massInGrams / profile.gramsPerPiece;
    if (to === 'clove' && profile.gramsPerClove) return massInGrams / profile.gramsPerClove;
    if (to === 'tsp' && profile.gramsPerTeaspoon) return massInGrams / profile.gramsPerTeaspoon;
    if (to === 'tbsp' && profile.gramsPerTablespoon) return massInGrams / profile.gramsPerTablespoon;
  }

  const volumeInMl = (() => {
    if (from === 'ml') return quantity;
    if (from === 'l') return quantity * 1000;
    if (from === 'tsp' && profile.millilitersPerTeaspoon) return quantity * profile.millilitersPerTeaspoon;
    if (from === 'tbsp' && profile.millilitersPerTablespoon) return quantity * profile.millilitersPerTablespoon;
    if (from === 'cup' && profile.millilitersPerCup) return quantity * profile.millilitersPerCup;
    return null;
  })();

  if (volumeInMl !== null) {
    if (to === 'ml') return volumeInMl;
    if (to === 'l') return volumeInMl / 1000;
    if (to === 'tsp' && profile.millilitersPerTeaspoon) {
      return volumeInMl / profile.millilitersPerTeaspoon;
    }
    if (to === 'tbsp' && profile.millilitersPerTablespoon) {
      return volumeInMl / profile.millilitersPerTablespoon;
    }
    if (to === 'cup' && profile.millilitersPerCup) {
      return volumeInMl / profile.millilitersPerCup;
    }
  }

  return null;
};

export const formatQuantity = (value: number) => value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

export const convertIngredientQuantity = (
  quantity: number,
  fromUnit: string,
  toUnit: string,
  ingredientName: string,
  groceryName?: string
) => {
  const simple = convertSimpleQuantity(quantity, fromUnit, toUnit);
  if (simple !== null) {
    return { quantity: simple, source: 'direct' as const };
  }

  const profile = getIngredientProfile(ingredientName, groceryName);
  const profiled = convertWithProfile(quantity, fromUnit, toUnit, profile);
  if (profiled !== null) {
    return { quantity: profiled, source: 'estimated' as const };
  }

  return null;
};

export const resolveRequirementQuantityForInventory = (
  requirement: DishIngredientRequirement,
  item: GroceryItem
) => {
  if (requirement.inventoryQuantity && requirement.inventoryQuantity > 0 && requirement.inventoryUnit) {
    const converted = convertIngredientQuantity(
      requirement.inventoryQuantity,
      requirement.inventoryUnit,
      item.unit,
      requirement.name,
      item.name
    );

    if (converted) {
      return {
        quantity: converted.quantity,
        note: `${formatQuantity(requirement.inventoryQuantity)} ${normalizeUnit(requirement.inventoryUnit)} inventory equivalent`,
        source: 'ai' as const,
        estimated: converted.source === 'estimated',
      };
    }
  }

  const converted = convertIngredientQuantity(
    requirement.quantity,
    requirement.unit,
    item.unit,
    requirement.name,
    item.name
  );

  if (!converted) {
    return null;
  }

  return {
    quantity: converted.quantity,
    note:
      converted.source === 'estimated'
        ? `Estimated from ${formatQuantity(requirement.quantity)} ${normalizeUnit(requirement.unit)}`
        : `${formatQuantity(requirement.quantity)} ${normalizeUnit(requirement.unit)}`,
    source: converted.source,
    estimated: converted.source === 'estimated',
  };
};
