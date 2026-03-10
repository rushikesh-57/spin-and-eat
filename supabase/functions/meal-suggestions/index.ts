import { corsHeaders } from '../_shared/cors.ts';

export const config = {
  verify_jwt: false,
};

type GroceryInput = {
  name?: string;
  remainingQuantity?: number;
  unit?: string;
  status?: string;
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const buildGroceryList = (items: GroceryInput[]) =>
  items
    .map((item) => {
      const name = item.name?.trim() || 'Unknown item';
      const quantity =
        typeof item.remainingQuantity === 'number' && item.unit
          ? ` (${item.remainingQuantity} ${item.unit})`
          : '';
      return `- ${name}${quantity}`;
    })
    .join('\n');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: { groceries?: GroceryInput[]; maxSuggestions?: number } = {};
  try {
    payload = (await req.json()) ?? {};
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const groceries = Array.isArray(payload.groceries) ? payload.groceries : [];
  const maxSuggestions =
    typeof payload.maxSuggestions === 'number' && payload.maxSuggestions > 0
      ? Math.min(4, Math.floor(payload.maxSuggestions))
      : 3;

  const available = groceries.filter(
    (item) =>
      (item.status ?? 'available') !== 'out' &&
      typeof item.remainingQuantity === 'number' &&
      item.remainingQuantity > 0
  );

  if (available.length === 0) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const groceryList = buildGroceryList(available);
  const prompt = `Available groceries:
${groceryList}

Suggest ${maxSuggestions} cook-at-home dishes that can be made mainly from the available items. If an optional add-on would improve the dish, list it as missing (optional). Keep responses concise: each "why" must be under 80 characters, keyIngredients max 4 items, missingIngredients max 3 items.`;

  const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text:
              'You are a culinary assistant. Respond only with JSON that matches the provided schema.',
          },
        ],
      },
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  why: { type: 'string' },
                  keyIngredients: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  missingIngredients: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['name', 'why', 'keyIngredients', 'missingIngredients'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(
      JSON.stringify({
        error: 'Gemini request failed.',
        details: errorText,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const outputText = Array.isArray(parts)
    ? parts.map((part: { text?: string }) => part.text ?? '').join('')
    : '';

  if (!outputText) {
    return new Response(JSON.stringify({ error: 'No output returned from Gemini.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let parsed: { suggestions?: unknown } = {};
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const finishReason = data?.candidates?.[0]?.finishReason ?? 'unknown';
    return new Response(
      JSON.stringify({
        error: 'Failed to parse Gemini response.',
        raw: outputText,
        finishReason,
        partsCount: Array.isArray(parts) ? parts.length : 0,
        outputLength: outputText.length,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  return new Response(JSON.stringify({ suggestions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
