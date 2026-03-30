import { corsHeaders } from '../_shared/cors.ts';
import { callOpenRouterJSON, OpenRouterRequestError } from '../_shared/openrouter.ts';

export const config = {
  verify_jwt: false,
};

type GroceryInput = {
  name?: string;
  remainingQuantity?: number;
  unit?: string;
  status?: string;
  categoryId?: string;
  categoryTitle?: string;
};

type UserProfileInput = {
  preferredName?: string;
  homeCookingStyle?: string;
  dietPreference?: string;
  spicePreference?: string;
  familyMembers?: number;
};

const buildGroceryList = (items: GroceryInput[]) => {
  const grouped = new Map<string, string[]>();

  items.forEach((item) => {
    const sectionTitle = item.categoryTitle?.trim() || 'Other essentials';
    const quantity =
      typeof item.remainingQuantity === 'number' && Number.isFinite(item.remainingQuantity)
        ? ` (${item.remainingQuantity} ${item.unit ?? 'units'} left)`
        : '';
    const name = item.name?.trim() || 'Unknown item';
    const next = grouped.get(sectionTitle) ?? [];
    next.push(`- ${name}${quantity}`);
    grouped.set(sectionTitle, next);
  });

  return Array.from(grouped.entries())
    .map(([sectionTitle, entries]) => `${sectionTitle}:\n${entries.join('\n')}`)
    .join('\n\n');
};

const buildProfileContext = (profile?: UserProfileInput) => {
  if (!profile) return '';

  const details = [
    profile.preferredName?.trim() ? `Preferred name: ${profile.preferredName.trim()}` : null,
    profile.homeCookingStyle?.trim()
      ? `Home cooking style: ${profile.homeCookingStyle.trim()}`
      : null,
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
    dish?: string;
    groceries?: GroceryInput[];
    servings?: number;
    profile?: UserProfileInput;
    selectedCategoryIds?: string[];
    selectedCategoryTitles?: string[];
  } = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dish = typeof payload.dish === 'string' ? payload.dish.trim() : '';
  const servings =
    typeof payload.servings === 'number' && Number.isFinite(payload.servings)
      ? Math.max(1, Math.round(payload.servings))
      : 2;
  const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : undefined;
  const selectedCategoryIds = Array.isArray(payload.selectedCategoryIds)
    ? payload.selectedCategoryIds
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const selectedCategoryTitles = Array.isArray(payload.selectedCategoryTitles)
    ? payload.selectedCategoryTitles
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  if (!dish) {
    return new Response(JSON.stringify({ error: 'Dish name is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groceries = Array.isArray(payload.groceries)
    ? payload.groceries.filter((item) =>
        selectedCategoryIds.length === 0
          ? true
          : selectedCategoryIds.includes(item.categoryId?.trim() ?? '')
      )
    : [];
  const groceryList = buildGroceryList(groceries);
  const profileContext = buildProfileContext(profile);
  const sectionContext =
    selectedCategoryTitles.length > 0
      ? `Focus inventory matching on these grocery sections only:\n${selectedCategoryTitles
          .map((item) => `- ${item}`)
          .join('\n')}\n\n`
      : '';
  const prompt = `${profileContext}${sectionContext}Dish: ${dish}\nServings: ${servings} people\n\nAvailable grocery inventory by section:\n${groceryList || '- No inventory provided'}\n\nReturn the most important grocery ingredients needed to cook this dish for ${servings} people. Use the user's diet preference, spice preference, home cooking style, and family size when helpful. Scale ingredient quantities to that serving size. Prefer practical home-cooking quantities and ingredients commonly used in Indian family kitchens. When home cooking style is provided, lean ingredient choices toward that cooking style when it fits the dish. Prefer naming ingredients close to the provided inventory items when possible, especially from the selected sections. Do not limit the recipe to only those items if the dish clearly needs additional ingredients. Include realistic approximate quantities with cooking units. When an ingredient clearly matches an inventory item but the inventory likely uses a different unit system, also include an inventory-friendly equivalent quantity and unit. Example: onion can be 2 pcs for cooking and 0.22 kg for inventory, oil can be 2 tbsp and 30 ml for inventory. Keep those inventory equivalents practical, approximate, and only include them when helpful. Mark must-have ingredients as essential and optional/common garnishes as recommended. Output a single-line JSON object only.`;
  try {
    const parsed = await callOpenRouterJSON<{
      dish?: unknown;
      ingredients?: unknown;
    }>({
      schemaName: 'dish_grocery_requirements',
      systemPrompt:
        'You are a culinary assistant. Respond only with JSON that matches the provided schema. Keep quantities concise and practical for home cooking. Prefer inventory-equivalent quantities that can be subtracted from grocery stock when units differ.',
      userPrompt: prompt,
      temperature: 0.25,
      maxTokens: 1400,
      schema: {
        type: 'object',
        properties: {
          dish: {
            type: 'string',
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                quantity: {
                  type: 'number',
                },
                unit: {
                  type: 'string',
                },
                importance: {
                  type: 'string',
                  enum: ['essential', 'recommended'],
                },
                inventoryQuantity: {
                  type: 'number',
                },
                inventoryUnit: {
                  type: 'string',
                },
              },
              required: ['name', 'quantity', 'unit', 'importance'],
              additionalProperties: false,
            },
          },
        },
        required: ['dish', 'ingredients'],
        additionalProperties: false,
      },
    });

    return new Response(
      JSON.stringify({
        dish: typeof parsed.dish === 'string' && parsed.dish.trim() ? parsed.dish.trim() : dish,
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message =
      error instanceof OpenRouterRequestError && error.isRetryable
        ? 'The AI provider is busy right now. Please try again in a moment.'
        : error instanceof Error
          ? error.message
          : 'OpenRouter request failed.';
    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status:
          error instanceof OpenRouterRequestError && error.isRetryable
            ? 503
            : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
