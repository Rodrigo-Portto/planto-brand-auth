interface RequestJsonOptions {
  method?: string;
  body?: unknown;
  accessToken?: string;
  headers?: HeadersInit;
}

async function parseJsonSafe<T>(response: Response): Promise<T | Record<string, never>> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return {};
  }
}

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
    ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
  };

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body),
  });

  const data = (await parseJsonSafe<T & { error?: string }>(response)) as T & { error?: string };

  if (!response.ok) {
    if (data?.error) {
      throw new Error(data.error);
    }

    if (response.status === 413) {
      throw new Error('Arquivo muito grande para envio.');
    }

    throw new Error(`Erro na requisição (${response.status}).`);
  }

  return data;
}
