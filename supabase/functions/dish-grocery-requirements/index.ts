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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let payload: { dish?: string; groceries?: GroceryInput[] } = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dish = typeof payload.dish === 'string' ? payload.dish.trim() : '';
  if (!dish) {
    return new Response(JSON.stringify({ error: 'Dish name is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groceries = Array.isArray(payload.groceries) ? payload.groceries : [];
  const groceryList = buildGroceryList(groceries);
  const prompt = `Dish: ${dish}\n\nAvailable grocery inventory:\n${groceryList || '- No inventory provided'}\n\nReturn the most important grocery ingredients needed to cook this dish for a small home meal. Prefer naming ingredients close to the provided inventory items when possible. Include realistic approximate quantities with units. Mark must-have ingredients as essential and optional/common garnishes as recommended. Output a single-line JSON object only.`;
  try {
    const parsed = await callOpenRouterJSON<{
      dish?: unknown;
      ingredients?: unknown;
    }>({
      schemaName: 'dish_grocery_requirements',
      systemPrompt:
        'You are a culinary assistant. Respond only with JSON that matches the provided schema. Keep quantities concise and practical for home cooking.',
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
