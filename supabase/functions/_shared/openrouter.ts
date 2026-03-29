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

export class OpenRouterRequestError extends Error {
  status: number | null;
  isRetryable: boolean;

  constructor(message: string, options?: { status?: number | null; isRetryable?: boolean }) {
    super(message);
    this.name = 'OpenRouterRequestError';
    this.status = options?.status ?? null;
    this.isRetryable = options?.isRetryable ?? false;
  }
}

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

const parseFallbackModels = () => {
  const configured = Deno.env.get('OPENROUTER_FALLBACK_MODELS') ?? Deno.env.get('OPENROUTER_FALLBACK_MODEL');

  return (configured ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const isRetryableProviderError = (status: number, errorText: string) => {
  if (status === 429 || status >= 500) {
    return true;
  }

  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('no instances available') ||
    normalized.includes('provider returned error') ||
    normalized.includes('"code":503') ||
    normalized.includes('"code":429')
  );
};

const requestOpenRouter = async ({
  apiKey,
  appUrl,
  appTitle,
  model,
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
}: OpenRouterRequest & {
  apiKey: string;
  appUrl: string;
  appTitle: string;
  model: string;
}) => {
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
    throw new OpenRouterRequestError(`OpenRouter request failed: ${errorText}`, {
      status: response.status,
      isRetryable: isRetryableProviderError(response.status, errorText),
    });
  }

  const data = await response.json();
  const content = readMessageContent(data?.choices?.[0]?.message?.content);

  if (!content) {
    throw new OpenRouterRequestError('No output returned from OpenRouter.', {
      isRetryable: true,
    });
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new OpenRouterRequestError(`Failed to parse OpenRouter response: ${content}`, {
      isRetryable: false,
    });
  }
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
  const fallbackModels = parseFallbackModels().filter((fallbackModel) => fallbackModel !== model);
  const appUrl = Deno.env.get('OPENROUTER_APP_URL') ?? 'https://spin-and-eat.local';
  const appTitle = Deno.env.get('OPENROUTER_APP_TITLE') ?? 'Spin and Eat';

  let lastError: unknown;
  const modelsToTry = [model, ...fallbackModels];

  for (const currentModel of modelsToTry) {
    try {
      return (await requestOpenRouter({
        apiKey,
        appUrl,
        appTitle,
        model: currentModel,
        schemaName,
        schema,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      })) as T;
    } catch (error) {
      lastError = error;
      const shouldTryNextModel =
        error instanceof OpenRouterRequestError &&
        error.isRetryable &&
        currentModel !== modelsToTry[modelsToTry.length - 1];

      if (!shouldTryNextModel) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenRouterRequestError('OpenRouter request failed.', {
        isRetryable: true,
      });
}
