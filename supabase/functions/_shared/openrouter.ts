const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4.1-mini';

type OpenRouterSchema = Record<string, unknown>;

type OpenRouterRequest = {
  schemaName: string;
  schema: OpenRouterSchema;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
};

const readMessageContent = (content: unknown) => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        const candidate = part as Record<string, unknown>;
        return typeof candidate.text === 'string' ? candidate.text : '';
      })
      .join('');
  }

  return '';
};

export async function callOpenRouterJSON<T>({
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 1024,
}: OpenRouterRequest): Promise<T> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY.');
  }

  const model = Deno.env.get('OPENROUTER_MODEL') ?? DEFAULT_OPENROUTER_MODEL;
  const appUrl = Deno.env.get('OPENROUTER_APP_URL') ?? 'https://spin-and-eat.local';
  const appTitle = Deno.env.get('OPENROUTER_APP_TITLE') ?? 'Spin and Eat';

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': appUrl,
      'X-Title': appTitle,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${errorText}`);
  }

  const data = await response.json();
  const content = readMessageContent(data?.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error('No output returned from OpenRouter.');
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Failed to parse OpenRouter response: ${content}`);
  }
}
