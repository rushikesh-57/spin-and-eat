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
      'tamatar',
      'onion',
      'kanda',
      'potato',
      'batata',
      'cauliflower',
      'flower',
      'brinjal',
      'eggplant',
      'vangi',
      'cabbage',
      'kobi',
      'capsicum',
      'bell pepper',
      'simla mirch',
      'beans',
      'farasbi',
      'carrot',
      'gajar',
      'beetroot',
      'beet',
      'okra',
      'bhindi',
      'bottle gourd',
      'lauki',
      'dudhi',
      'ridge gourd',
      'tori',
      'dodka',
      'pumpkin',
      'lal bhopla',
      'peas',
      'matar',
      'corn',
      'makka',
      'broccoli',
      'mushroom',
      'cucumber',
      'kakdi',
      'radish',
      'mooli',
      'tinda',
      'tondli',
      'ivy gourd',
      'cluster beans',
      'gawar',
      'suran',
      'yam',
    ],
  },
  {
    id: 'fruits',
    title: 'Fruits',
    keywords: [
      'banana',
      'kela',
      'apple',
      'safarjan',
      'mango',
      'amba',
      'orange',
      'santra',
      'mosambi',
      'sweet lime',
      'pomegranate',
      'dalimb',
      'papaya',
      'papai',
      'grapes',
      'draksha',
      'guava',
      'peru',
      'watermelon',
      'tarbuj',
      'melon',
      'kharbooja',
      'pineapple',
      'ananas',
      'pear',
      'kiwi',
      'strawberry',
      'blueberry',
      'fruit',
    ],
  },
  {
    id: 'herbs',
    title: 'Greens & Herbs',
    keywords: [
      'spinach',
      'palak',
      'methi',
      'amaranth',
      'math',
      'coriander',
      'coriander leaves',
      'cilantro',
      'kothimbir',
      'curry leaves',
      'kadipatta',
      'mint',
      'pudina',
      'spring onion',
      'green onion',
      'garlic',
      'lasun',
      'ginger',
      'adrak',
      'green chilli',
      'green chili',
      'chilli',
      'chili',
      'hirvi mirchi',
      'lemongrass',
      'basil',
      'shepu',
      'dill',
    ],
  },
  {
    id: 'grains',
    title: 'Rice, Flour & Grains',
    keywords: [
      'atta',
      'kanik',
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
      'tandul',
      'brown rice',
      'idli rice',
      'broken rice',
      'jowar',
      'bajra',
      'ragi',
      'millet',
      'poha',
      'aval',
      'flattened rice',
      'quinoa',
      'oats',
      'sabudana',
    ],
  },
  {
    id: 'pulses',
    title: 'Dal & Pulses',
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
      'vatana',
      'harbhara',
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
      'doodh',
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
      'shrikhand',
    ],
  },
  {
    id: 'protein',
    title: 'Meat & Seafood',
    keywords: [
      'chicken',
      'mutton',
      'fish',
      'machhi',
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
    title: 'Spices, Oil & Basics',
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
      'mohri',
      'oil',
      'ghee',
      'salt',
      'mith',
      'sugar',
      'sakhar',
      'jaggery',
      'gul',
      'vinegar',
      'soy sauce',
      'garam masala',
      'god masala',
      'kala masala',
      'tirphal',
      'kokum',
    ],
  },
  {
    id: 'packaged',
    title: 'Snacks & Ready Items',
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
      'chai',
      'coffee',
      'juice',
      'soda',
      'drink',
      'chivda',
      'shev',
      'chakli',
      'ladoo',
    ],
  },
  {
    id: 'household',
    title: 'Household Items',
    keywords: ['detergent', 'soap', 'shampoo', 'cleaner', 'tissue', 'foil', 'sponge', 'brush', 'phenyl'],
  },
] as const;

const OTHER_CATEGORY: GroceryCategoryDefinition = {
  id: 'other',
  title: 'Other Items',
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
