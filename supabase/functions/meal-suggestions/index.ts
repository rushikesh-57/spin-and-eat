import { corsHeaders } from '../_shared/cors.ts';
import { callOpenRouterJSON } from '../_shared/openrouter.ts';

export const config = {
  verify_jwt: false,
};

type GroceryInput = {
  name?: string;
  remainingQuantity?: number;
  unit?: string;
  status?: string;
};

type UserProfileInput = {
  preferredName?: string;
  city?: string;
  dietPreference?: string;
  spicePreference?: string;
  familyMembers?: number;
};

const buildGroceryList = (items: GroceryInput[]) =>
  items
    .map((item) => {
      const name = item.name?.trim() || 'Unknown item';
      return `- ${name}`;
    })
    .join('\n');

const buildProfileContext = (profile?: UserProfileInput) => {
  if (!profile) return '';

  const details = [
    profile.preferredName?.trim() ? `Preferred name: ${profile.preferredName.trim()}` : null,
    profile.city?.trim() ? `City: ${profile.city.trim()}` : null,
    profile.dietPreference?.trim() ? `Diet: ${profile.dietPreference.trim()}` : null,
    profile.spicePreference?.trim() ? `Spice preference: ${profile.spicePreference.trim()}` : null,
    typeof profile.familyMembers === 'number' && Number.isFinite(profile.familyMembers)
      ? `Family members: ${Math.max(1, Math.round(profile.familyMembers))}`
      : null,
  ].filter(Boolean);

  if (details.length === 0) return '';

  return `User profile:\n${details.map((item) => `- ${item}`).join('\n')}\n\n`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let payload: {
    groceries?: GroceryInput[];
    profile?: UserProfileInput;
    maxSuggestions?: number;
    excludeSuggestions?: string[];
  } = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groceries = Array.isArray(payload.groceries) ? payload.groceries : [];
  const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : undefined;
  const maxSuggestions =
    typeof payload.maxSuggestions === 'number' && payload.maxSuggestions > 0
      ? Math.min(10, Math.floor(payload.maxSuggestions))
      : 10;
  const excludeSuggestions = Array.isArray(payload.excludeSuggestions)
    ? payload.excludeSuggestions
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const pantryKeywords = [
    'masala',
    'spice',
    'powder',
    'chilli',
    'turmeric',
    'cumin',
    'coriander',
    'pepper',
    'salt',
    'sugar',
    'oil',
    'ghee',
    'butter',
    'vinegar',
  ];
  const available = groceries.filter((item) => {
    const isAvailable =
      (item.status ?? 'available') !== 'out' &&
      typeof item.remainingQuantity === 'number' &&
      item.remainingQuantity > 0;
    const name = (item.name ?? '').toLowerCase();
    const isPantry = pantryKeywords.some((keyword) => name.includes(keyword));
    return isAvailable && !isPantry;
  });

  if (available.length === 0) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groceryList = buildGroceryList(available);
  const profileContext = buildProfileContext(profile);
  const excludedList =
    excludeSuggestions.length > 0
      ? `\nDo not repeat any of these dishes:\n${excludeSuggestions
          .map((item) => `- ${item}`)
          .join('\n')}\n`
      : '\n';
  const prompt = `${profileContext}Available groceries:\n${groceryList}${excludedList}\nReturn up to ${maxSuggestions} cook-at-home dish names that can be made mainly from the available items. Use the user's diet preference, spice preference, city/context, and family size when they are provided. Only return new dish names that are not in the excluded list. Output a single-line JSON object only (no extra whitespace).`;
  try {
    const parsed = await callOpenRouterJSON<{ suggestions?: unknown }>({
      schemaName: 'meal_suggestions',
      systemPrompt:
        'You are a culinary assistant. Respond only with JSON that matches the provided schema.',
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 1024,
      schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['suggestions'],
        additionalProperties: false,
      },
    });

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(
          (item): item is string =>
            typeof item === 'string' &&
            item.trim().length > 0 &&
            !excludeSuggestions.some(
              (excluded) => excluded.toLowerCase() === item.trim().toLowerCase()
            )
        )
      : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'OpenRouter request failed.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
