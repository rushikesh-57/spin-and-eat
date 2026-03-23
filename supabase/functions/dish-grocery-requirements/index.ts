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
      const quantity =
        typeof item.remainingQuantity === 'number' && Number.isFinite(item.remainingQuantity)
          ? ` (${item.remainingQuantity} ${item.unit ?? 'units'} left)`
          : '';
      return `- ${name}${quantity}`;
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
    dish?: string;
    groceries?: GroceryInput[];
    servings?: number;
    profile?: UserProfileInput;
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
  if (!dish) {
    return new Response(JSON.stringify({ error: 'Dish name is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groceries = Array.isArray(payload.groceries) ? payload.groceries : [];
  const groceryList = buildGroceryList(groceries);
  const profileContext = buildProfileContext(profile);
  const prompt = `${profileContext}Dish: ${dish}\nServings: ${servings} people\n\nAvailable grocery inventory:\n${groceryList || '- No inventory provided'}\n\nReturn the most important grocery ingredients needed to cook this dish for ${servings} people. Use the user's diet preference, spice preference, city/context, and family size when helpful. Scale ingredient quantities to that serving size. Prefer naming ingredients close to the provided inventory items when possible. Include realistic approximate quantities with cooking units. When an ingredient clearly matches an inventory item but the inventory likely uses a different unit system, also include an inventory-friendly equivalent quantity and unit. Example: onion can be 2 pcs for cooking and 0.22 kg for inventory, oil can be 2 tbsp and 30 ml for inventory. Keep those inventory equivalents practical, approximate, and only include them when helpful. Mark must-have ingredients as essential and optional/common garnishes as recommended. Output a single-line JSON object only.`;
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
