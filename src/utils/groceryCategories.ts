const normalize = (value: string) => value.trim().toLowerCase();

type GroceryCategoryDefinition = {
  id: string;
  title: string;
  keywords: string[];
};

const CATEGORY_DEFINITIONS: GroceryCategoryDefinition[] = [
  {
    id: 'vegetables',
    title: 'Vegetables',
    keywords: [
      'onion',
      'tomato',
      'potato',
      'green chilli',
      'ginger',
      'garlic',
      'coriander leaves',
      'curry leaves',
      'spinach',
      'palak',
      'methi',
      'capsicum',
      'carrot',
      'beans',
      'cabbage',
    ],
  },
  {
    id: 'fruits',
    title: 'Fruits',
    keywords: ['banana', 'apple', 'papaya', 'pomegranate', 'mosambi'],
  },
  {
    id: 'dairy-daily-use',
    title: 'Dairy & Daily Use',
    keywords: [
      'milk',
      'curd',
      'dahi',
      'buttermilk',
      'paneer',
      'butter',
      'cheese',
      'eggs',
      'egg',
      'chicken',
    ],
  },
  {
    id: 'oils-cooking-essentials',
    title: 'Oils & Cooking Essentials',
    keywords: [
      'groundnut oil',
      'sunflower oil',
      'ghee',
      'salt',
      'sugar',
      'jaggery',
      'gul',
      'turmeric powder',
      'red chilli powder',
      'coriander powder',
      'jeera',
      'mustard seeds',
      'hing',
      'garam masala',
      'peanuts',
      'dry coconut',
      'ketchup',
      'mayonnaise',
      'tea',
      'coffee',
      'oil',
    ],
  },
  {
    id: 'snacks-quick-eats',
    title: 'Snacks & Quick Eats',
    keywords: ['namkeen', 'biscuits', 'chips', 'makhana', 'instant noodles', 'noodles'],
  },
  {
    id: 'dal',
    title: 'Dal',
    keywords: [
      'toor dal',
      'moong dal',
      'chana dal',
      'urad dal',
      'masoor dal',
      'rajma',
      'kala chana',
      'kabuli chana',
      'matki',
      'dal',
    ],
  },
] as const;

const CATEGORY_BY_ID = new Map<string, GroceryCategoryDefinition>(
  CATEGORY_DEFINITIONS.map((category) => [category.id, category])
);

export const CATEGORY_SECTIONS = CATEGORY_DEFINITIONS;

export const isKnownCategoryId = (categoryId?: string | null) =>
  Boolean(categoryId && CATEGORY_BY_ID.has(categoryId));

export const getCategoryDefinition = (categoryId?: string | null) =>
  (categoryId ? CATEGORY_BY_ID.get(categoryId) : undefined) ?? CATEGORY_DEFINITIONS[0];

export const getCategoryTitle = (categoryId?: string | null) =>
  getCategoryDefinition(categoryId).title;

export const getCategoryId = (name: string, categoryId?: string | null) => {
  if (isKnownCategoryId(categoryId)) {
    return categoryId as string;
  }

  const normalized = normalize(name);
  const match = CATEGORY_DEFINITIONS.find((category) =>
    category.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (match) {
    return match.id;
  }

  return 'snacks-quick-eats';
};
