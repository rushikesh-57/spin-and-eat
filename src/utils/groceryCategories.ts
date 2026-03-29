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
      'tomato',
      'onion',
      'potato',
      'cauliflower',
      'brinjal',
      'eggplant',
      'cabbage',
      'capsicum',
      'bell pepper',
      'beans',
      'carrot',
      'beetroot',
      'okra',
      'bhindi',
      'bottle gourd',
      'lauki',
      'ridge gourd',
      'tori',
      'pumpkin',
      'peas',
      'corn',
      'broccoli',
      'mushroom',
      'cucumber',
      'radish',
    ],
  },
  {
    id: 'fruits',
    title: 'Fruits',
    keywords: [
      'banana',
      'apple',
      'mango',
      'orange',
      'mosambi',
      'sweet lime',
      'pomegranate',
      'papaya',
      'grapes',
      'guava',
      'watermelon',
      'melon',
      'pineapple',
      'pear',
      'kiwi',
      'strawberry',
      'blueberry',
      'fruit',
    ],
  },
  {
    id: 'herbs',
    title: 'Herbs, Greens & Aromatics',
    keywords: [
      'spinach',
      'palak',
      'methi',
      'amaranth',
      'coriander',
      'coriander leaves',
      'cilantro',
      'curry leaves',
      'mint',
      'pudina',
      'spring onion',
      'green onion',
      'garlic',
      'ginger',
      'green chilli',
      'green chili',
      'chilli',
      'chili',
      'lemongrass',
      'basil',
    ],
  },
  {
    id: 'grains',
    title: 'Flours, Rice & Grains',
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
      'poha',
      'flattened rice',
      'quinoa',
      'oats',
    ],
  },
  {
    id: 'pulses',
    title: 'Dal, Pulses & Legumes',
    keywords: [
      'dal',
      'lentil',
      'toor',
      'arhar',
      'urad',
      'moong',
      'masoor',
      'chana',
      'rajma',
      'kabuli',
      'kala chana',
      'lobia',
      'black eyed',
      'matki',
      'peas dry',
      'soybean',
      'soya chunk',
      'beans dry',
    ],
  },
  {
    id: 'dairy',
    title: 'Dairy, Eggs & Breakfast',
    keywords: [
      'milk',
      'curd',
      'dahi',
      'paneer',
      'cheese',
      'butter',
      'cream',
      'buttermilk',
      'yogurt',
      'bread',
      'egg',
      'eggs',
      'toast',
      'jam',
    ],
  },
  {
    id: 'protein',
    title: 'Meat & Seafood',
    keywords: [
      'chicken',
      'mutton',
      'fish',
      'prawn',
      'shrimp',
      'crab',
      'keema',
      'meat',
      'sausage',
    ],
  },
  {
    id: 'spices',
    title: 'Spices, Oil & Cooking Basics',
    keywords: [
      'masala',
      'spice',
      'whole spices',
      'mirchi',
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
      'vinegar',
      'soy sauce',
      'garam masala',
    ],
  },
  {
    id: 'packaged',
    title: 'Snacks, Beverages & Ready Items',
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
      'cornflakes',
      'dry fruits',
      'peanuts',
      'makhana',
      'chocolate',
      'tea',
      'coffee',
      'juice',
      'soda',
      'drink',
    ],
  },
  {
    id: 'household',
    title: 'Household Essentials',
    keywords: ['detergent', 'soap', 'shampoo', 'cleaner', 'tissue', 'foil', 'sponge', 'brush'],
  },
] as const;

const OTHER_CATEGORY: GroceryCategoryDefinition = {
  id: 'other',
  title: 'Other Essentials',
  keywords: [],
};

const CATEGORY_BY_ID = new Map<string, GroceryCategoryDefinition>(
  [...CATEGORY_DEFINITIONS, OTHER_CATEGORY].map((category) => [category.id, category])
);

const LEGACY_CATEGORY_IDS = new Set([
  'fresh',
  'atta',
  'masala',
  'snacks',
  'meat',
  'home',
]);

export const CATEGORY_SECTIONS = [...CATEGORY_DEFINITIONS, OTHER_CATEGORY];

export const isKnownCategoryId = (categoryId?: string | null) =>
  Boolean(categoryId && CATEGORY_BY_ID.has(categoryId));

export const getCategoryDefinition = (categoryId?: string | null) =>
  (categoryId ? CATEGORY_BY_ID.get(categoryId) : undefined) ?? OTHER_CATEGORY;

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

  if (categoryId && LEGACY_CATEGORY_IDS.has(categoryId)) {
    return OTHER_CATEGORY.id;
  }

  return OTHER_CATEGORY.id;
};
